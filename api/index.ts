import app from "../backend/src/app";
import { connectDB } from "@workspace/db";

// For Vercel, we need to export the app as a function or the default export.
// We also need to ensure the DB is connected.
export default async (req: any, res: any) => {
  await connectDB();
  return app(req, res);
};
