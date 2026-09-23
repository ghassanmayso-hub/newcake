import { NextResponse } from "next/server";
import { OrderService } from "@/services/orderService";

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    // In production, verify stripe signature against process.env.STRIPE_WEBHOOK_SECRET
    // For test mode, parse event idempotently
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data?.object;
      const orderId = paymentIntent?.metadata?.orderId;
      const idempotencyKey = event.id || `evt_${Date.now()}`;

      if (orderId) {
        await OrderService.confirmOrderPayment(
          orderId,
          idempotencyKey,
          paymentIntent.id,
          event
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
