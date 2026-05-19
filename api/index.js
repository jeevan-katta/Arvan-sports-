import { connectDB } from "@workspace/db";
import appModule from "../backend/dist/app.mjs";

export default async (req, res) => {
  try {
    await connectDB();
    const app = appModule;
    return app(req, res);
  } catch (err) {
    console.error("Vercel Function Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: String(err), stack: err.stack });
  }
};
