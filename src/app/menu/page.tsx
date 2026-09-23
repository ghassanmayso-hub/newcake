"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Search, Filter, Sparkles, Check, ArrowRight } from "lucide-react";

export default function MenuPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [dietaryTags, setDietaryTags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDietary, setSelectedDietary] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<number>(10000); // minor units: $100

  useEffect(() => {
    async function loadMenu() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        setProducts(data.products || []);
        setCategories(data.categories || []);
        setDietaryTags(data.dietaryTags || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMenu();
  }, []);

  const filteredProducts = products.filter((p) => {
    // Category match
    if (selectedCategory !== "all" && !p.categories.some((c: any) => c.slug === selectedCategory)) {
      return false;
    }
    // Dietary match
    if (selectedDietary !== "all" && !p.dietaryTags.some((d: any) => d.slug === selectedDietary)) {
      return false;
    }
    // Price match
    if (p.basePrice > maxPrice) {
      return false;
    }
    // Search match
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const matchName = p.name.toLowerCase().includes(q);
      const matchDesc = p.description.toLowerCase().includes(q);
      const matchFlavour = p.flavours?.some((f: any) => f.name.toLowerCase().includes(q));
      if (!matchName && !matchDesc && !matchFlavour) return false;
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="text-xs font-bold uppercase tracking-wider text-[#C86236]">Artisan Portfolio</span>
        <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-[#2D1E18] mt-2">
          Hand-Crafted Bakery Menu
        </h1>
        <p className="text-sm sm:text-base text-[#6B5A4E] mt-3">
          Explore our seasonal celebration cakes, basque cheesecakes, and tea treats. Filter by dietary preference or price, and customize every layer.
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-3xl p-6 border border-[#E8DFC8] shadow-sm mb-12 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          
          {/* Search Box */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-[#8C7662] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by cake, flavour, or ingredient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-[#FAF6F0] border border-[#E8DFC8] rounded-2xl text-sm text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#C86236]"
            />
          </div>

          {/* Category Dropdown */}
          <div className="md:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-4 py-3 bg-[#FAF6F0] border border-[#E8DFC8] rounded-2xl text-sm text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#C86236]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Max Price Slider */}
          <div className="md:col-span-3 bg-[#FAF6F0] px-4 py-2.5 rounded-2xl border border-[#E8DFC8]">
            <div className="flex justify-between text-xs font-semibold text-[#8C7662] mb-1">
              <span>Max Base Price</span>
              <span className="text-[#2D1E18] font-bold">{formatPrice(maxPrice)}</span>
            </div>
            <input
              type="range"
              min={3000}
              max={10000}
              step={500}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-[#C86236] cursor-pointer"
            />
          </div>
        </div>

        {/* Dietary Tag Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E8DFC8]/60">
          <span className="text-xs font-bold text-[#8C7662] uppercase tracking-wider mr-2 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Dietary:
          </span>
          <button
            onClick={() => setSelectedDietary("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedDietary === "all"
                ? "bg-[#2D1E18] text-white"
                : "bg-[#F3EDE2] text-[#6B5A4E] hover:bg-[#E8DFC8]"
            }`}
          >
            All Diets
          </button>
          {dietaryTags.map((tag) => {
            const isSelected = selectedDietary === tag.slug;
            return (
              <button
                key={tag.id}
                onClick={() => setSelectedDietary(isSelected ? "all" : tag.slug)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-[#C86236] text-white shadow-sm"
                    : "bg-[#F3EDE2] text-[#6B5A4E] hover:bg-[#E8DFC8]"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                {tag.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-96 rounded-3xl bg-stone-200 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-[#E8DFC8]">
          <p className="font-serif text-xl font-bold text-[#2D1E18]">No confections match your selection</p>
          <p className="text-sm text-[#8C7662] mt-1">Try resetting dietary tags or raising your price limit.</p>
          <button
            onClick={() => {
              setSelectedCategory("all");
              setSelectedDietary("all");
              setSearchQuery("");
              setMaxPrice(10000);
            }}
            className="mt-4 px-5 py-2.5 bg-[#C86236] text-white text-xs font-bold rounded-xl hover:bg-[#B35228] transition"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className="group bg-white rounded-3xl overflow-hidden border border-[#E8DFC8] shadow-sm hover:shadow-xl hover:border-[#C86236]/40 transition-all flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                <img
                  src={p.imageUrl}
                  alt={p.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                  {p.dietaryTags?.map((d: any) => (
                    <span
                      key={d.id}
                      className="px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-lg text-[10px] font-bold text-[#2D1E18] border border-[#E8DFC8]"
                    >
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-xl text-[#2D1E18] group-hover:text-[#C86236] transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-[#6B5A4E] mt-2 line-clamp-3 leading-relaxed">
                    {p.description}
                  </p>

                  {/* Available Flavours Preview */}
                  {p.flavours?.length > 0 && (
                    <div className="mt-3 text-[11px] text-[#8C7662]">
                      <span className="font-semibold text-[#2D1E18]">Flavours: </span>
                      {p.flavours.map((f: any) => f.name).join(" • ")}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[#E8DFC8]/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#8C7662]">Starting From</span>
                    <p className="text-xl font-bold font-serif text-[#2D1E18]">
                      {formatPrice(p.basePrice)}
                    </p>
                  </div>
                  <Link
                    href={`/cake/${p.slug}`}
                    className="px-5 py-2.5 bg-[#C86236] text-white hover:bg-[#B35228] rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Customise</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
