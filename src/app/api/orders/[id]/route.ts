import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { orders, orderItems, orderCustomisations, pickupSlots, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import QRCode from "qrcode";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Access control: only the owning customer or a baker can view
    if (!user || (user.role !== "baker" && user.userId !== order.customerId)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const [customer] = await db.select().from(users).where(eq(users.id, order.customerId));
    const [slot] = await db.select().from(pickupSlots).where(eq(pickupSlots.id, order.pickupSlotId));
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    const enrichedItems = [];
    for (const it of items) {
      const [cust] = await db.select().from(orderCustomisations).where(eq(orderCustomisations.orderItemId, it.id));
      enrichedItems.push({
        ...it,
        customisation: cust || null,
      });
    }

    // Generate Collection QR Code
    const qrPayload = JSON.stringify({
      orderReference: order.orderReference,
      pickupDate: order.pickupDate,
      pickupSlot: slot ? `${slot.startTime} - ${slot.endTime}` : "N/A",
      status: order.status,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      margin: 1,
      width: 280,
      color: {
        dark: "#2D1E18",
        light: "#FFFDF9",
      },
    });

    return NextResponse.json({
      order: {
        ...order,
        customer: {
          fullName: customer?.fullName || "Guest Customer",
          email: customer?.email,
          phone: customer?.phone,
        },
        slot,
        items: enrichedItems,
        qrCode: qrCodeDataUrl,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
