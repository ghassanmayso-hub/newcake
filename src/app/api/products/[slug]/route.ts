import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories, productCategories, dietaryTags, productDietaryTags, productOptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const [prod] = await db.select().from(products).where(eq(products.slug, slug));

    if (!prod) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Get options
    const options: any[] = await db.select().from(productOptions).where(eq(productOptions.productId, prod.id));
    const sizes = options.filter((o: any) => o.type === "size");
    const flavours = options.filter((o: any) => o.type === "flavour");

    // Get categories
    const catLinks: any[] = await db.select().from(productCategories).where(eq(productCategories.productId, prod.id));
    const allCategories: any[] = await db.select().from(categories);
    const prodCategories = allCategories.filter((c: any) => catLinks.some((l: any) => l.categoryId === c.id));

    // Get dietary tags
    const dietLinks: any[] = await db.select().from(productDietaryTags).where(eq(productDietaryTags.productId, prod.id));
    const allDietTags: any[] = await db.select().from(dietaryTags);
    const prodDietTags = allDietTags.filter((d: any) => dietLinks.some((l: any) => l.dietaryTagId === d.id));

    return NextResponse.json({
      product: {
        ...prod,
        sizes,
        flavours,
        categories: prodCategories,
        dietaryTags: prodDietTags,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
