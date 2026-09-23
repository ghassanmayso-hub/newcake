import { NextResponse } from "next/server";
import { db } from "@/db";
import { dailyCapacity, pickupSlots } from "@/db/schema";
import { eq, gte } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");

    const todayStr = new Date().toISOString().split("T")[0];

    if (date) {
      const [cap] = await db.select().from(dailyCapacity).where(eq(dailyCapacity.bakeryDate, date));
      const slots = await db.select().from(pickupSlots).where(eq(pickupSlots.bakeryDate, date));

      return NextResponse.json({
        capacity: cap || {
          bakeryDate: date,
          maxCakes: 0,
          reservedCakes: 0,
          remainingCakes: 0,
          isClosed: true,
        },
        slots: slots.map((s: any) => ({
          ...s,
          remainingOrders: Math.max(0, s.maxOrders - s.currentOrders),
        })),
      });
    }

    // Return next 14 days schedule
    const capacities = await db
      .select()
      .from(dailyCapacity)
      .where(gte(dailyCapacity.bakeryDate, todayStr))
      .orderBy(dailyCapacity.bakeryDate);

    const enriched = capacities.map((c: any) => ({
      ...c,
      remainingCakes: Math.max(0, c.maxCakes - c.reservedCakes),
    }));

    return NextResponse.json({ schedule: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
