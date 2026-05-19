// app is required dynamically to prevent Vercel tsc from type-checking the backend
import { connectDB } from "@workspace/db";

// For Vercel, we need to export the app as a function or the default export.
// We also need to ensure the DB is connected.
export default async (req, res) => {
  await connectDB();
  const app = require("../backend/src/app").default;
  return app(req, res);
};
