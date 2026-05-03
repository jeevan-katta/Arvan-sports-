import { Router, Request, Response } from "express";
import multer from "multer";
import { randomUUID } from "crypto";
import { objectStorageClient, ObjectNotFoundError } from "../lib/objectStorage";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

const BUCKET_ID = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || "";
const IMAGE_PREFIX = "images";

router.post("/upload/image", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
      return;
    }

    if (!BUCKET_ID) {
      res.status(500).json({ error: "Storage not configured" });
      return;
    }

    const ext = req.file.mimetype.split("/")[1] || "jpg";
    const objectId = `${randomUUID()}.${ext}`;
    const objectName = `${IMAGE_PREFIX}/${objectId}`;

    const bucket = objectStorageClient.bucket(BUCKET_ID);
    const file = bucket.file(objectName);

    await file.save(req.file.buffer, {
      contentType: req.file.mimetype,
      metadata: { cacheControl: "public, max-age=31536000" },
    });

    const url = `/api/images/${objectId}`;
    res.json({ url });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

router.get("/images/:objectId", async (req: Request, res: Response) => {
  try {
    if (!BUCKET_ID) {
      res.status(500).json({ error: "Storage not configured" });
      return;
    }

    const { objectId } = req.params;
    if (!objectId || objectId.includes("..") || objectId.includes("/")) {
      res.status(400).json({ error: "Invalid object ID" });
      return;
    }

    const objectName = `${IMAGE_PREFIX}/${objectId}`;
    const bucket = objectStorageClient.bucket(BUCKET_ID);
    const file = bucket.file(objectName);

    const [exists] = await file.exists();
    if (!exists) {
      res.status(404).json({ error: "Image not found" });
      return;
    }

    const [metadata] = await file.getMetadata();
    const contentType = (metadata.contentType as string) || "image/jpeg";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    file.createReadStream().pipe(res);
  } catch (err: any) {
    if (err instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Image not found" });
    } else {
      res.status(500).json({ error: err.message || "Failed to serve image" });
    }
  }
});

export default router;
