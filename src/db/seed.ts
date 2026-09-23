import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { getDb } from "./index";
import { sql } from "drizzle-orm";
import {
  users,
  categories,
  products,
  productCategories,
  productOptions,
  dietaryTags,
  productDietaryTags,
  dailyCapacity,
  pickupSlots,
} from "./schema";

let isSeeding = false;
let seeded = false;

export async function runMigrationsAndSeed(customDb?: any) {
  if (seeded) return { success: true };
  if (isSeeding) {
    while (isSeeding) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return { success: true };
  }
  isSeeding = true;

  const targetDb = customDb || getDb();
  
  // Read and execute SQL migration file
  const migrationPath = path.join(process.cwd(), "src/db/migrations/0000_round_prima.sql");
  if (fs.existsSync(migrationPath)) {
    const sqlContent = fs.readFileSync(migrationPath, "utf-8");
    const statements = sqlContent
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      try {
        await targetDb.execute(sql.raw(stmt));
      } catch (err: any) {
        // Table or constraint already exists
      }
    }
  }

  // 1. Seed Users (Baker & Test Customer)
  const bakerPassword = await bcrypt.hash("baker123", 10);
  const customerPassword = await bcrypt.hash("customer123", 10);

  const [baker] = await targetDb
    .insert(users)
    .values({
      email: "baker@cakecart.com",
      passwordHash: bakerPassword,
      fullName: "Master Baker Jacques",
      phone: "+1 (555) 234-5678",
      role: "baker",
    })
    .onConflictDoNothing()
    .returning();

  const [customer] = await targetDb
    .insert(users)
    .values({
      email: "alice@example.com",
      passwordHash: customerPassword,
      fullName: "Alice Henderson",
      phone: "+1 (555) 987-6543",
      role: "customer",
    })
    .onConflictDoNothing()
    .returning();

  // 2. Seed Categories
  const categoryData = [
    { name: "Artisanal Celebration Cakes", slug: "celebration", description: "Multi-layered centerpiece cakes for special occasions", displayOrder: 1 },
    { name: "Rustic Tarts & Cheesecakes", slug: "tarts-cheesecakes", description: "Velvety smooth baked specialties with seasonal compotes", displayOrder: 2 },
    { name: "Petite Tea Cakes & Loaves", slug: "petite-cakes", description: "Refined individual slices and tea-time companions", displayOrder: 3 },
  ];

  const seededCategories: Record<string, any> = {};
  for (const cat of categoryData) {
    const [inserted] = await targetDb
      .insert(categories)
      .values(cat)
      .onConflictDoNothing()
      .returning();
    if (inserted) seededCategories[cat.slug] = inserted;
  }

  // 3. Seed Dietary Tags
  const dietaryData = [
    { name: "Eggless", slug: "eggless", badgeColor: "#059669" },
    { name: "Gluten-Free", slug: "gluten-free", badgeColor: "#D97706" },
    { name: "Nut-Free", slug: "nut-free", badgeColor: "#2563EB" },
  ];

  const seededTags: Record<string, any> = {};
  for (const tag of dietaryData) {
    const [inserted] = await targetDb
      .insert(dietaryTags)
      .values(tag)
      .onConflictDoNothing()
      .returning();
    if (inserted) seededTags[tag.slug] = inserted;
  }

  // 4. Seed Products
  const productsData = [
    {
      name: "Velvet Belgian Chocolate Fudge",
      slug: "velvet-belgian-chocolate-fudge",
      description: "Rich 70% Callebaut dark chocolate sponge layered with silken whipped ganache and gold leaf flaking.",
      basePrice: 4800,
      imageUrl: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=800&q=80",
      leadTimeHours: 48,
      messageFee: 350,
      categorySlug: "celebration",
      dietarySlugs: ["nut-free"],
      options: [
        { type: "size" as const, name: "6-inch (Serves 6-8)", priceModifier: 0, isDefault: true },
        { type: "size" as const, name: "8-inch (Serves 12-16)", priceModifier: 2200, isDefault: false },
        { type: "size" as const, name: "10-inch (Serves 20-25)", priceModifier: 4500, isDefault: false },
        { type: "flavour" as const, name: "Dark Chocolate Espresso Ganache", priceModifier: 0, isDefault: true },
        { type: "flavour" as const, name: "Salted Caramel Cocoa Ripple", priceModifier: 300, isDefault: false },
        { type: "flavour" as const, name: "Raspberry Dark Chocolate Mousse", priceModifier: 400, isDefault: false },
      ],
    },
    {
      name: "Bourbon Madagascar Vanilla Berry",
      slug: "madagascar-vanilla-berry",
      description: "Infused with pure Bourbon vanilla bean caviar, fresh raspberry compote, and mascarpone buttercream.",
      basePrice: 5200,
      imageUrl: "https://images.unsplash.com/photo-1565958011703-44f9829ba187?auto=format&fit=crop&w=800&q=80",
      leadTimeHours: 48,
      messageFee: 350,
      categorySlug: "celebration",
      dietarySlugs: ["eggless", "nut-free"],
      options: [
        { type: "size" as const, name: "6-inch (Serves 6-8)", priceModifier: 0, isDefault: true },
        { type: "size" as const, name: "8-inch (Serves 12-16)", priceModifier: 2000, isDefault: false },
        { type: "flavour" as const, name: "Vanilla Bean & Fresh Raspberry", priceModifier: 0, isDefault: true },
        { type: "flavour" as const, name: "Vanilla Bean & Passionfruit Curd", priceModifier: 350, isDefault: false },
      ],
    },
    {
      name: "Wildflower Honey & Lavender Basque Cheesecake",
      slug: "basque-burnt-cheesecake",
      description: "Caramelized deeply on top with a molten center of French cream cheese infused with local lavender honey.",
      basePrice: 4200,
      imageUrl: "https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80",
      leadTimeHours: 48,
      messageFee: 350,
      categorySlug: "tarts-cheesecakes",
      dietarySlugs: ["gluten-free", "nut-free"],
      options: [
        { type: "size" as const, name: "7-inch (Serves 8-10)", priceModifier: 0, isDefault: true },
        { type: "size" as const, name: "9-inch (Serves 14-16)", priceModifier: 2400, isDefault: false },
        { type: "flavour" as const, name: "Classic French Crème", priceModifier: 0, isDefault: true },
        { type: "flavour" as const, name: "Earl Grey Tea Infusion", priceModifier: 300, isDefault: false },
      ],
    },
    {
      name: "Sicilian Pistachio & Cardamom Dream",
      slug: "pistachio-cardamom-dream",
      description: "Layers of Bronte pistachio sponge, fragrant cardamom infused buttercream, and roasted pistachio praline.",
      basePrice: 5600,
      imageUrl: "https://images.unsplash.com/photo-1588195538326-c5b1e9f80a1b?auto=format&fit=crop&w=800&q=80",
      leadTimeHours: 48,
      messageFee: 350,
      categorySlug: "celebration",
      dietarySlugs: ["eggless"],
      options: [
        { type: "size" as const, name: "6-inch (Serves 6-8)", priceModifier: 0, isDefault: true },
        { type: "size" as const, name: "8-inch (Serves 12-16)", priceModifier: 2500, isDefault: false },
        { type: "flavour" as const, name: "Roasted Bronte Pistachio Cream", priceModifier: 0, isDefault: true },
        { type: "flavour" as const, name: "Pistachio Rosewater Delicate Whip", priceModifier: 350, isDefault: false },
      ],
    },
  ];

  for (const p of productsData) {
    const [insertedProduct] = await targetDb
      .insert(products)
      .values({
        name: p.name,
        slug: p.slug,
        description: p.description,
        basePrice: p.basePrice,
        imageUrl: p.imageUrl,
        leadTimeHours: p.leadTimeHours,
        messageFee: p.messageFee,
      })
      .onConflictDoNothing()
      .returning();

    if (insertedProduct) {
      if (seededCategories[p.categorySlug]) {
        await targetDb
          .insert(productCategories)
          .values({
            productId: insertedProduct.id,
            categoryId: seededCategories[p.categorySlug].id,
          })
          .onConflictDoNothing();
      }

      for (const tagSlug of p.dietarySlugs) {
        if (seededTags[tagSlug]) {
          await targetDb
            .insert(productDietaryTags)
            .values({
              productId: insertedProduct.id,
              dietaryTagId: seededTags[tagSlug].id,
            })
            .onConflictDoNothing();
        }
      }

      for (const opt of p.options) {
        await targetDb
          .insert(productOptions)
          .values({
            productId: insertedProduct.id,
            type: opt.type,
            name: opt.name,
            priceModifier: opt.priceModifier,
            isDefault: opt.isDefault,
          })
          .onConflictDoNothing();
      }
    }
  }

  // 5. Seed Daily Capacity & Pickup Slots for next 14 days
  const today = new Date();
  const timeSlots = [
    { start: "10:00", end: "11:30", maxOrders: 4 },
    { start: "12:00", end: "13:30", maxOrders: 4 },
    { start: "14:30", end: "16:00", maxOrders: 4 },
    { start: "16:30", end: "18:00", maxOrders: 4 },
  ];

  for (let i = 0; i < 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];

    const isSunday = d.getDay() === 0;
    const maxCakes = isSunday ? 4 : 10;
    const isClosed = false;

    await targetDb
      .insert(dailyCapacity)
      .values({
        bakeryDate: dateStr,
        maxCakes: maxCakes,
        reservedCakes: 0,
        isClosed: isClosed,
      })
      .onConflictDoNothing();

    for (const slot of timeSlots) {
      await targetDb
        .insert(pickupSlots)
        .values({
          bakeryDate: dateStr,
          startTime: slot.start,
          endTime: slot.end,
          maxOrders: slot.maxOrders,
          currentOrders: 0,
        })
        .onConflictDoNothing();
    }
  }

  seeded = true;
  isSeeding = false;
  return { success: true, baker, customer };
}

if (require.main === module) {
  runMigrationsAndSeed()
    .then(() => {
      console.log("Database seeded successfully!");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Database seeding failed:", err);
      process.exit(1);
    });
}
