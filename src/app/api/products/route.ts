import { NextResponse } from "next/server";
import { db } from "@/db";
import { products, categories, productCategories, dietaryTags, productDietaryTags, productOptions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const categorySlug = searchParams.get("category");
    const dietarySlug = searchParams.get("dietary");

    // Fetch all active products
    const allProducts: any[] = await db.select().from(products).where(eq(products.isActive, true));

    // Fetch categories and dietary tags
    const allCategories: any[] = await db.select().from(categories);
    const allDietaryTags: any[] = await db.select().from(dietaryTags);
    const allOptions: any[] = await db.select().from(productOptions);
    const prodCatLinks: any[] = await db.select().from(productCategories);
    const prodDietLinks: any[] = await db.select().from(productDietaryTags);

    const enriched = allProducts.map((p: any) => {
      // Find category
      const catLinks = prodCatLinks.filter((l: any) => l.productId === p.id);
      const prodCategories = allCategories.filter((c: any) => catLinks.some((l: any) => l.categoryId === c.id));

      // Find dietary tags
      const dietLinks = prodDietLinks.filter((l: any) => l.productId === p.id);
      const prodDietary = allDietaryTags.filter((d: any) => dietLinks.some((l: any) => l.dietaryTagId === d.id));

      // Find options
      const options = allOptions.filter((o: any) => o.productId === p.id);
      const sizes = options.filter((o: any) => o.type === "size");
      const flavours = options.filter((o: any) => o.type === "flavour");

      return {
        ...p,
        categories: prodCategories,
        dietaryTags: prodDietary,
        sizes,
        flavours,
      };
    });

    let filtered = enriched;
    if (categorySlug && categorySlug !== "all") {
      filtered = filtered.filter((p: any) => p.categories.some((c: any) => c.slug === categorySlug));
    }
    if (dietarySlug && dietarySlug !== "all") {
      filtered = filtered.filter((p: any) => p.dietaryTags.some((d: any) => d.slug === dietarySlug));
    }

    return NextResponse.json({
      products: filtered,
      categories: allCategories,
      dietaryTags: allDietaryTags,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
