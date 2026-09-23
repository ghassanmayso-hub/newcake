import { pgTable, uuid, text, integer, boolean, timestamp, check, uniqueIndex, index } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// 1. Users
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone"),
  role: text("role", { enum: ["customer", "baker"] }).default("customer").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 2. Categories
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 3. Products
export const products = pgTable("products", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  basePrice: integer("base_price").notNull(), // stored in integer minor units (cents)
  imageUrl: text("image_url").notNull(),
  leadTimeHours: integer("lead_time_hours").default(48).notNull(), // minimum lead time in hours
  messageFee: integer("message_fee").default(350).notNull(), // $3.50 in cents
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 4. Product Categories (Junction)
export const productCategories = pgTable("product_categories", {
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("product_categories_pk").on(table.productId, table.categoryId),
]);

// 5. Product Options (Sizes, Flavours)
export const productOptions = pgTable("product_options", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  type: text("type", { enum: ["size", "flavour"] }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  priceModifier: integer("price_modifier").default(0).notNull(), // in minor units
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 6. Dietary Tags
export const dietaryTags = pgTable("dietary_tags", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(), // e.g. "Eggless", "Gluten-Free", "Nut-Free"
  slug: text("slug").notNull().unique(),
  badgeColor: text("badge_color"),
});

// 7. Product Dietary Tags (Junction)
export const productDietaryTags = pgTable("product_dietary_tags", {
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  dietaryTagId: uuid("dietary_tag_id").notNull().references(() => dietaryTags.id, { onDelete: "cascade" }),
}, (table) => [
  uniqueIndex("product_dietary_tags_pk").on(table.productId, table.dietaryTagId),
]);

// 8. Daily Capacity
export const dailyCapacity = pgTable("daily_capacity", {
  id: uuid("id").defaultRandom().primaryKey(),
  bakeryDate: text("bakery_date").notNull().unique(), // YYYY-MM-DD
  maxCakes: integer("max_cakes").notNull(),
  reservedCakes: integer("reserved_cakes").default(0).notNull(),
  isClosed: boolean("is_closed").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("capacity_non_negative", sql`${table.reservedCakes} >= 0`),
  check("capacity_not_exceeded", sql`${table.reservedCakes} <= ${table.maxCakes}`),
]);

// 9. Pickup Slots
export const pickupSlots = pgTable("pickup_slots", {
  id: uuid("id").defaultRandom().primaryKey(),
  bakeryDate: text("bakery_date").notNull(), // YYYY-MM-DD
  startTime: text("start_time").notNull(), // e.g. "10:00"
  endTime: text("end_time").notNull(),     // e.g. "11:30"
  maxOrders: integer("max_orders").default(5).notNull(),
  currentOrders: integer("current_orders").default(0).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex("slot_time_date_unique").on(table.bakeryDate, table.startTime, table.endTime),
  check("slot_orders_non_negative", sql`${table.currentOrders} >= 0`),
  check("slot_orders_not_exceeded", sql`${table.currentOrders} <= ${table.maxOrders}`),
  index("pickup_slots_date_idx").on(table.bakeryDate),
]);

// 10. Orders
export const orders = pgTable("orders", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderReference: text("order_reference").notNull().unique(), // e.g. "CKC-892147"
  customerId: uuid("customer_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  pickupDate: text("pickup_date").notNull(), // YYYY-MM-DD
  pickupSlotId: uuid("pickup_slot_id").notNull().references(() => pickupSlots.id, { onDelete: "restrict" }),
  
  status: text("status", {
    enum: ["PENDING", "CONFIRMED", "BAKING", "READY", "COLLECTED", "CANCELLED", "EXPIRED", "REFUNDED"],
  }).default("PENDING").notNull(),
  
  paymentStatus: text("payment_status", {
    enum: ["UNPAID", "PAID", "REFUNDED", "FAILED"],
  }).default("UNPAID").notNull(),
  
  holdExpiresAt: timestamp("hold_expires_at", { withTimezone: true }).notNull(), // 10 minutes from creation
  totalAmount: integer("total_amount").notNull(), // minor units
  messageFee: integer("message_fee").default(0).notNull(),
  customerNotes: text("customer_notes"),
  cancellationReason: text("cancellation_reason"),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index("orders_customer_idx").on(table.customerId),
  index("orders_pickup_date_idx").on(table.pickupDate),
  index("orders_status_idx").on(table.status),
]);

// 11. Order Items
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  productId: uuid("product_id").notNull().references(() => products.id, { onDelete: "restrict" }),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: integer("unit_price").notNull(), // minor units
  subtotal: integer("subtotal").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// 12. Order Customisations
export const orderCustomisations = pgTable("order_customisations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderItemId: uuid("order_item_id").notNull().references(() => orderItems.id, { onDelete: "cascade" }),
  sizeOptionId: uuid("size_option_id").references(() => productOptions.id),
  sizeName: text("size_name"),
  flavourOptionId: uuid("flavour_option_id").references(() => productOptions.id),
  flavourName: text("flavour_name"),
  customMessage: text("custom_message"), // 40 chars max enforced at DB check
  messageFee: integer("message_fee").default(0).notNull(),
  customerReferenceImageUrl: text("customer_reference_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  check("custom_message_length_limit", sql`length(${table.customMessage}) <= 40`),
]);

// 13. Payments
export const payments = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull().references(() => orders.id, { onDelete: "restrict" }),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  paymentIntentId: text("payment_intent_id"),
  provider: text("provider").default("stripe_test").notNull(),
  amount: integer("amount").notNull(), // in minor units
  status: text("status", { enum: ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"] }).default("PENDING").notNull(),
  rawEvent: text("raw_event"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// 14. Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  entity: text("entity").notNull(), // e.g. "order", "daily_capacity"
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(), // e.g. "HOLD_RESERVED", "HOLD_RELEASED", "STATUS_CHANGE"
  actorId: text("actor_id"),
  detailsJson: text("details_json"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
}));

export const productsRelations = relations(products, ({ many }) => ({
  options: many(productOptions),
  categories: many(productCategories),
  dietaryTags: many(productDietaryTags),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  customer: one(users, { fields: [orders.customerId], references: [users.id] }),
  pickupSlot: one(pickupSlots, { fields: [orders.pickupSlotId], references: [pickupSlots.id] }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one, many }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
  customisation: one(orderCustomisations, { fields: [orderItems.id], references: [orderCustomisations.orderItemId] }),
}));
