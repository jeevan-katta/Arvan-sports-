import app from "../backend/src/app";
import { connectDB } from "@workspace/db";

// For Vercel, we need to export the app as a function or the default export.
// We also need to ensure the DB is connected.
export default async (req: any, res: any) => {
  try {
    await connectDB();
    // Express app(req, res) handles the response.
    // We don't necessarily need to 'return' its result, but it doesn't hurt.
    (app as any)(req, res);
  } catch (err) {
    console.error("Vercel Function Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: String(err) });
  }
};
