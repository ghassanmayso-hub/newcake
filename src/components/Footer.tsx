import Link from "next/link";
import { Cake, Heart, Clock, MapPin, Sparkles } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-[#2D1E18] text-[#F3EDE2] border-t border-[#443027] mt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          
          {/* Brand */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#C86236] flex items-center justify-center text-white">
                <Cake className="w-5 h-5" />
              </div>
              <span className="font-serif text-xl font-bold tracking-tight text-white">
                Cake<span className="text-[#E6A15C]">Cart</span>
              </span>
            </div>
            <p className="text-xs text-[#A8988B] leading-relaxed">
              Small-batch artisanal micro-bakery. Baked fresh every morning with organic flours, local dairy, and seasonal botanicals.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[#E6A15C]">
              <Sparkles className="w-3.5 h-3.5" />
              Strict daily capacity to guarantee perfection.
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Explore</h4>
            <ul className="space-y-2.5 text-xs text-[#C8BCB0]">
              <li><Link href="/menu" className="hover:text-white transition">Menu & Customizer</Link></li>
              <li><Link href="/#capacity" className="hover:text-white transition">Live Daily Capacity</Link></li>
              <li><Link href="/my-orders" className="hover:text-white transition">Track & Manage Orders</Link></li>
              <li><Link href="/baker" className="hover:text-white transition">Baker Dashboard</Link></li>
            </ul>
          </div>

          {/* Bakery Rules */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Bakery Policies</h4>
            <ul className="space-y-2.5 text-xs text-[#C8BCB0]">
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#E6A15C] shrink-0" />
                48-hour minimum order lead time
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#E6A15C] shrink-0" />
                Free cancellation up to 24h before pickup
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#E6A15C] shrink-0" />
                Pickups strictly within scheduled 90m window
              </li>
            </ul>
          </div>

          {/* Pickup Location */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-4">Kitchen & Collection</h4>
            <div className="text-xs text-[#C8BCB0] space-y-2">
              <p className="font-semibold text-white">CakeCart Studio Atelier</p>
              <p>42 Artisans Alley, Bakery District</p>
              <p>Collection Hours: Wed - Sun, 10:00 - 18:00</p>
              <p className="text-[#8C7662] pt-2">Contact: hello@cakecart.local</p>
            </div>
          </div>

        </div>

        <div className="border-t border-[#443027] mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-[#8C7662]">
          <p>© {new Date().getFullYear()} CakeCart Micro-Bakery. Built for Vercel & Neon PostgreSQL.</p>
          <p className="flex items-center gap-1 mt-2 sm:mt-0">
            Crafted with <Heart className="w-3 h-3 text-[#C86236] fill-current" /> for cake lovers.
          </p>
        </div>
      </div>
    </footer>
  );
}
