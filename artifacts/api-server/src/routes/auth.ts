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
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) { res.status(400).json({ error: "name, email, password required" }); return; }
    const existing = await User.findOne({ email });
    if (existing) { res.status(400).json({ error: "Email already in use" }); return; }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: role || "user" });
    const token = signToken({ id: user._id.toString(), role: user.role, email: user.email });
    res.status(201).json({ token, user: userResponse(user) });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) { res.status(400).json({ error: "email and password required" }); return; }
    const user = await User.findOne({ email });
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

export default router;
