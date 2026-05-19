import mongoose from "mongoose";

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI must be set");
  await mongoose.connect(uri, {
    dbName: "arvansports",
    serverSelectionTimeoutMS: 20000,
    connectTimeoutMS: 20000,
    retryWrites: true,
  } as any);
  isConnected = true;
  console.log("MongoDB connected");
}

export { mongoose };
