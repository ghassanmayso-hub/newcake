"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatPrice, formatDateLabel } from "@/lib/utils";
import { Trash2, Plus, Minus, Calendar, Clock, AlertCircle, ShieldCheck, ArrowRight, Sparkles } from "lucide-react";

export default function CartAndCheckoutPage() {
  const router = useRouter();
  const { items, removeItem, updateQuantity, clearCart, subtotalCents, messageFeesCents, totalCents, totalCakes } = useCart();
  const { user } = useAuth();

  // Booking details
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlotId, setSelectedSlotId] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [customerNotes, setCustomerNotes] = useState<string>("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [capacityNotice, setCapacityNotice] = useState<string | null>(null);

  // Hold & Checkout state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeHold, setActiveHold] = useState<any | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600); // 10 minutes
  const [isPaying, setIsPaying] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Generate valid dates (Enforce minimum 48 hours lead time)
  const [dateOptions, setDateOptions] = useState<{ dateStr: string; label: string }[]>([]);

  useEffect(() => {
    const dates: { dateStr: string; label: string }[] = [];
    const now = new Date();
    // Start at least 2 days ahead (48 hours)
    for (let i = 2; i < 14; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      dates.push({
        dateStr,
        label: formatDateLabel(dateStr),
      });
    }
    setDateOptions(dates);
    if (dates.length > 0) {
      setSelectedDate(dates[0].dateStr);
    }
  }, []);

  // Fetch slots and capacity whenever date changes
  useEffect(() => {
    if (!selectedDate) return;
    async function fetchCapacityAndSlots() {
      setLoadingSlots(true);
      setCapacityNotice(null);
      setSelectedSlotId("");
      try {
        const res = await fetch(`/api/capacity?date=${selectedDate}`);
        const data = await res.json();
        
        if (data.capacity) {
          const remaining = data.capacity.maxCakes - data.capacity.reservedCakes;
          if (data.capacity.isClosed) {
            setCapacityNotice("Bakery is closed on this date.");
          } else if (remaining < totalCakes) {
            setCapacityNotice(`Only ${Math.max(0, remaining)} cake slots available for this day. (You have ${totalCakes} in cart)`);
          }
        }

        setAvailableSlots(data.slots || []);
        if (data.slots && data.slots.length > 0) {
          const available = data.slots.find((s: any) => s.remainingOrders > 0);
          if (available) setSelectedSlotId(available.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSlots(false);
      }
    }
    fetchCapacityAndSlots();
  }, [selectedDate, totalCakes]);

  // Hold Timer countdown
  useEffect(() => {
    if (!activeHold) return;

    const interval = setInterval(() => {
      const expires = new Date(activeHold.holdExpiresAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((expires - now) / 1000));
      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setActiveHold(null);
        setErrorMessage("Your 10-minute capacity reservation hold has expired. Please reserve again.");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeHold]);

  const handleCreateHold = async () => {
    setErrorMessage(null);

    if (!user) {
      router.push(`/login?redirect=/cart`);
      return;
    }

    if (!selectedDate || !selectedSlotId) {
      setErrorMessage("Please select a valid pickup date and available collection slot.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        pickupDate: selectedDate,
        pickupSlotId: selectedSlotId,
        customerNotes,
        items: items.map((it) => ({
          productId: it.productId,
          quantity: it.quantity,
          sizeOptionId: it.sizeOptionId,
          flavourOptionId: it.flavourOptionId,
          customMessage: it.customMessage,
          customerReferenceImageUrl: it.customerReferenceImageUrl,
        })),
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || "Failed to create reservation hold.");
        return;
      }

      setActiveHold(data);
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulatePayment = async (outcome: "success" | "failure") => {
    if (!activeHold) return;
    setIsPaying(true);
    setPaymentError(null);

    try {
      const idempotencyKey = `idemp_${activeHold.orderId}_${Date.now()}`;
      const res = await fetch("/api/orders/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeHold.orderId,
          idempotencyKey,
          simulateOutcome: outcome,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPaymentError(data.error || "Payment was declined.");
        return;
      }

      // Success! Clear cart and redirect to confirmation
      clearCart();
      router.push(`/order-confirmation/${activeHold.orderId}`);
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setIsPaying(false);
    }
  };

  if (items.length === 0 && !activeHold) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center">
        <div className="w-20 h-20 rounded-full bg-[#FAF6F0] border border-[#E8DFC8] flex items-center justify-center mx-auto mb-6 text-[#C86236]">
          <Calendar className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-3xl font-bold text-[#2D1E18]">Your Cart is Empty</h2>
        <p className="text-sm text-[#6B5A4E] mt-2 max-w-md mx-auto">
          Explore our small-batch freshly baked menu and personalize your cake size, flavour profile, and custom message inscription.
        </p>
        <Link
          href="/menu"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#C86236] text-white font-semibold text-xs rounded-xl shadow-md hover:bg-[#B35228] transition"
        >
          <span>Browse Cake Menu</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#2D1E18] mb-8">
        Review Order & Schedule Pickup
      </h1>

      {/* 10-Minute Hold Active Banner */}
      {activeHold && (
        <div className="mb-8 p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-mono font-bold text-lg shadow-sm">
              <Clock className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2D1E18] text-base">Capacity Temporarily Held</span>
                <span className="text-xs bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                  {formatTimer(secondsRemaining)} Remaining
                </span>
              </div>
              <p className="text-xs text-[#6B5A4E] mt-0.5">
                We have locked {totalCakes} cake capacity and your collection slot for Reference #{activeHold.orderReference}.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-800">Complete payment to finalize booking</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-8 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Cart Items & Booking Schedule */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Cart Items List */}
          <div className="bg-white rounded-3xl p-6 border border-[#E8DFC8] shadow-sm space-y-6">
            <h2 className="font-serif font-bold text-lg text-[#2D1E18] pb-3 border-b border-[#E8DFC8]">
              Your Handcrafted Cakes ({totalCakes})
            </h2>

            <div className="divide-y divide-[#E8DFC8]/60">
              {items.map((it) => (
                <div key={it.cartItemId} className="py-4 first:pt-0 last:pb-0 flex gap-4">
                  <img
                    src={it.imageUrl}
                    alt={it.productName}
                    className="w-20 h-20 rounded-2xl object-cover border border-[#E8DFC8] bg-stone-100 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <h3 className="font-serif font-bold text-base text-[#2D1E18] truncate">
                        {it.productName}
                      </h3>
                      <button
                        onClick={() => removeItem(it.cartItemId)}
                        className="text-[#8C7662] hover:text-red-600 transition p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Options Details */}
                    <div className="mt-1 space-y-0.5 text-xs text-[#6B5A4E]">
                      {it.sizeName && <p>• Size: <span className="font-medium text-[#2D1E18]">{it.sizeName}</span></p>}
                      {it.flavourName && <p>• Flavour: <span className="font-medium text-[#2D1E18]">{it.flavourName}</span></p>}
                      {it.customMessage && (
                        <p className="text-[#C86236] font-medium bg-[#FAF6F0] p-1.5 rounded-lg border border-[#E8DFC8] mt-1">
                          Inscription: &ldquo;{it.customMessage}&rdquo; (+{formatPrice(it.messageFee || 350)})
                        </p>
                      )}
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 border border-[#E8DFC8] rounded-xl px-2 py-1 bg-[#FAF6F0]">
                        <button
                          onClick={() => updateQuantity(it.cartItemId, -1)}
                          className="text-[#2D1E18] hover:text-[#C86236]"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-bold text-[#2D1E18] px-1">{it.quantity}</span>
                        <button
                          onClick={() => updateQuantity(it.cartItemId, 1)}
                          className="text-[#2D1E18] hover:text-[#C86236]"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="font-serif font-bold text-sm text-[#2D1E18]">
                        {formatPrice(
                          (it.basePrice + (it.sizePriceModifier || 0) + (it.flavourPriceModifier || 0) + (it.customMessage ? (it.messageFee || 350) : 0)) * it.quantity
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Pickup: Date & Slot Picker */}
          {!activeHold && (
            <div className="bg-white rounded-3xl p-6 border border-[#E8DFC8] shadow-sm space-y-6">
              <div>
                <h2 className="font-serif font-bold text-lg text-[#2D1E18]">
                  Schedule Collection Window
                </h2>
                <p className="text-xs text-[#6B5A4E] mt-1">
                  Enforces 48-hour minimum artisanal lead time. Select date & available 90m slot.
                </p>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18] block">
                  Select Pickup Date
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {dateOptions.map((opt) => (
                    <button
                      key={opt.dateStr}
                      type="button"
                      onClick={() => setSelectedDate(opt.dateStr)}
                      className={`p-3 rounded-2xl text-xs font-bold border text-left transition ${
                        selectedDate === opt.dateStr
                          ? "bg-[#2D1E18] text-white border-[#2D1E18]"
                          : "bg-[#FAF6F0] text-[#2D1E18] border-[#E8DFC8] hover:border-[#C86236]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {capacityNotice && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-semibold text-amber-800">
                  {capacityNotice}
                </div>
              )}

              {/* Slot Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18] block">
                  Select 90-Minute Pickup Window
                </label>
                {loadingSlots ? (
                  <p className="text-xs text-[#8C7662]">Checking slot capacity...</p>
                ) : availableSlots.length === 0 ? (
                  <p className="text-xs text-rose-600">No pickup slots configured for this date.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableSlots.map((slot) => {
                      const isFull = slot.remainingOrders <= 0;
                      const isSelected = selectedSlotId === slot.id;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isFull}
                          onClick={() => setSelectedSlotId(slot.id)}
                          className={`p-3 rounded-2xl text-left border text-xs font-semibold transition flex items-center justify-between ${
                            isFull
                              ? "bg-stone-100 text-stone-400 border-stone-200 cursor-not-allowed"
                              : isSelected
                              ? "bg-[#C86236] text-white border-[#C86236]"
                              : "bg-[#FAF6F0] text-[#2D1E18] border-[#E8DFC8] hover:border-[#C86236]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5" />
                            {slot.startTime} - {slot.endTime}
                          </span>
                          <span className={`text-[10px] ${isSelected ? "text-white/80" : "text-[#8C7662]"}`}>
                            {isFull ? "Full" : `${slot.remainingOrders} left`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Special Instructions */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18] block">
                  Kitchen Notes or Allergies (Optional)
                </label>
                <textarea
                  rows={2}
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  placeholder="e.g. Please pack in extra insulation box, pickup will be by courier."
                  className="w-full px-4 py-2.5 bg-[#FAF6F0] border border-[#E8DFC8] rounded-2xl text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#C86236]"
                />
              </div>

            </div>
          )}

        </div>

        {/* Right Column: Cost Breakdown & Checkout Action */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#E8DFC8] shadow-sm space-y-6 sticky top-28">
            <h2 className="font-serif font-bold text-lg text-[#2D1E18] pb-3 border-b border-[#E8DFC8]">
              Order Summary
            </h2>

            <div className="space-y-2 text-xs text-[#6B5A4E]">
              <div className="flex justify-between">
                <span>Cakes Subtotal ({totalCakes} items)</span>
                <span className="font-semibold text-[#2D1E18]">{formatPrice(subtotalCents)}</span>
              </div>
              {messageFeesCents > 0 && (
                <div className="flex justify-between">
                  <span>Custom Inscription Fees</span>
                  <span className="font-semibold text-[#2D1E18]">+{formatPrice(messageFeesCents)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Scheduled Kitchen Pickup</span>
                <span className="text-emerald-700 font-bold uppercase text-[11px]">Free Atelier Pickup</span>
              </div>
              <div className="pt-3 border-t border-[#E8DFC8] flex justify-between items-baseline">
                <span className="font-serif font-bold text-base text-[#2D1E18]">Final Total</span>
                <span className="font-serif font-extrabold text-2xl text-[#C86236]">
                  {formatPrice(totalCents)}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            {!activeHold ? (
              <button
                type="button"
                onClick={handleCreateHold}
                disabled={isSubmitting || !selectedSlotId || !!capacityNotice}
                className="w-full py-4 bg-[#C86236] hover:bg-[#B35228] disabled:bg-stone-300 disabled:cursor-not-allowed text-white font-bold text-sm rounded-2xl shadow-lg shadow-[#C86236]/25 transition flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  "Holding Oven Capacity..."
                ) : (
                  <>
                    <span>Hold Slot & Proceed to Pay</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3 pt-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#2D1E18]">
                  Test Payment Mode (Stripe Sandbox)
                </p>

                {paymentError && (
                  <p className="text-xs text-rose-600 font-medium">{paymentError}</p>
                )}

                <button
                  type="button"
                  onClick={() => handleSimulatePayment("success")}
                  disabled={isPaying}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-2xl shadow-md transition flex items-center justify-center gap-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  {isPaying ? "Processing Payment..." : `Simulate Card Success (${formatPrice(totalCents)})`}
                </button>

                <button
                  type="button"
                  onClick={() => handleSimulatePayment("failure")}
                  disabled={isPaying}
                  className="w-full py-2.5 bg-stone-100 hover:bg-rose-50 hover:text-rose-700 text-stone-600 font-semibold text-xs rounded-xl border border-stone-200 transition"
                >
                  Simulate Declined Card (Test Retry)
                </button>
              </div>
            )}

            <div className="text-[11px] text-[#8C7662] space-y-1.5 border-t border-[#E8DFC8]/60 pt-4">
              <p className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Holds capacity exclusively for 10 minutes.
              </p>
              <p className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Free cancellation up to 24 hours prior to pickup.
              </p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
