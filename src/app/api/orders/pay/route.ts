import { NextResponse } from "next/server";
import { OrderService } from "@/services/orderService";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, paymentIntentId, idempotencyKey, simulateOutcome } = body;

    if (!orderId || !idempotencyKey) {
      return NextResponse.json({ error: "Missing orderId or idempotencyKey" }, { status: 400 });
    }

    if (simulateOutcome === "failure") {
      return NextResponse.json({
        success: false,
        error: "Card was declined (simulated payment failure). Your reservation hold remains valid for 10 minutes to retry.",
      }, { status: 402 });
    }

    const result = await OrderService.confirmOrderPayment(
      orderId,
      idempotencyKey,
      paymentIntentId || `pi_sim_${Date.now()}`,
      { provider: "stripe_test", mode: "test", clientTimestamp: new Date().toISOString() }
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
