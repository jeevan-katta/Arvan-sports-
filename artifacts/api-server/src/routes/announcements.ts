import { Router, Request, Response } from "express";
import { Types } from "mongoose";
import { Announcement, Notification, User } from "@workspace/db";
import { authenticate, requireRole, AuthRequest } from "../middlewares/auth";

const router = Router();
const isValidId = (id: string) => Types.ObjectId.isValid(id);

function announcementRes(a: any) {
  return {
    id: a._id.toString(),
    title: a.title,
    message: a.message,
    type: a.type || "general",
    createdBy: a.createdBy?.toString(),
    createdByRole: a.createdByRole,
    createdByName: a.createdByName || "",
    turfId: a.turfId?.toString(),
    turfName: a.turfName,
    pinned: a.pinned || false,
    createdAt: a.createdAt?.toISOString(),
  };
}

async function fanOutNotifications(ann: any, excludeUserId: string) {
  try {
    const users = await User.find({ blocked: { $ne: true } }).select("_id").lean();
    const docs = users
      .filter((u: any) => u._id.toString() !== excludeUserId)
      .map((u: any) => ({
        userId: u._id,
        type: "announcement",
        title: ann.title,
        message: ann.message,
        linkId: ann._id.toString(),
        read: false,
      }));
    if (docs.length) await Notification.insertMany(docs, { ordered: false });
  } catch (_) {}
}

// GET /api/announcements — public
router.get("/announcements", async (req: Request, res: Response) => {
  try {
    const list = await Announcement.find()
      .sort({ pinned: -1, createdAt: -1 })
      .limit(30)
      .lean();
    res.json(list.map(announcementRes));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to fetch announcements" }); }
});

// POST /api/announcements — admin or owner
router.post("/announcements", authenticate, requireRole("admin", "turf_owner"), async (req: AuthRequest, res: Response) => {
  try {
    const { title, message, type, turfId, turfName } = req.body;
    if (!title?.trim() || !message?.trim()) { res.status(400).json({ error: "title and message required" }); return; }
    const me = await User.findById(req.user!.id).lean() as any;
    const ann = await Announcement.create({
      title: title.trim(),
      message: message.trim(),
      type: type || "general",
      createdBy: req.user!.id,
      createdByRole: req.user!.role === "admin" ? "admin" : "owner",
      createdByName: me?.name || "",
      turfId: turfId && isValidId(turfId) ? turfId : undefined,
      turfName: turfName || undefined,
      pinned: false,
    });
    fanOutNotifications(ann, req.user!.id.toString());
    res.status(201).json(announcementRes(ann));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to create announcement" }); }
});

// PUT /api/announcements/:id/pin — admin only (toggle)
router.put("/announcements/:id/pin", authenticate, requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
    const ann = await Announcement.findById(req.params.id).lean() as any;
    if (!ann) { res.status(404).json({ error: "Not found" }); return; }
    const updated = await Announcement.findByIdAndUpdate(req.params.id, { pinned: !ann.pinned }, { new: true }).lean();
    res.json(announcementRes(updated));
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to pin" }); }
});

// DELETE /api/announcements/:id — admin or own creator
router.delete("/announcements/:id", authenticate, requireRole("admin", "turf_owner"), async (req: AuthRequest, res: Response) => {
  try {
    if (!isValidId(req.params.id)) { res.status(404).json({ error: "Not found" }); return; }
    const ann = await Announcement.findById(req.params.id).lean() as any;
    if (!ann) { res.status(404).json({ error: "Not found" }); return; }
    if (req.user!.role !== "admin" && ann.createdBy?.toString() !== req.user!.id.toString()) {
      res.status(403).json({ error: "Forbidden" }); return;
    }
    await Announcement.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { req.log?.error(err); res.status(500).json({ error: "Failed to delete" }); }
});

export default router;
