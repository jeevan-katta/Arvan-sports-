import { User, Turf, Booking, Notification } from "@workspace/db";
import { sendPayout, isRazorpayXConfigured } from "./razorpay-payout";
import { logger } from "./logger";

export async function triggerOwnerPayout(
  bookingId: string,
  totalPrice: number,
  turfId: string,
): Promise<void> {
  try {
    const turf = await Turf.findById(turfId).lean() as any;
    if (!turf?.ownerId) return;

    const owner = await User.findById(turf.ownerId).lean() as any;
    if (!owner || owner.commissionHeld) return;

    const schedule = owner.payoutSchedule || "manual";
    if (schedule !== "immediate" && schedule !== "daily") return;

    const commissionRate = owner.commissionRate ?? 20;
    const ownerShare = Math.round(totalPrice * ((100 - commissionRate) / 100) * 100) / 100;

    if (ownerShare <= 0) return;

    if (schedule === "immediate") {
      await processSingleOwnerPayout(owner, ownerShare, `Auto-payout for booking ${bookingId}`);
    }
  } catch (err: any) {
    logger.error({ err: err?.message, bookingId }, "Auto-payout trigger failed");
  }
}

async function processSingleOwnerPayout(owner: any, amount: number, note: string) {
  const method = owner.bankDetails?.upiId ? "upi" : "bank_transfer";
  let razorpayPayoutId: string | undefined;
  let razorpayStatus: string | undefined;
  let razorpayMode: string | undefined;

  if (isRazorpayXConfigured() && (owner.bankDetails?.accountNumber || owner.bankDetails?.upiId)) {
    const result = await sendPayout(
      {
        id: owner._id.toString(),
        name: owner.name,
        email: owner.email,
        phone: owner.phone,
        razorpayContactId: owner.razorpayContactId,
        bankDetails: owner.bankDetails,
      },
      amount,
      note,
    );

    if (result.success) {
      razorpayPayoutId = result.payoutId;
      razorpayStatus = result.status;
      razorpayMode = result.mode;
    } else {
      logger.warn({ owner: owner._id, reason: result.error }, "Razorpay payout failed, recording manually");
    }
  }

  const payoutRecord: any = {
    amount,
    date: new Date(),
    note,
    method,
    ...(razorpayPayoutId && { razorpayPayoutId, razorpayStatus, razorpayMode }),
  };

  await User.findByIdAndUpdate(owner._id, {
    $inc: { totalPayoutSent: amount },
    $push: { payoutHistory: payoutRecord },
  });

  await Notification.create({
    userId: owner._id.toString(),
    type: "payout_received",
    title: razorpayPayoutId ? "Payout Sent via Razorpay" : "Payout Recorded",
    message: `₹${amount.toLocaleString("en-IN")} ${razorpayPayoutId ? "has been transferred to your account" : "has been recorded for transfer"}.`,
    amount,
  });
}

export async function runDailyPayouts(): Promise<{ processed: number; failed: number; skipped: number }> {
  logger.info("Running daily payout batch");
  const owners = await User.find({ role: "turf_owner", payoutSchedule: "daily", commissionHeld: { $ne: true } }).lean() as any[];

  let processed = 0, failed = 0, skipped = 0;

  for (const owner of owners) {
    try {
      const turfs = await Turf.find({ ownerId: owner._id }).lean() as any[];
      if (!turfs.length) { skipped++; continue; }

      const turfIds = turfs.map((t: any) => t._id);
      const bookings = await Booking.find({ turfId: { $in: turfIds }, paymentStatus: { $in: ["paid", "cash_collected"] } }).lean() as any[];
      const commissionRate = owner.commissionRate ?? 20;
      const grossRevenue = bookings.reduce((s: number, b: any) => s + (b.totalPrice || 0), 0);
      const ownerEarnings = Math.round(grossRevenue * ((100 - commissionRate) / 100) * 100) / 100;
      const cashCollected = (bookings as any[]).filter((b: any) => b.paymentStatus === "cash_collected").reduce((s: number, b: any) => s + Math.max(0, (b.totalPrice || 0) - (b.paidAmount || 0)), 0);
      const payoutSent = owner.totalPayoutSent || 0;
      const pending = Math.max(0, ownerEarnings - cashCollected - payoutSent);

      if (pending < 1) { skipped++; continue; }

      await processSingleOwnerPayout(owner, pending, `Daily auto-payout ${new Date().toLocaleDateString("en-IN")}`);
      processed++;
    } catch (err: any) {
      logger.error({ err: err?.message, owner: owner._id }, "Daily payout failed for owner");
      failed++;
    }
  }

  logger.info({ processed, failed, skipped }, "Daily payout batch complete");
  return { processed, failed, skipped };
}
