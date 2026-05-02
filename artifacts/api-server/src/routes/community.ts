import { Router, Request, Response } from "express";
import { db, postsTable, postJoinsTable, messagesTable, usersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authenticate, AuthRequest } from "../middlewares/auth";
import { CreatePostBody, SendPostMessageBody } from "@workspace/api-zod";

const router = Router();

function postResponse(post: any, user?: any, joinCount?: number) {
  return {
    id: post.id,
    userId: post.userId,
    userName: user?.name,
    userAvatar: user?.avatar,
    title: post.title,
    description: post.description,
    playersNeeded: post.playersNeeded,
    playersJoined: joinCount ?? 0,
    matchDate: post.matchDate,
    matchTime: post.matchTime,
    turfName: post.turfName,
    area: post.area,
    latitude: post.latitude ? parseFloat(post.latitude) : undefined,
    longitude: post.longitude ? parseFloat(post.longitude) : undefined,
    status: post.status,
    createdAt: post.createdAt?.toISOString(),
  };
}

router.get("/community/posts", async (req: Request, res: Response) => {
  try {
    const { status } = req.query as Record<string, string>;
    const rows = await db.select({
      post: postsTable,
      user: { name: usersTable.name, avatar: usersTable.avatar },
    }).from(postsTable).leftJoin(usersTable, eq(postsTable.userId, usersTable.id));

    let posts = rows;
    if (status) posts = posts.filter(r => r.post.status === status);

    const joinCounts = await db.select({ postId: postJoinsTable.postId }).from(postJoinsTable);
    const countMap: Record<number, number> = {};
    joinCounts.forEach(j => { countMap[j.postId] = (countMap[j.postId] || 0) + 1; });

    res.json(posts.map(r => postResponse(r.post, r.user, countMap[r.post.id] || 0)));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.post("/community/posts", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const parsed = CreatePostBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [post] = await db.insert(postsTable).values({
      userId: req.user!.id,
      title: parsed.data.title,
      description: parsed.data.description,
      playersNeeded: parsed.data.playersNeeded,
      matchDate: parsed.data.matchDate,
      matchTime: parsed.data.matchTime,
      turfName: parsed.data.turfName,
      area: parsed.data.area,
      latitude: parsed.data.latitude?.toString(),
      longitude: parsed.data.longitude?.toString(),
    }).returning();
    res.status(201).json(postResponse(post));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.get("/community/posts/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select({
      post: postsTable,
      user: { name: usersTable.name, avatar: usersTable.avatar },
    }).from(postsTable).leftJoin(usersTable, eq(postsTable.userId, usersTable.id)).where(eq(postsTable.id, id));
    if (!row) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    const joins = await db.select({ userId: postJoinsTable.userId }).from(postJoinsTable).where(eq(postJoinsTable.postId, id));
    const msgs = await db.select({
      msg: messagesTable,
      user: { name: usersTable.name, avatar: usersTable.avatar },
    }).from(messagesTable).leftJoin(usersTable, eq(messagesTable.userId, usersTable.id)).where(eq(messagesTable.postId, id));
    res.json({
      ...postResponse(row.post, row.user, joins.length),
      joinedUsers: [],
      messages: msgs.map(m => ({
        id: m.msg.id,
        postId: m.msg.postId,
        userId: m.msg.userId,
        userName: m.user?.name,
        userAvatar: m.user?.avatar,
        content: m.msg.content,
        createdAt: m.msg.createdAt?.toISOString(),
      })),
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

router.delete("/community/posts/:id", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(postsTable).where(eq(postsTable.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to delete post" });
  }
});

router.post("/community/posts/:id/join", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const existing = await db.select().from(postJoinsTable).where(
      and(eq(postJoinsTable.postId, postId), eq(postJoinsTable.userId, req.user!.id))
    );
    if (existing.length === 0) {
      await db.insert(postJoinsTable).values({ postId, userId: req.user!.id });
    }
    const [row] = await db.select({ post: postsTable, user: { name: usersTable.name, avatar: usersTable.avatar } })
      .from(postsTable).leftJoin(usersTable, eq(postsTable.userId, usersTable.id)).where(eq(postsTable.id, postId));
    const joins = await db.select().from(postJoinsTable).where(eq(postJoinsTable.postId, postId));
    res.json(postResponse(row?.post, row?.user, joins.length));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to join post" });
  }
});

router.get("/community/posts/:id/messages", async (req: Request, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const msgs = await db.select({
      msg: messagesTable,
      user: { name: usersTable.name, avatar: usersTable.avatar },
    }).from(messagesTable).leftJoin(usersTable, eq(messagesTable.userId, usersTable.id)).where(eq(messagesTable.postId, postId));
    res.json(msgs.map(m => ({
      id: m.msg.id, postId: m.msg.postId, userId: m.msg.userId,
      userName: m.user?.name, userAvatar: m.user?.avatar,
      content: m.msg.content, createdAt: m.msg.createdAt?.toISOString(),
    })));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/community/posts/:id/messages", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const postId = parseInt(req.params.id);
    const parsed = SendPostMessageBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const [msg] = await db.insert(messagesTable).values({
      postId, userId: req.user!.id, content: parsed.data.content,
    }).returning();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id));
    res.status(201).json({
      id: msg.id, postId: msg.postId, userId: msg.userId,
      userName: user?.name, userAvatar: user?.avatar,
      content: msg.content, createdAt: msg.createdAt?.toISOString(),
    });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;
