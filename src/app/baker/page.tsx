"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, formatDateLabel } from "@/lib/utils";
import { Calendar, Clock, CheckCircle, ChefHat, Eye, Settings, ShieldAlert, Sparkles, AlertCircle } from "lucide-react";

export default function BakerDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  
  const [capacities, setCapacities] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [capacityInput, setCapacityInput] = useState<number>(10);
  const [isClosedInput, setIsClosedInput] = useState<boolean>(false);

  const loadData = async (date?: string) => {
    setLoading(true);
    try {
      const targetDate = date || selectedDate;
      const res = await fetch(`/api/baker?date=${targetDate}`);
      if (res.status === 403 || res.status === 401) {
        router.push("/login?redirect=/baker");
        return;
      }
      const data = await res.json();
      setCapacities(data.capacities || []);
      setOrders(data.orders || []);

      const currentCap = data.capacities?.find((c: any) => c.bakeryDate === targetDate);
      if (currentCap) {
        setCapacityInput(currentCap.maxCakes);
        setIsClosedInput(currentCap.isClosed);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && (!user || user.role !== "baker")) {
      router.push("/login?redirect=/baker");
    } else if (user && user.role === "baker") {
      loadData();
    }
  }, [user, authLoading]);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setUpdating(true);
    try {
      const res = await fetch("/api/baker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_order_status",
          orderId,
          newStatus,
        }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch("/api/baker", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_daily_capacity",
          date: selectedDate,
          maxCakes: capacityInput,
          isClosed: isClosedInput,
        }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (authLoading || (!user && loading)) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-12 h-12 border-4 border-[#C86236] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentCap = capacities.find((c: any) => c.bakeryDate === selectedDate);
  const remaining = currentCap ? Math.max(0, currentCap.maxCakes - currentCap.reservedCakes) : 10;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-[#E8DFC8]">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#C86236]">
            <ChefHat className="w-4 h-4" />
            Kitchen Command Center
          </div>
          <h1 className="font-serif text-3xl font-extrabold text-[#2D1E18] mt-1">Baker Production Studio</h1>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase text-[#8C7662]">Pickup Day:</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              loadData(e.target.value);
            }}
            className="px-4 py-2 bg-[#FAF6F0] border border-[#E8DFC8] rounded-xl text-xs font-bold text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#C86236]"
          />
        </div>
      </div>

      {/* Capacity & Blackout Control Box */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Metric 1: Capacity Meter */}
        <div className="bg-white p-6 rounded-3xl border border-[#E8DFC8] space-y-2">
          <span className="text-xs font-bold uppercase text-[#8C7662]">Oven Capacity for {formatDateLabel(selectedDate)}</span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-extrabold text-[#2D1E18]">
              {currentCap ? currentCap.reservedCakes : 0} / {currentCap ? currentCap.maxCakes : 10}
            </span>
            <span className="text-xs font-semibold text-[#8C7662]">Cakes Booked</span>
          </div>
          <p className="text-xs text-emerald-700 font-medium">
            {currentCap?.isClosed ? "Status: CLOSED for baking" : `${remaining} slots remaining for customers`}
          </p>
        </div>

        {/* Metric 2: Today's Orders */}
        <div className="bg-white p-6 rounded-3xl border border-[#E8DFC8] space-y-2">
          <span className="text-xs font-bold uppercase text-[#8C7662]">Scheduled Pickups</span>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-3xl font-extrabold text-[#C86236]">
              {orders.length}
            </span>
            <span className="text-xs font-semibold text-[#8C7662]">Total Orders</span>
          </div>
          <p className="text-xs text-[#8C7662]">
            Confirmed & active orders ready for prep
          </p>
        </div>

        {/* Capacity Manager Form */}
        <form
          onSubmit={handleUpdateCapacity}
          className="bg-[#FAF6F0] p-6 rounded-3xl border border-[#E8DFC8] space-y-3"
        >
          <span className="text-xs font-bold uppercase text-[#2D1E18] flex items-center gap-1.5">
            <Settings className="w-3.5 h-3.5 text-[#C86236]" />
            Override Limit / Close Date
          </span>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="text-[10px] uppercase font-bold text-[#8C7662] block mb-1">Max Cakes</label>
              <input
                type="number"
                min={0}
                max={50}
                value={capacityInput}
                onChange={(e) => setCapacityInput(Number(e.target.value))}
                className="w-full px-3 py-1.5 bg-white border border-[#E8DFC8] rounded-xl text-xs font-bold text-[#2D1E18]"
              />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <input
                type="checkbox"
                id="isClosed"
                checked={isClosedInput}
                onChange={(e) => setIsClosedInput(e.target.checked)}
                className="w-4 h-4 accent-[#C86236] rounded"
              />
              <label htmlFor="isClosed" className="text-xs font-bold text-rose-700 cursor-pointer">
                Close Date
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={updating}
            className="w-full py-2 bg-[#2D1E18] hover:bg-[#443027] text-white text-xs font-bold rounded-xl transition"
          >
            {updating ? "Saving..." : "Save Settings"}
          </button>
        </form>

      </div>

      {/* Orders Table & Status Stepper */}
      <div className="bg-white rounded-3xl border border-[#E8DFC8] p-6 space-y-6">
        <h2 className="font-serif font-bold text-xl text-[#2D1E18]">
          Kitchen Production List ({orders.length})
        </h2>

        {orders.length === 0 ? (
          <div className="text-center py-12 text-[#8C7662] text-xs">
            No orders scheduled for {formatDateLabel(selectedDate)}.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((ord) => (
              <div
                key={ord.id}
                className="p-5 rounded-2xl bg-[#FAF6F0] border border-[#E8DFC8] space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-[#E8DFC8]">
                  <div>
                    <span className="font-mono text-xs font-bold text-[#C86236]">
                      {ord.orderReference}
                    </span>
                    <span className="text-xs font-bold text-[#2D1E18] ml-3">
                      Customer: {ord.customer?.fullName} ({ord.customer?.phone || ord.customer?.email})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#8C7662]">
                      Slot: {ord.slot ? `${ord.slot.startTime} - ${ord.slot.endTime}` : "N/A"}
                    </span>
                    <span className="px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-[#2D1E18] text-white">
                      {ord.status}
                    </span>
                  </div>
                </div>

                {/* Items & Custom Inscriptions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    {ord.items?.map((it: any) => (
                      <div key={it.id} className="text-xs bg-white p-3 rounded-xl border border-[#E8DFC8]">
                        <p className="font-bold text-[#2D1E18]">
                          {it.quantity}x {it.productName}
                        </p>
                        {it.customisation && (
                          <div className="text-[11px] text-[#6B5A4E] mt-1 space-y-0.5">
                            {it.customisation.sizeName && <p>Size: {it.customisation.sizeName}</p>}
                            {it.customisation.flavourName && <p>Flavour: {it.customisation.flavourName}</p>}
                            {it.customisation.customMessage && (
                              <p className="text-[#C86236] font-bold p-1 bg-amber-50 rounded border border-amber-200 mt-1">
                                Piped Script: &ldquo;{it.customisation.customMessage}&rdquo;
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Baker Status Workflow Action Buttons */}
                  <div className="flex flex-col justify-center gap-2 bg-white p-4 rounded-xl border border-[#E8DFC8]">
                    <span className="text-[10px] uppercase font-bold text-[#8C7662]">
                      Advance Order Status
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => handleStatusChange(ord.id, "BAKING")}
                        disabled={updating || ord.status === "BAKING"}
                        className={`py-2 px-3 text-xs font-bold rounded-xl transition ${
                          ord.status === "BAKING"
                            ? "bg-amber-500 text-white"
                            : "bg-stone-100 hover:bg-amber-100 text-stone-700"
                        }`}
                      >
                        BAKING
                      </button>
                      <button
                        onClick={() => handleStatusChange(ord.id, "READY")}
                        disabled={updating || ord.status === "READY"}
                        className={`py-2 px-3 text-xs font-bold rounded-xl transition ${
                          ord.status === "READY"
                            ? "bg-blue-600 text-white"
                            : "bg-stone-100 hover:bg-blue-100 text-stone-700"
                        }`}
                      >
                        READY
                      </button>
                      <button
                        onClick={() => handleStatusChange(ord.id, "COLLECTED")}
                        disabled={updating || ord.status === "COLLECTED"}
                        className={`py-2 px-3 text-xs font-bold rounded-xl transition ${
                          ord.status === "COLLECTED"
                            ? "bg-emerald-600 text-white"
                            : "bg-stone-100 hover:bg-emerald-100 text-stone-700"
                        }`}
                      >
                        COLLECTED
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
