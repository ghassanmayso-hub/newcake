"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice, formatDateLabel } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Calendar, Clock, ShoppingBag, ArrowRight } from "lucide-react";

export default function MyOrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadOrders();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-10 h-10 border-4 border-[#C86236] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h2 className="font-serif text-2xl font-bold text-[#2D1E18]">Sign in to view orders</h2>
        <p className="text-xs text-[#6B5A4E] mt-2">Log in with your CakeCart account to view your scheduled pickups.</p>
        <Link
          href="/login?redirect=/my-orders"
          className="mt-4 inline-block px-6 py-2.5 bg-[#C86236] text-white text-xs font-bold rounded-xl"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#C86236]">Customer Portal</span>
          <h1 className="font-serif text-3xl font-extrabold text-[#2D1E18] mt-1">My Cake Orders</h1>
        </div>
        <Link
          href="/menu"
          className="px-4 py-2 bg-[#C86236] text-white text-xs font-bold rounded-xl hover:bg-[#B35228] transition"
        >
          + Order New Cake
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-[#E8DFC8]">
          <ShoppingBag className="w-12 h-12 text-[#8C7662] mx-auto mb-3" />
          <h3 className="font-serif font-bold text-lg text-[#2D1E18]">No orders placed yet</h3>
          <p className="text-xs text-[#6B5A4E] mt-1">Your upcoming bakery creations and collection passes will appear here.</p>
          <Link
            href="/menu"
            className="mt-4 inline-block px-5 py-2.5 bg-[#2D1E18] text-white text-xs font-bold rounded-xl"
          >
            Browse Cake Menu
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((ord) => (
            <div
              key={ord.id}
              className="bg-white rounded-3xl p-6 border border-[#E8DFC8] shadow-sm hover:border-[#C86236]/40 transition flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="font-serif font-bold text-lg text-[#2D1E18]">
                    {ord.orderReference}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                      ord.status === "CONFIRMED"
                        ? "bg-emerald-100 text-emerald-800"
                        : ord.status === "READY"
                        ? "bg-blue-100 text-blue-800"
                        : ord.status === "CANCELLED"
                        ? "bg-rose-100 text-rose-800"
                        : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {ord.status}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-[#6B5A4E]">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-[#C86236]" />
                    Pickup: {formatDateLabel(ord.pickupDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-[#C86236]" />
                    Slot: {ord.slot ? `${ord.slot.startTime} - ${ord.slot.endTime}` : "Scheduled"}
                  </span>
                </div>

                <p className="text-xs text-[#8C7662]">
                  {ord.items?.map((i: any) => `${i.quantity}x ${i.productName}`).join(", ")}
                </p>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-[#E8DFC8]">
                <span className="font-serif font-bold text-base text-[#2D1E18]">
                  {formatPrice(ord.totalAmount)}
                </span>
                <Link
                  href={`/order-confirmation/${ord.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-[#C86236] hover:text-[#B35228]"
                >
                  View QR Pass & Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
