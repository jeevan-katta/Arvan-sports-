import { Schema, model, Document } from "mongoose";

export interface IPushSubscription extends Document {
  userId: Schema.Types.ObjectId;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
}

const PushSubscriptionSchema = new Schema<IPushSubscription>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    endpoint: { type: String, required: true },
    p256dh:   { type: String, required: true },
    auth:     { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

PushSubscriptionSchema.index({ endpoint: 1 }, { unique: true });

export const PushSubscription = model<IPushSubscription>("PushSubscription", PushSubscriptionSchema);
