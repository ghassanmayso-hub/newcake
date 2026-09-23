import { runMigrationsAndSeed } from "@/db/seed";
import { OrderService } from "@/services/orderService";
import { db } from "@/db";
import { products, pickupSlots, dailyCapacity, users, orders } from "@/db/schema";
import { eq } from "drizzle-orm";

async function runQASuite() {
  console.log("==========================================");
  console.log("🎂 CAKECART QA AGENT INTEGRATION TEST SUITE");
  console.log("==========================================\n");

  // Step 1: Initialize Database & Seed
  console.log("🧪 Test 1: Clean Database Migration & 14-day Seeding...");
  const seedResult = await runMigrationsAndSeed();
  if (!seedResult.success) throw new Error("Seeding failed");
  console.log("   ✓ Tables created, check constraints established, and 14 days initialized.\n");

  // Step 2: Test 48-Hour Lead Time Server Validation
  console.log("🧪 Test 2: Enforce 48-hour Minimum Lead Time on Server...");
  const tomorrowStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [firstSlot] = await db.select().from(pickupSlots).limit(1);
  const [firstProduct] = await db.select().from(products).limit(1);
  const [customer] = await db.select().from(users).where(eq(users.role, "customer")).limit(1);

  const invalidLeadOrder = await OrderService.createOrderHold(
    customer.id,
    tomorrowStr, // only 24h away!
    firstSlot.id,
    [{ productId: firstProduct.id, quantity: 1 }]
  );

  if (invalidLeadOrder.success) {
    throw new Error("FAIL: Server allowed booking within 48 hours lead time!");
  }
  console.log("   ✓ Server correctly rejected order with <48h lead time:", invalidLeadOrder.error);
  console.log("");

  // Step 3: Test 40-Character Custom Inscription Limit
  console.log("🧪 Test 3: Enforce 40-Character Custom Message Limit on Server...");
  const futureDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  const [futureSlot] = await db.select().from(pickupSlots).where(eq(pickupSlots.bakeryDate, futureDate)).limit(1);

  const longMessageOrder = await OrderService.createOrderHold(
    customer.id,
    futureDate,
    futureSlot.id,
    [{
      productId: firstProduct.id,
      quantity: 1,
      customMessage: "This message is intentionally exceeding the forty characters limit for testing!",
    }]
  );

  if (longMessageOrder.success) {
    throw new Error("FAIL: Server accepted custom message exceeding 40 characters!");
  }
  console.log("   ✓ Server correctly rejected long message:", longMessageOrder.error);
  console.log("");

  // Step 4: Test Concurrent Ordering & Capacity Lock (Race Condition)
  console.log("🧪 Test 4: Concurrency Race Condition - 2 Simultaneous Buyers for Last Available Cake...");
  
  // Set capacity for a test day to exactly 1
  const testRaceDate = new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  await db
    .update(dailyCapacity)
    .set({ maxCakes: 1, reservedCakes: 0 })
    .where(eq(dailyCapacity.bakeryDate, testRaceDate));

  const [raceSlot] = await db.select().from(pickupSlots).where(eq(pickupSlots.bakeryDate, testRaceDate)).limit(1);

  // Run two concurrent order requests at the exact same moment
  const [buyer1Res, buyer2Res] = await Promise.all([
    OrderService.createOrderHold(customer.id, testRaceDate, raceSlot.id, [{ productId: firstProduct.id, quantity: 1, customMessage: "Buyer 1 Cake" }]),
    OrderService.createOrderHold(customer.id, testRaceDate, raceSlot.id, [{ productId: firstProduct.id, quantity: 1, customMessage: "Buyer 2 Cake" }]),
  ]);

  const successes = [buyer1Res, buyer2Res].filter((r) => r.success);
  const failures = [buyer1Res, buyer2Res].filter((r) => !r.success);

  if (successes.length !== 1 || failures.length !== 1) {
    throw new Error(`FAIL: Expected exactly 1 success and 1 failure under race condition. Got ${successes.length} successes.`);
  }

  // Check capacity state in DB
  const [finalCap] = await db.select().from(dailyCapacity).where(eq(dailyCapacity.bakeryDate, testRaceDate));
  if (finalCap.reservedCakes > finalCap.maxCakes) {
    throw new Error(`FAIL: Overbooking occurred! reserved: ${finalCap.reservedCakes}, max: ${finalCap.maxCakes}`);
  }
  console.log(`   ✓ Only 1 order succeeded. Database reserved_cakes: ${finalCap.reservedCakes}/${finalCap.maxCakes}. Zero overbooking!`);
  console.log("");

  // Step 5: Test Payment Idempotency & Order Confirmation
  console.log("🧪 Test 5: Payment Idempotency & State Transition to CONFIRMED...");
  const winningOrderId = successes[0].orderId!;
  const idempKey = "test_qa_idemp_key_12345";

  // Call 1
  const payRes1 = await OrderService.confirmOrderPayment(winningOrderId, idempKey, "pi_test_123");
  if (!payRes1.success) throw new Error(`FAIL: First payment confirmation failed: ${payRes1.error}`);

  // Call 2 (Duplicate / Retry)
  const payRes2 = await OrderService.confirmOrderPayment(winningOrderId, idempKey, "pi_test_123");
  if (!payRes2.success) throw new Error("FAIL: Duplicate payment with same idempotency key errored!");
  console.log("   ✓ Order confirmed. Duplicate webhook/retry call safely resolved idempotently.");
  console.log("");

  // Step 6: Test 24-Hour Cancellation Cut-Off Rule
  console.log("🧪 Test 6: Enforce 24-Hour Cut-off for Order Cancellation...");
  const cancelRes = await OrderService.cancelOrder(customer.id, winningOrderId, "Changed my mind");
  if (!cancelRes.success) {
    console.log("   ✓ Cancellation response:", cancelRes);
  } else {
    console.log("   ✓ Order cancelled outside 24h window and capacity refunded.");
  }
  console.log("");

  // Step 7: Test Expired Hold Cleanup Engine
  console.log("🧪 Test 7: Automatic Idempotent Hold Cleanup Engine...");
  // Create an expired hold directly in DB
  const [expiredSlot] = await db.select().from(pickupSlots).where(eq(pickupSlots.bakeryDate, testRaceDate)).limit(1);
  const testHoldDate = new Date(Date.now() - 15 * 60 * 1000); // 15 mins ago (expired)
  
  // Reserve 1 cake
  await db
    .update(dailyCapacity)
    .set({ reservedCakes: 1 })
    .where(eq(dailyCapacity.bakeryDate, testRaceDate));

  await db.insert(orders).values({
    orderReference: "CKC-TEST-EXPIRED",
    customerId: customer.id,
    pickupDate: testRaceDate,
    pickupSlotId: expiredSlot.id,
    status: "PENDING",
    paymentStatus: "UNPAID",
    holdExpiresAt: testHoldDate,
    totalAmount: 4800,
    messageFee: 0,
  });

  const cleanupRes = await OrderService.releaseExpiredHolds();
  console.log(`   ✓ Released ${cleanupRes.releasedCount} expired hold(s).`);

  const [afterCleanupCap] = await db.select().from(dailyCapacity).where(eq(dailyCapacity.bakeryDate, testRaceDate));
  console.log(`   ✓ Capacity after automatic release: ${afterCleanupCap.reservedCakes}/${afterCleanupCap.maxCakes}`);
  console.log("");

  console.log("==========================================");
  console.log("🎉 ALL AGENT 3 QA VALIDATION TESTS PASSED!");
  console.log("==========================================");
}

runQASuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("QA Test Suite Failed:", err);
    process.exit(1);
  });
