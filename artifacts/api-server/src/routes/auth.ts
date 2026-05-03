import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "@workspace/db";
import { authenticate, signToken, AuthRequest } from "../middlewares/auth";

const router = Router();

function userResponse(user: any) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    avatar: user.avatar,
    blocked: user.blocked,
    createdAt: user.createdAt?.toISOString(),
  };
}

router.post("/auth/register", async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, role } = req.body;
    if (!name || !email || !password) { res.status(400).json({ error: "name, email, password required" }); return; }
    if (!phone) { res.status(400).json({ error: "Mobile number is required" }); return; }
    const existing = await User.findOne({ email });
    if (existing) { res.status(400).json({ error: "Email already in use" }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const safeRole = (role === "user") ? "user" : "user";
    const user = await User.create({ name, email, passwordHash, phone, role: safeRole });
    const token = signToken({ id: user._id.toString(), role: user.role, email: user.email });
    res.status(201).json({ token, user: userResponse(user) });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, phone, password } = req.body;
    const identifier = typeof email === "string" && email.trim().length > 0 ? email.trim() : typeof phone === "string" && phone.trim().length > 0 ? phone.trim() : "";
    if (!identifier || !password) { res.status(400).json({ error: "email/phone and password required" }); return; }
    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });
    if (!user) { res.status(401).json({ error: "Invalid credentials" }); return; }
    if (user.blocked) { res.status(403).json({ error: "Account is blocked" }); return; }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(401).json({ error: "Invalid credentials" }); return; }
    const token = signToken({ id: user._id.toString(), role: user.role, email: user.email });
    res.json({ token, user: userResponse(user) });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/auth/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user!.id);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(userResponse(user));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

router.put("/auth/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, avatar } = req.body;
    const update: any = {};
    if (name && typeof name === "string" && name.trim().length >= 2) update.name = name.trim();
    if (phone && typeof phone === "string") update.phone = phone.trim();
    if (avatar && typeof avatar === "string") update.avatar = avatar.trim();
    const user = await User.findByIdAndUpdate(req.user!.id, { $set: update }, { new: true });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json(userResponse(user));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// ── User Notifications ─────────────────────────────────────────────────────────
import { Notification } from "@workspace/db";

router.get("/user/notifications", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const notes = await Notification.find({ userId: req.user!.id })
      .sort({ createdAt: -1 }).limit(50).lean();
    res.json(notes.map((n: any) => ({
      id: n._id.toString(), type: n.type, title: n.title, message: n.message,
      read: n.read, amount: n.amount, linkId: n.linkId,
      createdAt: n.createdAt?.toISOString(),
    })));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed" }); }
});

router.put("/user/notifications/read-all", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.updateMany({ userId: req.user!.id, read: false }, { read: true });
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed" }); }
});

router.put("/user/notifications/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user!.id }, { read: true });
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed" }); }
});

export default router;
