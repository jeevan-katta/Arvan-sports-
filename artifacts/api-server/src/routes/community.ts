import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Post, PostJoin, Message, User } from "@workspace/db";
import { authenticate, AuthRequest } from "../middlewares/auth";

const isValidId = (id: string) => Types.ObjectId.isValid(id);

const router = Router();

function postRes(post: any, user?: any, joinCount?: number) {
  return {
    id: post._id.toString(), userId: post.userId?.toString(),
    userName: user?.name, userAvatar: user?.avatar,
    title: post.title, description: post.description,
    playersNeeded: post.playersNeeded, playersJoined: joinCount ?? 0,
    matchDate: post.matchDate, matchTime: post.matchTime,
    turfName: post.turfName, area: post.area,
    status: post.status, createdAt: post.createdAt?.toISOString(),
  };
}

router.get("/community/posts", async (req: Request, res: Response) => {
  try {
    const { status } = req.query as Record<string, string>;
    const query: any = {};
    if (status) query.status = status;
    const posts = await Post.find(query).sort({ createdAt: -1 }).populate("userId", "name avatar").lean();
    const postIds = posts.map((p: any) => p._id);
    const joins = await PostJoin.find({ postId: { $in: postIds } }).lean();
    const countMap: Record<string, number> = {};
    joins.forEach((j: any) => { const id = j.postId.toString(); countMap[id] = (countMap[id] || 0) + 1; });
    res.json(posts.map((p: any) => postRes(p, p.userId, countMap[p._id.toString()] || 0)));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch posts" }); }
});

router.post("/community/posts", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, playersNeeded, matchDate, matchTime, turfName, area } = req.body;
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const post = await Post.create({ userId: req.user!.id, title, description, playersNeeded, matchDate, matchTime, turfName, area });
    res.status(201).json(postRes(post));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create post" }); }
});

router.get("/community/posts/:id", async (req: Request, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Post not found" }); return; }
    const post = await Post.findById(req.params.id).populate("userId", "name avatar").lean() as any;
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    const joins = await PostJoin.find({ postId: req.params.id }).lean();
    const msgs = await Message.find({ postId: req.params.id }).sort({ createdAt: 1 }).populate("userId", "name avatar").lean();
    res.json({
      ...postRes(post, post.userId, joins.length),
      joinedUsers: [],
      messages: msgs.map((m: any) => ({
        id: m._id.toString(), postId: m.postId?.toString(),
        userId: m.userId?._id?.toString(), userName: m.userId?.name,
        userAvatar: m.userId?.avatar, content: m.content,
        createdAt: m.createdAt?.toISOString(),
      })),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch post" }); }
});

router.delete("/community/posts/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Post not found" }); return; }
    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete post" }); }
});

router.post("/community/posts/:id/join", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Post not found" }); return; }
    const existing = await PostJoin.findOne({ postId: req.params.id, userId: req.user!.id });
    if (!existing) await PostJoin.create({ postId: req.params.id, userId: req.user!.id });
    const post = await Post.findById(req.params.id).populate("userId", "name avatar").lean() as any;
    const joins = await PostJoin.find({ postId: req.params.id }).lean();
    res.json(postRes(post, post?.userId, joins.length));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to join post" }); }
});

router.get("/community/posts/:id/messages", async (req: Request, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Post not found" }); return; }
    const msgs = await Message.find({ postId: req.params.id }).sort({ createdAt: 1 }).populate("userId", "name avatar").lean();
    res.json(msgs.map((m: any) => ({
      id: m._id.toString(), postId: m.postId?.toString(),
      userId: m.userId?._id?.toString(), userName: m.userId?.name,
      userAvatar: m.userId?.avatar, content: m.content,
      createdAt: m.createdAt?.toISOString(),
    })));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch messages" }); }
});

router.post("/community/posts/:id/messages", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Post not found" }); return; }
    const { content } = req.body;
    if (!content) { res.status(400).json({ error: "content required" }); return; }
    const msg = await Message.create({ postId: req.params.id, userId: req.user!.id, content });
    const user = await User.findById(req.user!.id).lean() as any;
    res.status(201).json({
      id: msg._id.toString(), postId: msg.postId?.toString(),
      userId: msg.userId?.toString(), userName: user?.name,
      userAvatar: user?.avatar, content: msg.content,
      createdAt: msg.createdAt?.toISOString(),
    });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to send message" }); }
});

export default router;
