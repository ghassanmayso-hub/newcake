import Link from "next/link";
import { Sparkles, Calendar, Clock, ShieldCheck, ArrowRight, HeartHandshake, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { products, dailyCapacity } from "@/db/schema";
import { eq, gte } from "drizzle-orm";
import { formatPrice, formatDateLabel } from "@/lib/utils";
import { runMigrationsAndSeed } from "@/db/seed";

export const revalidate = 0;

export default async function HomePage() {
  // Ensure seed data exists on load
  await runMigrationsAndSeed().catch(() => {});

  // Fetch featured active products
  const featuredProducts: any[] = await db.select().from(products).where(eq(products.isActive, true)).limit(4);

  // Fetch upcoming 7 days capacity
  const todayStr = new Date().toISOString().split("T")[0];
  const capacities: any[] = await db
    .select()
    .from(dailyCapacity)
    .where(gte(dailyCapacity.bakeryDate, todayStr))
    .orderBy(dailyCapacity.bakeryDate)
    .limit(7);

  return (
    <div className="space-y-24 pb-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-28 border-b border-[#E8DFC8]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(45%_50%_at_50%_40%,#F6ECE1_0%,transparent_100%)] opacity-70" />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EFE4D6] text-[#C86236] text-xs font-bold tracking-wide uppercase">
                <Sparkles className="w-3.5 h-3.5" />
                Small-Batch Artisanal Micro-Bakery
              </div>

              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#2D1E18] tracking-tight leading-[1.15]">
                Freshly baked with love, reserved with <span className="text-[#C86236] underline decoration-[#E6A15C]/60 decoration-wavy underline-offset-8">limited daily slots.</span>
              </h1>

              <p className="text-base sm:text-lg text-[#6B5A4E] max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Every single cake is baked fresh to order in our home studio. We cap our daily oven production to ensure each confection is flawlessly balanced and customized to your exact tastes.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
                <Link
                  href="/menu"
                  className="w-full sm:w-auto px-8 py-4 bg-[#C86236] hover:bg-[#B35228] text-white font-semibold rounded-2xl shadow-lg shadow-[#C86236]/25 transition flex items-center justify-center gap-2 group"
                >
                  <span>Explore Cake Menu</span>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <a
                  href="#capacity"
                  className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-[#F3EDE2] text-[#2D1E18] font-semibold border border-[#E8DFC8] rounded-2xl transition flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-[#C86236]" />
                  <span>View Pickup Slots</span>
                </a>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-6 max-w-lg mx-auto lg:mx-0 border-t border-[#E8DFC8]/80">
                <div>
                  <p className="text-xl sm:text-2xl font-bold font-serif text-[#2D1E18]">48h</p>
                  <p className="text-xs text-[#8C7662]">Minimum Lead Time</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold font-serif text-[#2D1E18]">10 Cakes</p>
                  <p className="text-xs text-[#8C7662]">Strict Daily Limit</p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold font-serif text-[#2D1E18]">100%</p>
                  <p className="text-xs text-[#8C7662]">Custom Piped Messages</p>
                </div>
              </div>
            </div>

            {/* Hero Visual Card */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-white aspect-[4/5] bg-stone-100">
                <img
                  src="https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1000&q=80"
                  alt="Velvet Belgian Chocolate Fudge Cake"
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-6 left-6 right-6 text-white p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#E6A15C]">Chef&apos;s Signature</span>
                  <h3 className="font-serif text-xl font-bold">Belgian Velvet Dark Truffle</h3>
                  <p className="text-xs text-stone-200 mt-1">Layered with 70% Callebaut ganache & custom golden script.</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Real-Time Live Daily Capacity Tracker */}
      <section id="capacity" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#FAF6F0] rounded-3xl p-8 sm:p-12 border border-[#E8DFC8] shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#C86236] mb-2">
                <Calendar className="w-4 h-4" />
                Live Kitchen Availability
              </div>
              <h2 className="font-serif text-3xl font-bold text-[#2D1E18]">Upcoming 7-Day Oven Capacity</h2>
              <p className="text-sm text-[#6B5A4E] mt-1">
                Each day has a fixed capacity to maintain artisanal precision. Reserve your date and collection slot before it sells out.
              </p>
            </div>
            <Link
              href="/menu"
              className="text-xs font-bold text-[#C86236] hover:text-[#B35228] underline underline-offset-4 self-start md:self-auto"
            >
              Order for Available Date →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {capacities.map((cap) => {
              const remaining = Math.max(0, cap.maxCakes - cap.reservedCakes);
              const isFull = remaining <= 0 || cap.isClosed;
              const isLow = remaining > 0 && remaining <= 3;

              return (
                <div
                  key={cap.id}
                  className={`p-4 rounded-2xl border text-center transition ${
                    isFull
                      ? "bg-[#EFE8DE]/60 border-[#D9CEBF] opacity-75"
                      : isLow
                      ? "bg-amber-50/80 border-amber-300"
                      : "bg-white border-[#E8DFC8] hover:border-[#C86236]"
                  }`}
                >
                  <p className="text-xs font-semibold text-[#8C7662] uppercase tracking-wide">
                    {formatDateLabel(cap.bakeryDate)}
                  </p>
                  <div className="my-3">
                    {isFull ? (
                      <span className="inline-block px-2.5 py-1 bg-stone-300 text-stone-700 text-xs font-bold rounded-lg">
                        {cap.isClosed ? "Closed" : "Sold Out"}
                      </span>
                    ) : (
                      <div>
                        <span className="text-2xl font-serif font-black text-[#2D1E18]">
                          {remaining}
                        </span>
                        <span className="text-[10px] block text-[#8C7662] uppercase font-semibold">
                          Cakes Left
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="w-full bg-[#EFE8DE] rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isFull ? "bg-stone-400" : isLow ? "bg-amber-500" : "bg-[#C86236]"
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((cap.reservedCakes / cap.maxCakes) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Cakes Menu */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#C86236]">Artisanal Menu</span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#2D1E18] mt-1">
              Hand-Crafted Centerpieces
            </h2>
          </div>
          <Link
            href="/menu"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#C86236] hover:text-[#B35228]"
          >
            <span>View Full Menu & Dietary Filters</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredProducts.map((cake) => (
            <Link
              key={cake.id}
              href={`/cake/${cake.slug}`}
              className="group bg-white rounded-3xl overflow-hidden border border-[#E8DFC8] shadow-sm hover:shadow-xl hover:border-[#C86236]/40 transition-all flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
                <img
                  src={cake.imageUrl}
                  alt={cake.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3 bg-[#FFFDF9]/90 backdrop-blur-md px-2.5 py-1 rounded-full text-[11px] font-bold text-[#2D1E18] border border-[#E8DFC8]">
                  48h Lead Time
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-serif font-bold text-lg text-[#2D1E18] group-hover:text-[#C86236] transition-colors">
                    {cake.name}
                  </h3>
                  <p className="text-xs text-[#6B5A4E] mt-1 line-clamp-2 leading-relaxed">
                    {cake.description}
                  </p>
                </div>
                <div className="mt-4 pt-4 border-t border-[#E8DFC8]/60 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#8C7662]">Starting From</span>
                    <p className="text-lg font-bold font-serif text-[#2D1E18]">
                      {formatPrice(cake.basePrice)}
                    </p>
                  </div>
                  <span className="px-3.5 py-1.5 bg-[#F3EDE2] text-[#2D1E18] group-hover:bg-[#C86236] group-hover:text-white rounded-xl text-xs font-bold transition">
                    Customise →
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Our Craft Philosophy */}
      <section id="philosophy" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
          
          <div className="p-6 rounded-3xl bg-white border border-[#E8DFC8]">
            <div className="w-12 h-12 rounded-2xl bg-[#F6ECE1] flex items-center justify-center text-[#C86236] mb-4 mx-auto md:mx-0">
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#2D1E18]">48-Hour Micro-Curing</h3>
            <p className="text-xs text-[#6B5A4E] mt-2 leading-relaxed">
              We never rush sponge fermentation or ganache stabilization. Every order adheres to a strict 48-hour minimum preparation cycle.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E8DFC8]">
            <div className="w-12 h-12 rounded-2xl bg-[#F6ECE1] flex items-center justify-center text-[#C86236] mb-4 mx-auto md:mx-0">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#2D1E18]">Custom Hand-Piped Scripts</h3>
            <p className="text-xs text-[#6B5A4E] mt-2 leading-relaxed">
              Personalize your confection with up to 40 characters of artisanal piped lettering, custom size scaling, and distinct flavour profiles.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-[#E8DFC8]">
            <div className="w-12 h-12 rounded-2xl bg-[#F6ECE1] flex items-center justify-center text-[#C86236] mb-4 mx-auto md:mx-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-serif font-bold text-lg text-[#2D1E18]">Guaranteed Pickup Slots</h3>
            <p className="text-xs text-[#6B5A4E] mt-2 leading-relaxed">
              No long queues or cold cakes. Select a dedicated 90-minute collection window. Scan your digital QR code for instant retrieval.
            </p>
          </div>

        </div>
      </section>

    </div>
  );
}
