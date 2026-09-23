import { NextResponse } from "next/server";
import { OrderService } from "@/services/orderService";

export async function GET(req: Request) {
  return handleCleanup(req);
}

export async function POST(req: Request) {
  return handleCleanup(req);
}

async function handleCleanup(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET || "cakecart-cron-secret-token-389148";

    // Allow authorization via Bearer token or Vercel Cron header
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";
    const bearerValid = authHeader === `Bearer ${cronSecret}`;

    if (!isVercelCron && !bearerValid && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await OrderService.releaseExpiredHolds();

    return NextResponse.json({
      success: true,
      releasedHolds: result.releasedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
