import { NextResponse } from "next/server";
import { OrderService } from "@/services/orderService";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems, orderCustomisations, pickupSlots } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Please log in to place an order." }, { status: 401 });
    }

    const body = await req.json();
    const { pickupDate, pickupSlotId, items, customerNotes } = body;

    if (!pickupDate || !pickupSlotId || !items || !items.length) {
      return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
    }

    const result = await OrderService.createOrderHold(
      user.userId,
      pickupDate,
      pickupSlotId,
      items,
      customerNotes
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.customerId, user.userId))
      .orderBy(desc(orders.createdAt));

    const enriched = [];
    for (const ord of userOrders) {
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
      const [slot] = await db.select().from(pickupSlots).where(eq(pickupSlots.id, ord.pickupSlotId));
      
      const enrichedItems = [];
      for (const it of items) {
        const [cust] = await db.select().from(orderCustomisations).where(eq(orderCustomisations.orderItemId, it.id));
        enrichedItems.push({
          ...it,
          customisation: cust || null,
        });
      }

      enriched.push({
        ...ord,
        slot,
        items: enrichedItems,
      });
    }

    return NextResponse.json({ orders: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
