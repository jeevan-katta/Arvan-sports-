import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Post, PostJoin, Message, User } from "@workspace/db";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { broadcast } from "../lib/live-scores";

const isValidId = (id: string | string[]) => Types.ObjectId.isValid(String(id));

const router = Router();

function postRes(post: any, user?: any, joinCount?: number) {
  return {
    id: post._id.toString(), userId: post.userId?.toString(),
    userName: user?.name, userAvatar: user?.avatar,
    title: post.title, description: post.description,
    playersNeeded: post.playersNeeded, playersJoined: joinCount ?? 0,
    lookingFor: post.lookingFor || "individual",
    teamName: post.teamName,
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
    // For team posts, a single join record counts as full team
    const countMap: Record<string, number> = {};
    joins.forEach((j: any) => {
      const id = j.postId.toString();
      countMap[id] = (countMap[id] || 0) + (j.isTeamJoin ? 0 : 1);
    });
    // For team joins, count as playersNeeded
    const teamJoinMap: Record<string, boolean> = {};
    joins.filter((j: any) => j.isTeamJoin).forEach((j: any) => { teamJoinMap[j.postId.toString()] = true; });
    const resolvedPosts = posts.map((p: any) => {
      const pid = p._id.toString();
      const isTeamJoined = teamJoinMap[pid] || false;
      const count = isTeamJoined ? p.playersNeeded : (countMap[pid] || 0);
      return postRes(p, p.userId, count);
    });
    res.json(resolvedPosts);
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch posts" }); }
});

router.post("/community/posts", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, playersNeeded, matchDate, matchTime, turfName, area, lookingFor, teamName } = req.body;
    if (!title) { res.status(400).json({ error: "title required" }); return; }
    const post = await Post.create({
      userId: req.user!.id, title, description, playersNeeded, matchDate, matchTime, turfName, area,
      lookingFor: lookingFor || "individual",
      teamName,
    });
    const user = await User.findById(req.user!.id).lean() as any;
    const result = postRes(post, user, 0);
    // Broadcast notification to all connected users
    broadcast({
      type: "notification",
      notifType: "new_post",
      message: `New match posted in ${area || "your area"}`,
      post: result,
    });
    res.status(201).json(result);
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create post" }); }
});

router.get("/community/posts/:id", async (req: Request, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Post not found" }); return; }
    const post = await Post.findById(req.params.id).populate("userId", "name avatar").lean() as any;
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }
    const joins = await PostJoin.find({ postId: req.params.id }).lean();
    const joinedUserIds = joins.map((j: any) => j.userId);
    const joinedUserDocs = await User.find({ _id: { $in: joinedUserIds } }).select("name avatar phone email").lean() as any[];
    const msgs = await Message.find({ postId: req.params.id }).sort({ createdAt: 1 }).populate("userId", "name avatar").lean();

    // Determine player count (team join counts as full)
    const hasTeamJoin = joins.some((j: any) => j.isTeamJoin);
    const joinCount = hasTeamJoin ? post.playersNeeded : joins.length;
    // Find team joiner info
    const teamJoinRecord = joins.find((j: any) => j.isTeamJoin) as any;

    res.json({
      ...postRes(post, post.userId, joinCount),
      hasTeamJoin,
      teamJoinName: teamJoinRecord?.teamName,
      joinedUsers: joinedUserDocs.map((u: any) => ({
        id: u._id.toString(), name: u.name, avatar: u.avatar, phone: u.phone, email: u.email,
      })),
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
    const post = await Post.findById(req.params.id).lean() as any;
    if (!post) { res.status(404).json({ error: "Post not found" }); return; }

    const { teamName } = req.body;
    const isTeamMode = post.lookingFor === "team";

    // Check if already joined
    const existing = await PostJoin.findOne({ postId: req.params.id, userId: req.user!.id });
    if (existing) {
      res.status(400).json({ error: "Already joined" }); return;
    }

    // Check if already has a team join
    const existingTeamJoin = isTeamMode && await PostJoin.findOne({ postId: req.params.id, isTeamJoin: true });
    if (existingTeamJoin) {
      res.status(400).json({ error: "An opponent team has already joined" }); return;
    }

    await PostJoin.create({
      postId: req.params.id,
      userId: req.user!.id,
      isTeamJoin: isTeamMode,
      teamName: isTeamMode ? (teamName || "Opponent Team") : undefined,
    });

    // Mark post as filled if team join or all spots taken
    const allJoins = await PostJoin.find({ postId: req.params.id }).lean();
    const hasTeamJoin = allJoins.some((j: any) => j.isTeamJoin);
    const effectiveCount = hasTeamJoin ? post.playersNeeded : allJoins.length;
    if (effectiveCount >= post.playersNeeded) {
      await Post.findByIdAndUpdate(req.params.id, { status: "filled" });
    }

    const updatedPost = await Post.findById(req.params.id).populate("userId", "name avatar").lean() as any;
    const updatedJoins = await PostJoin.find({ postId: req.params.id }).lean();
    const updatedTeamJoin = updatedJoins.some((j: any) => j.isTeamJoin);
    const updatedCount = updatedTeamJoin ? post.playersNeeded : updatedJoins.length;
    res.json(postRes(updatedPost, updatedPost?.userId, updatedCount));
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
