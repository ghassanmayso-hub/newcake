import { db } from "@/db";
import {
  dailyCapacity,
  pickupSlots,
  orders,
  orderItems,
  orderCustomisations,
  auditLogs,
  payments,
  products,
  productOptions,
} from "@/db/schema";
import { eq, and, sql, lt, inArray } from "drizzle-orm";

export interface CartItemInput {
  productId: string;
  quantity: number;
  sizeOptionId?: string;
  flavourOptionId?: string;
  customMessage?: string;
  customerReferenceImageUrl?: string;
}

export interface HoldReservationResult {
  success: boolean;
  orderId?: string;
  orderReference?: string;
  holdExpiresAt?: string;
  totalAmount?: number;
  error?: string;
}

export class OrderService {
  /**
   * 1. Begin transaction
   * 2. Lock daily_capacity & pickup_slot rows
   * 3. Confirm capacity & slot room
   * 4. Increment reserved_cakes & slot current_orders with 10-minute hold expiration
   * 5. Calculate prices strictly on the server
   * 6. Create PENDING order
   */
  static async createOrderHold(
    customerId: string,
    pickupDate: string, // YYYY-MM-DD
    pickupSlotId: string,
    items: CartItemInput[],
    customerNotes?: string
  ): Promise<HoldReservationResult> {
    if (!items || items.length === 0) {
      return { success: false, error: "Cart cannot be empty" };
    }

    // 1. Enforce minimum 48-hour lead time on the server
    const now = new Date();
    const pickupDateTime = new Date(`${pickupDate}T10:00:00Z`);
    const diffHours = (pickupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 47.9) {
      return {
        success: false,
        error: "Orders must be placed at least 48 hours in advance for artisanal preparation.",
      };
    }

    // 2. Calculate total cake count needed
    const totalCakes = items.reduce((acc, it) => acc + (it.quantity || 1), 0);

    // 3. Database Transaction & Capacity Locking
    return await (db as any).transaction(async (tx: any) => {
      // First, automatically release any expired holds to free up slots
      await this.releaseExpiredHoldsInternal(tx);

      // Lock and fetch daily capacity
      const [cap] = await tx
        .select()
        .from(dailyCapacity)
        .where(eq(dailyCapacity.bakeryDate, pickupDate))
        .for("update");

      if (!cap) {
        return { success: false, error: `Bakery is not accepting orders for ${pickupDate}` };
      }

      if (cap.isClosed) {
        return { success: false, error: `Bakery is closed on ${pickupDate}` };
      }

      const availableCakes = cap.maxCakes - cap.reservedCakes;
      if (availableCakes < totalCakes) {
        return {
          success: false,
          error: `Daily capacity exceeded. Only ${Math.max(0, availableCakes)} cake(s) remaining for ${pickupDate}.`,
        };
      }

      // Lock and fetch pickup slot
      const [slot] = await tx
        .select()
        .from(pickupSlots)
        .where(and(eq(pickupSlots.id, pickupSlotId), eq(pickupSlots.bakeryDate, pickupDate)))
        .for("update");

      if (!slot) {
        return { success: false, error: "Selected pickup slot is invalid or unavailable" };
      }

      if (slot.currentOrders >= slot.maxOrders) {
        return { success: false, error: "The chosen pickup time slot is fully booked. Please select another slot." };
      }

      // Server-side price calculation
      let calculatedTotal = 0;
      let totalMessageFees = 0;
      const verifiedItems: any[] = [];

      for (const item of items) {
        // Enforce 40 character limit on custom message
        if (item.customMessage && item.customMessage.trim().length > 40) {
          return {
            success: false,
            error: `Custom cake message "${item.customMessage}" exceeds the 40-character limit.`,
          };
        }

        const [prod] = await tx.select().from(products).where(eq(products.id, item.productId));
        if (!prod || !prod.isActive) {
          return { success: false, error: "One or more products in your cart are no longer available" };
        }

        let itemPrice = prod.basePrice;
        let sizeName: string | undefined;
        let flavourName: string | undefined;

        if (item.sizeOptionId) {
          const [sizeOpt] = await tx.select().from(productOptions).where(eq(productOptions.id, item.sizeOptionId));
          if (sizeOpt) {
            itemPrice += sizeOpt.priceModifier;
            sizeName = sizeOpt.name;
          }
        }

        if (item.flavourOptionId) {
          const [flavourOpt] = await tx.select().from(productOptions).where(eq(productOptions.id, item.flavourOptionId));
          if (flavourOpt) {
            itemPrice += flavourOpt.priceModifier;
            flavourName = flavourOpt.name;
          }
        }

        const hasCustomMsg = !!(item.customMessage && item.customMessage.trim().length > 0);
        const itemMsgFee = hasCustomMsg ? prod.messageFee : 0;
        totalMessageFees += itemMsgFee * item.quantity;

        const subtotal = itemPrice * item.quantity;
        calculatedTotal += subtotal + itemMsgFee * item.quantity;

        verifiedItems.push({
          productId: prod.id,
          productName: prod.name,
          quantity: item.quantity,
          unitPrice: itemPrice,
          subtotal: subtotal,
          customisation: {
            sizeOptionId: item.sizeOptionId,
            sizeName,
            flavourOptionId: item.flavourOptionId,
            flavourName,
            customMessage: item.customMessage?.trim() || null,
            messageFee: itemMsgFee,
            customerReferenceImageUrl: item.customerReferenceImageUrl || null,
          },
        });
      }

      // Increment holds
      await tx
        .update(dailyCapacity)
        .set({
          reservedCakes: sql`${dailyCapacity.reservedCakes} + ${totalCakes}`,
          updatedAt: new Date(),
        })
        .where(eq(dailyCapacity.id, cap.id));

      await tx
        .update(pickupSlots)
        .set({
          currentOrders: sql`${pickupSlots.currentOrders} + 1`,
        })
        .where(eq(pickupSlots.id, slot.id));

      // 10-minute hold expiration
      const holdExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      const orderRef = `CKC-${Math.floor(100000 + Math.random() * 900000)}`;

      // Create order
      const [newOrder] = await tx
        .insert(orders)
        .values({
          orderReference: orderRef,
          customerId,
          pickupDate,
          pickupSlotId: slot.id,
          status: "PENDING",
          paymentStatus: "UNPAID",
          holdExpiresAt,
          totalAmount: calculatedTotal,
          messageFee: totalMessageFees,
          customerNotes: customerNotes || null,
        })
        .returning();

      // Insert order items & customisations
      for (const vItem of verifiedItems) {
        const [insertedItem] = await tx
          .insert(orderItems)
          .values({
            orderId: newOrder.id,
            productId: vItem.productId,
            productName: vItem.productName,
            quantity: vItem.quantity,
            unitPrice: vItem.unitPrice,
            subtotal: vItem.subtotal,
          })
          .returning();

        await tx.insert(orderCustomisations).values({
          orderItemId: insertedItem.id,
          sizeOptionId: vItem.customisation.sizeOptionId,
          sizeName: vItem.customisation.sizeName,
          flavourOptionId: vItem.customisation.flavourOptionId,
          flavourName: vItem.customisation.flavourName,
          customMessage: vItem.customisation.customMessage,
          messageFee: vItem.customisation.messageFee,
          customerReferenceImageUrl: vItem.customisation.customerReferenceImageUrl,
        });
      }

      // Write Audit Log
      await tx.insert(auditLogs).values({
        entity: "order",
        entityId: newOrder.id,
        action: "HOLD_RESERVED",
        actorId: customerId,
        detailsJson: JSON.stringify({
          cakesReserved: totalCakes,
          pickupDate,
          holdExpiresAt,
          orderReference: orderRef,
        }),
      });

      return {
        success: true,
        orderId: newOrder.id,
        orderReference: orderRef,
        holdExpiresAt: holdExpiresAt.toISOString(),
        totalAmount: calculatedTotal,
      };
    });
  }

  /**
   * Confirms payment and converts PENDING hold to CONFIRMED.
   * Ensures idempotency: duplicate calls with same idempotencyKey do not duplicate or error.
   */
  static async confirmOrderPayment(
    orderId: string,
    idempotencyKey: string,
    paymentIntentId?: string,
    rawEvent?: any
  ) {
    return await (db as any).transaction(async (tx: any) => {
      // 1. Check idempotency
      const [existingPayment] = await tx
        .select()
        .from(payments)
        .where(eq(payments.idempotencyKey, idempotencyKey));

      if (existingPayment) {
        return { success: true, paymentId: existingPayment.id, alreadyProcessed: true };
      }

      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
      if (!order) {
        return { success: false, error: "Order not found" };
      }

      if (order.status !== "PENDING") {
        if (order.status === "CONFIRMED") {
          return { success: true, message: "Order is already confirmed" };
        }
        return { success: false, error: `Cannot confirm order in status: ${order.status}` };
      }

      // Check if hold has expired
      if (new Date() > new Date(order.holdExpiresAt)) {
        return { success: false, error: "Order reservation hold has expired. Please select your cakes again." };
      }

      // Confirm order & payment status
      await tx
        .update(orders)
        .set({
          status: "CONFIRMED",
          paymentStatus: "PAID",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      const [newPayment] = await tx
        .insert(payments)
        .values({
          orderId: order.id,
          idempotencyKey,
          paymentIntentId: paymentIntentId || `pi_sim_${Date.now()}`,
          provider: "stripe_test",
          amount: order.totalAmount,
          status: "SUCCEEDED",
          rawEvent: rawEvent ? JSON.stringify(rawEvent) : null,
        })
        .returning();

      await tx.insert(auditLogs).values({
        entity: "order",
        entityId: order.id,
        action: "PAYMENT_CONFIRMED",
        actorId: order.customerId,
        detailsJson: JSON.stringify({
          paymentId: newPayment.id,
          amount: order.totalAmount,
          idempotencyKey,
        }),
      });

      return { success: true, paymentId: newPayment.id };
    });
  }

  /**
   * Release expired holds and decrements reserved_cakes & current_orders.
   * Idempotent & safe for frequent cron execution.
   */
  static async releaseExpiredHolds() {
    return await (db as any).transaction(async (tx: any) => {
      return await this.releaseExpiredHoldsInternal(tx);
    });
  }

  private static async releaseExpiredHoldsInternal(tx: any) {
    const now = new Date();
    // Find all pending orders past hold expiration
    const expiredOrders = await tx
      .select()
      .from(orders)
      .where(and(eq(orders.status, "PENDING"), lt(orders.holdExpiresAt, now)))
      .for("update");

    if (expiredOrders.length === 0) {
      return { releasedCount: 0 };
    }

    for (const ord of expiredOrders) {
      // Find count of cakes
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, ord.id));
      const cakeCount = items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);

      // Decrement daily capacity safely (clamping at 0)
      await tx
        .update(dailyCapacity)
        .set({
          reservedCakes: sql`GREATEST(0, ${dailyCapacity.reservedCakes} - ${cakeCount})`,
          updatedAt: new Date(),
        })
        .where(eq(dailyCapacity.bakeryDate, ord.pickupDate));

      // Decrement pickup slot safely (clamping at 0)
      await tx
        .update(pickupSlots)
        .set({
          currentOrders: sql`GREATEST(0, ${pickupSlots.currentOrders} - 1)`,
        })
        .where(eq(pickupSlots.id, ord.pickupSlotId));

      // Mark order EXPIRED
      await tx
        .update(orders)
        .set({
          status: "EXPIRED",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, ord.id));

      await tx.insert(auditLogs).values({
        entity: "order",
        entityId: ord.id,
        action: "HOLD_EXPIRED_RELEASED",
        detailsJson: JSON.stringify({
          cakesReleased: cakeCount,
          pickupDate: ord.pickupDate,
        }),
      });
    }

    return { releasedCount: expiredOrders.length };
  }

  /**
   * Customer order cancellation with 24-hour cut-off rule
   */
  static async cancelOrder(customerId: string, orderId: string, reason?: string) {
    return await (db as any).transaction(async (tx: any) => {
      const [order] = await tx
        .select()
        .from(orders)
        .where(and(eq(orders.id, orderId), eq(orders.customerId, customerId)))
        .for("update");

      if (!order) {
        return { success: false, error: "Order not found or access denied" };
      }

      if (order.status === "CANCELLED" || order.status === "COLLECTED" || order.status === "REFUNDED") {
        return { success: false, error: `Order cannot be cancelled in status: ${order.status}` };
      }

      // Check 24-hour cutoff
      const now = new Date();
      const pickupDateTime = new Date(`${order.pickupDate}T10:00:00Z`);
      const hoursUntilPickup = (pickupDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilPickup < 24) {
        return {
          success: false,
          error: "Orders cannot be cancelled within 24 hours of scheduled pickup.",
        };
      }

      // Decrement reserved cakes if was confirmed or pending
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      const cakeCount = items.reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);

      await tx
        .update(dailyCapacity)
        .set({
          reservedCakes: sql`GREATEST(0, ${dailyCapacity.reservedCakes} - ${cakeCount})`,
          updatedAt: new Date(),
        })
        .where(eq(dailyCapacity.bakeryDate, order.pickupDate));

      await tx
        .update(pickupSlots)
        .set({
          currentOrders: sql`GREATEST(0, ${pickupSlots.currentOrders} - 1)`,
        })
        .where(eq(pickupSlots.id, order.pickupSlotId));

      await tx
        .update(orders)
        .set({
          status: "CANCELLED",
          paymentStatus: order.paymentStatus === "PAID" ? "REFUNDED" : "UNPAID",
          cancellationReason: reason || "Customer requested cancellation",
          cancelledAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id));

      await tx.insert(auditLogs).values({
        entity: "order",
        entityId: order.id,
        action: "ORDER_CANCELLED",
        actorId: customerId,
        detailsJson: JSON.stringify({ reason }),
      });

      return { success: true };
    });
  }

  /**
   * Baker dashboard transition
   */
  static async updateOrderStatus(
    bakerUserId: string,
    orderId: string,
    newStatus: "BAKING" | "READY" | "COLLECTED" | "CANCELLED"
  ) {
    return await (db as any).transaction(async (tx: any) => {
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update");
      if (!order) {
        return { success: false, error: "Order not found" };
      }

      await tx
        .update(orders)
        .set({
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, orderId));

      await tx.insert(auditLogs).values({
        entity: "order",
        entityId: orderId,
        action: `STATUS_CHANGED_TO_${newStatus}`,
        actorId: bakerUserId,
      });

      return { success: true, newStatus };
    });
  }
}
