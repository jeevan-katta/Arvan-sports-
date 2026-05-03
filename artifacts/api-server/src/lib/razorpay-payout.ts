import { logger } from "./logger";

const KEY_ID = process.env.RAZORPAY_KEY_ID || "";
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || "";
const X_ACCOUNT = process.env.RAZORPAY_X_ACCOUNT_NUMBER || "";

const RZP_BASE = "https://api.razorpay.com/v1";

function authHeader() {
  const creds = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  return { Authorization: `Basic ${creds}`, "Content-Type": "application/json" };
}

async function rzpPost(path: string, body: object) {
  const res = await fetch(`${RZP_BASE}${path}`, {
    method: "POST",
    headers: authHeader(),
    body: JSON.stringify(body),
  });
  const json = await res.json() as any;
  if (!res.ok) throw new Error(json?.error?.description || json?.error || `Razorpay error ${res.status}`);
  return json;
}

async function rzpGet(path: string) {
  const res = await fetch(`${RZP_BASE}${path}`, { headers: authHeader() });
  const json = await res.json() as any;
  if (!res.ok) throw new Error(json?.error?.description || `Razorpay error ${res.status}`);
  return json;
}

export type PayoutMode = "NEFT" | "IMPS" | "UPI" | "RTGS";

export interface BankDetails {
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
}

export interface PayoutResult {
  success: true;
  payoutId: string;
  status: string;
  mode: PayoutMode;
  referenceId: string;
}

export interface PayoutError {
  success: false;
  error: string;
}

export function isRazorpayXConfigured(): boolean {
  return !!(KEY_ID.startsWith("rzp_") && KEY_SECRET.length >= 20 && X_ACCOUNT);
}

async function ensureContact(owner: { id: string; name: string; email: string; phone?: string; razorpayContactId?: string }): Promise<string> {
  if (owner.razorpayContactId) return owner.razorpayContactId;

  const contact = await rzpPost("/contacts", {
    name: owner.name,
    email: owner.email,
    contact: owner.phone || undefined,
    type: "vendor",
    reference_id: `owner_${owner.id}`,
  });

  const { User } = await import("@workspace/db");
  await User.findByIdAndUpdate(owner.id, { razorpayContactId: contact.id });
  return contact.id as string;
}

async function createFundAccount(contactId: string, bank: BankDetails): Promise<string> {
  const hasBankDetails = bank.accountNumber && bank.ifscCode;
  const hasUpi = !!bank.upiId;

  if (!hasBankDetails && !hasUpi) {
    throw new Error("Owner has no bank account or UPI ID on file");
  }

  if (hasBankDetails) {
    const fa = await rzpPost("/fund_accounts", {
      contact_id: contactId,
      account_type: "bank_account",
      bank_account: {
        name: bank.accountName || "Account Holder",
        ifsc: bank.ifscCode,
        account_number: bank.accountNumber,
      },
    });
    return fa.id as string;
  } else {
    const fa = await rzpPost("/fund_accounts", {
      contact_id: contactId,
      account_type: "vpa",
      vpa: { address: bank.upiId },
    });
    return fa.id as string;
  }
}

export async function sendPayout(
  owner: { id: string; name: string; email: string; phone?: string; razorpayContactId?: string; bankDetails?: BankDetails },
  amountINR: number,
  note: string = "",
  referenceId?: string,
): Promise<PayoutResult | PayoutError> {
  if (!isRazorpayXConfigured()) {
    return { success: false, error: "Razorpay X not configured (RAZORPAY_X_ACCOUNT_NUMBER missing)" };
  }

  if (!owner.bankDetails?.accountNumber && !owner.bankDetails?.ifscCode && !owner.bankDetails?.upiId) {
    return { success: false, error: "Owner has no bank/UPI details on file" };
  }

  try {
    const contactId = await ensureContact(owner);
    const fundAccountId = await createFundAccount(contactId, owner.bankDetails!);
    const hasUpi = !owner.bankDetails?.accountNumber && !!owner.bankDetails?.upiId;
    const mode: PayoutMode = hasUpi ? "UPI" : "IMPS";
    const refId = referenceId || `vsy_${owner.id}_${Date.now()}`;

    const payout = await rzpPost("/payouts", {
      account_number: X_ACCOUNT,
      fund_account_id: fundAccountId,
      amount: Math.round(amountINR * 100),
      currency: "INR",
      mode,
      purpose: "vendor",
      queue_if_low_balance: true,
      reference_id: refId,
      narration: note || `Vsy Sports payout`,
    });

    logger.info({ payoutId: payout.id, owner: owner.id, amount: amountINR }, "Razorpay payout created");
    return { success: true, payoutId: payout.id, status: payout.status, mode, referenceId: refId };
  } catch (err: any) {
    logger.error({ err: err?.message, owner: owner.id }, "Razorpay payout failed");
    return { success: false, error: err?.message || "Payout failed" };
  }
}

export async function getPayoutStatus(payoutId: string): Promise<{ status: string } | null> {
  try {
    const p = await rzpGet(`/payouts/${payoutId}`);
    return { status: p.status };
  } catch {
    return null;
  }
}
