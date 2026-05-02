import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authenticate, signToken, AuthRequest } from "../middlewares/auth";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { Response, Request } from "express";

const router = Router();

function userResponse(user: typeof usersTable.$inferSelect) {
  return {
    id: user.id,
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
    const parsed = RegisterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const { name, email, password, role } = parsed.data;
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(400).json({ error: "Email already in use" });
      return;
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(usersTable).values({
      name, email, passwordHash, role: role || "user",
    }).returning();
    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.status(201).json({ token, user: userResponse(user) });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/auth/login", async (req: Request, res: Response) => {
  try {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const { email, password } = parsed.data;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (user.blocked) {
      res.status(403).json({ error: "Account is blocked" });
      return;
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const token = signToken({ id: user.id, role: user.role, email: user.email });
    res.json({ token, user: userResponse(user) });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/auth/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.id)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(userResponse(user));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to get user" });
  }
});

export default router;
