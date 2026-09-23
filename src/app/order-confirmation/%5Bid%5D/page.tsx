"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatPrice, formatDateLabel } from "@/lib/utils";
import { CheckCircle2, Clock, MapPin, Calendar, ArrowRight, Printer, AlertTriangle } from "lucide-react";

export default function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.order) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const handleCancelOrder = async () => {
    if (!confirm("Are you sure you want to cancel this order? This will release your capacity slot.")) return;

    setCancelling(true);
    setCancelMessage(null);
    try {
      const res = await fetch(`/api/orders/${id}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Customer requested cancellation via portal" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCancelMessage(data.error || "Failed to cancel order.");
      } else {
        await fetchOrder();
      }
    } catch (err: any) {
      setCancelMessage(err.message);
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#C86236] border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#8C7662]">Retrieving your confirmation pass...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center">
        <h2 className="font-serif text-2xl font-bold">Order Not Found</h2>
        <p className="text-xs text-[#8C7662] mt-2">Could not retrieve order details or access is restricted.</p>
        <Link href="/my-orders" className="mt-4 inline-block text-xs font-bold text-[#C86236]">
          View My Orders →
        </Link>
      </div>
    );
  }

  // Check 24 hour cut-off
  const now = new Date();
  const pickupDate = new Date(`${order.pickupDate}T10:00:00Z`);
  const hoursLeft = (pickupDate.getTime() - now.getTime()) / (1000 * 60 * 60);
  const canCancel = hoursLeft >= 24 && (order.status === "CONFIRMED" || order.status === "PENDING");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">Confirmed & Scheduled</span>;
      case "BAKING":
        return <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">In Oven / Baking</span>;
      case "READY":
        return <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded-full">Ready for Collection</span>;
      case "COLLECTED":
        return <span className="px-3 py-1 bg-stone-100 text-stone-700 text-xs font-bold rounded-full">Collected ✓</span>;
      case "CANCELLED":
        return <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-bold rounded-full">Cancelled & Refunded</span>;
      default:
        return <span className="px-3 py-1 bg-stone-100 text-stone-800 text-xs font-bold rounded-full">{status}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Top Banner */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
        </div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#C86236]">Reservation Confirmed</span>
        <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#2D1E18] mt-1">
          Thank you, {order.customer?.fullName || "Valued Customer"}!
        </h1>
        <p className="text-sm text-[#6B5A4E] mt-2">
          Your oven capacity slot is officially locked. Present your digital collection pass upon arrival.
        </p>
      </div>

      {cancelMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {cancelMessage}
        </div>
      )}

      {/* Main Confirmation Pass Card */}
      <div className="bg-white rounded-3xl border border-[#E8DFC8] shadow-lg overflow-hidden">
        
        {/* Header Ribbon */}
        <div className="bg-[#2D1E18] text-[#F3EDE2] p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[11px] uppercase tracking-widest text-[#E6A15C] font-bold">
              Order Reference
            </span>
            <h2 className="font-serif text-2xl font-bold tracking-tight text-white mt-0.5">
              {order.orderReference}
            </h2>
          </div>
          <div>{getStatusBadge(order.status)}</div>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* Details */}
          <div className="md:col-span-7 space-y-6">
            
            <div className="grid grid-cols-2 gap-4 bg-[#FAF6F0] p-4 rounded-2xl border border-[#E8DFC8]">
              <div>
                <p className="text-[11px] font-bold uppercase text-[#8C7662]">Pickup Date</p>
                <p className="font-serif font-bold text-sm text-[#2D1E18] mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-[#C86236]" />
                  {formatDateLabel(order.pickupDate)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase text-[#8C7662]">Pickup Time Window</p>
                <p className="font-serif font-bold text-sm text-[#2D1E18] mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#C86236]" />
                  {order.slot ? `${order.slot.startTime} - ${order.slot.endTime}` : "Scheduled"}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-serif font-bold text-base text-[#2D1E18] mb-3">Order Items</h3>
              <div className="space-y-3">
                {order.items?.map((it: any) => (
                  <div key={it.id} className="text-xs border-b border-[#E8DFC8]/60 pb-3 last:border-b-0">
                    <div className="flex justify-between font-semibold text-[#2D1E18]">
                      <span>{it.quantity}x {it.productName}</span>
                      <span>{formatPrice(it.subtotal + (it.customisation?.messageFee || 0))}</span>
                    </div>
                    {it.customisation && (
                      <div className="text-[11px] text-[#8C7662] mt-1 space-y-0.5">
                        {it.customisation.sizeName && <p>• Size: {it.customisation.sizeName}</p>}
                        {it.customisation.flavourName && <p>• Flavour: {it.customisation.flavourName}</p>}
                        {it.customisation.customMessage && (
                          <p className="text-[#C86236] font-medium">
                            • Inscription: &ldquo;{it.customisation.customMessage}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-between items-center text-sm font-bold border-t border-[#E8DFC8]">
              <span className="text-[#6B5A4E]">Total Paid:</span>
              <span className="text-lg font-serif text-[#C86236]">{formatPrice(order.totalAmount)}</span>
            </div>

          </div>

          {/* QR Code Pass */}
          <div className="md:col-span-5 flex flex-col items-center justify-center p-6 bg-[#FAF6F0] rounded-3xl border border-[#E8DFC8] text-center">
            {order.qrCode && (
              <img
                src={order.qrCode}
                alt="Collection QR Code"
                className="w-48 h-48 rounded-2xl shadow-sm border-2 border-white bg-white p-2"
              />
            )}
            <p className="font-mono text-xs font-bold text-[#2D1E18] mt-3">
              {order.orderReference}
            </p>
            <p className="text-[11px] text-[#8C7662] mt-1">
              Scan at the studio counter for contactless handoff.
            </p>
          </div>

        </div>

        {/* Cancellation Section */}
        <div className="bg-[#FAF6F0] p-6 border-t border-[#E8DFC8] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-[#6B5A4E]">
            <p className="font-semibold text-[#2D1E18]">Need to make changes?</p>
            <p>Orders can be cancelled with full automatic refund up to 24h prior to collection.</p>
          </div>

          {canCancel ? (
            <button
              onClick={handleCancelOrder}
              disabled={cancelling}
              className="px-4 py-2 border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl transition"
            >
              {cancelling ? "Processing Cancellation..." : "Cancel Order & Refund"}
            </button>
          ) : order.status === "CANCELLED" ? (
            <span className="text-xs font-bold text-rose-700">Order is cancelled</span>
          ) : (
            <span className="text-xs text-[#8C7662] italic flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Inside 24h baking window (non-cancellable)
            </span>
          )}
        </div>

      </div>

      <div className="mt-8 flex justify-center gap-4">
        <Link
          href="/my-orders"
          className="px-6 py-3 bg-[#2D1E18] text-white text-xs font-bold rounded-xl hover:bg-[#443027] transition"
        >
          View All Orders
        </Link>
        <Link
          href="/menu"
          className="px-6 py-3 bg-white border border-[#E8DFC8] text-[#2D1E18] text-xs font-bold rounded-xl hover:bg-[#FAF6F0] transition"
        >
          Back to Menu
        </Link>
      </div>

    </div>
  );
}
