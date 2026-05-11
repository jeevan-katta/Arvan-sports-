import { Router, Response } from "express";
import webpush from "web-push";
import { PushSubscription, User } from "@workspace/db";
import { authenticate, AuthRequest } from "../middlewares/auth";

const router = Router();

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_EMAIL || "mailto:admin@arvansports.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

// GET /api/push/vapid-key — public
router.get("/push/vapid-key", (_req, res: Response) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — save push subscription for authenticated user
router.post("/push/subscribe", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      res.status(400).json({ error: "endpoint, keys.p256dh and keys.auth required" });
      return;
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { userId: req.user!.id, endpoint, p256dh: keys.p256dh, auth: keys.auth },
      { upsert: true, new: true }
    );
    res.status(201).json({ success: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

// DELETE /api/push/unsubscribe
router.delete("/push/unsubscribe", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ endpoint, userId: req.user!.id });
    } else {
      await PushSubscription.deleteMany({ userId: req.user!.id });
    }
    res.json({ success: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// Helper: send a push to a single subscription document
export async function sendPushToSubscription(sub: any, payload: object) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 86400 }
    );
  } catch (err: any) {
    // 410 Gone = subscription expired, clean it up
    if (err.statusCode === 410 || err.statusCode === 404) {
      await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
    }
  }
}

// Helper: fan-out push to all subscribed users (or a subset)
export async function fanOutPush(payload: object, excludeUserId?: string) {
  const subs = await PushSubscription.find().lean();
  await Promise.allSettled(
    subs
      .filter((s: any) => !excludeUserId || s.userId.toString() !== excludeUserId)
      .map((sub: any) => sendPushToSubscription(sub, payload))
  );
}

export { webpush };
export default router;
