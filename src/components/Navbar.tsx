"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { ShoppingBag, User as UserIcon, Cake, LogOut, ShieldCheck, Sparkles } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { totalCakes } = useCart();

  return (
    <header className="sticky top-0 z-50 bg-[#FFFDF9]/90 backdrop-blur-md border-b border-[#E8DFC8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#C86236] to-[#E6A15C] flex items-center justify-center text-white shadow-md shadow-[#C86236]/20 transition-transform group-hover:scale-105">
              <Cake className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <span className="font-serif text-2xl font-bold tracking-tight text-[#2D1E18]">
                Cake<span className="text-[#C86236]">Cart</span>
              </span>
              <span className="block text-[10px] tracking-widest uppercase font-semibold text-[#8C7662]">
                Artisanal Micro-Bakery
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/menu"
              className="text-sm font-medium text-[#2D1E18] hover:text-[#C86236] transition-colors"
            >
              Cakes Menu
            </Link>
            <Link
              href="/#capacity"
              className="text-sm font-medium text-[#6B5A4E] hover:text-[#C86236] transition-colors flex items-center gap-1.5"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Daily Capacity
            </Link>
            <Link
              href="/#philosophy"
              className="text-sm font-medium text-[#6B5A4E] hover:text-[#C86236] transition-colors"
            >
              Our Craft
            </Link>
          </nav>

          {/* Actions & Account */}
          <div className="flex items-center gap-4">
            
            {/* Cart Icon */}
            <Link
              href="/cart"
              className="relative p-2.5 rounded-full text-[#2D1E18] hover:bg-[#F3EDE2] transition-colors"
              title="Cart"
            >
              <ShoppingBag className="w-5 h-5" />
              {totalCakes > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#C86236] text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                  {totalCakes}
                </span>
              )}
            </Link>

            {/* Auth Dropdown / Buttons */}
            {user ? (
              <div className="flex items-center gap-3">
                {user.role === "baker" ? (
                  <Link
                    href="/baker"
                    className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2D1E18] text-white text-xs font-semibold rounded-lg hover:bg-[#443027] transition"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#E6A15C]" />
                    Baker Studio
                  </Link>
                ) : (
                  <Link
                    href="/my-orders"
                    className="hidden sm:inline-flex text-xs font-semibold text-[#6B5A4E] hover:text-[#C86236] transition"
                  >
                    My Orders
                  </Link>
                )}

                <div className="flex items-center gap-2 pl-2 border-l border-[#E8DFC8]">
                  <span className="text-xs font-medium text-[#2D1E18] hidden lg:inline">
                    {user.fullName.split(" ")[0]}
                  </span>
                  <button
                    onClick={() => logout()}
                    className="p-2 text-[#8C7662] hover:text-red-600 transition"
                    title="Log Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="px-4 py-2 text-xs font-semibold text-[#2D1E18] hover:bg-[#F3EDE2] rounded-xl transition"
                >
                  Sign In
                </Link>
                <Link
                  href="/menu"
                  className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 bg-[#C86236] text-white text-xs font-semibold rounded-xl hover:bg-[#B35228] transition shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Order Fresh
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
