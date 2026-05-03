import { Router, Request, Response } from "express";
import multer from "multer";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

router.post("/upload/image", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    // Use Node 18+ native FormData + Blob — no extra packages needed
    const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
    const form = new FormData();
    form.append("file", blob, req.file.originalname || "image.jpg");

    const upstream = await fetch("https://telegra.ph/upload", {
      method: "POST",
      body: form,
    });

    if (!upstream.ok) {
      res.status(502).json({ error: "Image host upload failed" });
      return;
    }

    const data = await upstream.json() as any;
    if (Array.isArray(data) && data[0]?.src) {
      res.json({ url: `https://telegra.ph${data[0].src}` });
    } else {
      res.status(502).json({ error: "Invalid response from image host" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

export default router;
