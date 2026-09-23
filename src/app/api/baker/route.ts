import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems, orderCustomisations, pickupSlots, users, dailyCapacity } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { OrderService } from "@/services/orderService";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "baker") {
      return NextResponse.json({ error: "Forbidden: Baker credentials required" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    // Fetch capacity info
    let capacityQuery = db.select().from(dailyCapacity);
    if (date) {
      capacityQuery = capacityQuery.where(eq(dailyCapacity.bakeryDate, date)) as any;
    }
    const capacities = await capacityQuery;

    // Fetch all orders
    let allOrders: any[] = await db.select().from(orders).orderBy(desc(orders.createdAt));
    if (date) {
      allOrders = allOrders.filter((o: any) => o.pickupDate === date);
    }

    const enrichedOrders = [];
    for (const ord of allOrders) {
      const [customer] = await db.select().from(users).where(eq(users.id, ord.customerId));
      const [slot] = await db.select().from(pickupSlots).where(eq(pickupSlots.id, ord.pickupSlotId));
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, ord.id));

      const enrichedItems = [];
      for (const it of items) {
        const [cust] = await db.select().from(orderCustomisations).where(eq(orderCustomisations.orderItemId, it.id));
        enrichedItems.push({
          ...it,
          customisation: cust || null,
        });
      }

      enrichedOrders.push({
        ...ord,
        customer: {
          fullName: customer?.fullName || "Guest",
          email: customer?.email,
          phone: customer?.phone,
        },
        slot,
        items: enrichedItems,
      });
    }

    return NextResponse.json({
      capacities,
      orders: enrichedOrders,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "baker") {
      return NextResponse.json({ error: "Forbidden: Baker credentials required" }, { status: 403 });
    }

    const body = await req.json();
    const { action, orderId, newStatus, date, maxCakes, isClosed } = body;

    // 1. Order Status Transition
    if (action === "update_order_status") {
      if (!orderId || !newStatus) {
        return NextResponse.json({ error: "Missing orderId or newStatus" }, { status: 400 });
      }

      const res = await OrderService.updateOrderStatus(user.userId, orderId, newStatus);
      if (!res.success) {
        return NextResponse.json({ error: res.error }, { status: 400 });
      }
      return NextResponse.json(res);
    }

    // 2. Set Daily Capacity or Close Date
    if (action === "update_daily_capacity") {
      if (!date) {
        return NextResponse.json({ error: "Missing date" }, { status: 400 });
      }

      const [existing] = await db.select().from(dailyCapacity).where(eq(dailyCapacity.bakeryDate, date));
      if (existing) {
        await db
          .update(dailyCapacity)
          .set({
            maxCakes: maxCakes !== undefined ? Number(maxCakes) : existing.maxCakes,
            isClosed: isClosed !== undefined ? Boolean(isClosed) : existing.isClosed,
            updatedAt: new Date(),
          })
          .where(eq(dailyCapacity.id, existing.id));
      } else {
        await db.insert(dailyCapacity).values({
          bakeryDate: date,
          maxCakes: maxCakes !== undefined ? Number(maxCakes) : 10,
          reservedCakes: 0,
          isClosed: isClosed !== undefined ? Boolean(isClosed) : false,
        });
      }

      return NextResponse.json({ success: true, date });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
