"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { useCart } from "@/context/CartContext";
import { Sparkles, Clock, Check, UploadCloud, ShoppingBag, ArrowLeft, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function CakeDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const router = useRouter();
  const { addItem } = useCart();

  const [cake, setCake] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSizeId, setSelectedSizeId] = useState<string>("");
  const [selectedFlavourId, setSelectedFlavourId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addedNotice, setAddedNotice] = useState(false);

  useEffect(() => {
    async function loadCake() {
      try {
        const res = await fetch(`/api/products/${slug}`);
        const data = await res.json();
        if (data.product) {
          setCake(data.product);
          // Default selections
          const defSize = data.product.sizes?.find((s: any) => s.isDefault) || data.product.sizes?.[0];
          const defFlavour = data.product.flavours?.find((f: any) => f.isDefault) || data.product.flavours?.[0];
          if (defSize) setSelectedSizeId(defSize.id);
          if (defFlavour) setSelectedFlavourId(defFlavour.id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadCake();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-20 flex justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-[#C86236] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!cake) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <h2 className="font-serif text-2xl font-bold">Cake Not Found</h2>
        <Link href="/menu" className="mt-4 inline-block text-xs font-bold text-[#C86236]">
          ← Back to Cake Menu
        </Link>
      </div>
    );
  }

  const selectedSize = cake.sizes?.find((s: any) => s.id === selectedSizeId);
  const selectedFlavour = cake.flavours?.find((f: any) => f.id === selectedFlavourId);

  // Live price calculation
  const sizePrice = selectedSize ? selectedSize.priceModifier : 0;
  const flavourPrice = selectedFlavour ? selectedFlavour.priceModifier : 0;
  const hasMessage = customMessage.trim().length > 0;
  const messageFee = hasMessage ? cake.messageFee : 0;
  const unitPrice = cake.basePrice + sizePrice + flavourPrice;
  const totalPrice = unitPrice + messageFee;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setReferenceImageUrl(data.url);
      }
    } catch (err) {
      console.error("Upload error", err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAddToCart = () => {
    addItem({
      productId: cake.id,
      productName: cake.name,
      basePrice: cake.basePrice,
      imageUrl: cake.imageUrl,
      quantity: 1,
      sizeOptionId: selectedSize?.id,
      sizeName: selectedSize?.name,
      sizePriceModifier: sizePrice,
      flavourOptionId: selectedFlavour?.id,
      flavourName: selectedFlavour?.name,
      flavourPriceModifier: flavourPrice,
      customMessage: customMessage.trim() || undefined,
      messageFee: messageFee,
      customerReferenceImageUrl: referenceImageUrl || undefined,
    });

    setAddedNotice(true);
    setTimeout(() => {
      router.push("/cart");
    }, 600);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Back button */}
      <Link
        href="/menu"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8C7662] hover:text-[#2D1E18] mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Menu
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Cake Imagery & Details */}
        <div className="lg:col-span-6 space-y-6">
          <div className="relative rounded-3xl overflow-hidden border-2 border-white shadow-xl aspect-square bg-stone-100">
            <img
              src={cake.imageUrl}
              alt={cake.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="px-3 py-1 bg-white/95 backdrop-blur-md rounded-xl text-xs font-bold text-[#2D1E18] shadow-sm">
                48h Minimum Lead Time
              </span>
            </div>
          </div>

          <div className="bg-[#FAF6F0] p-6 rounded-3xl border border-[#E8DFC8] space-y-3">
            <h4 className="font-serif font-bold text-base text-[#2D1E18] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#C86236]" />
              Artisanal Studio Standards
            </h4>
            <p className="text-xs text-[#6B5A4E] leading-relaxed">
              Every component is crafted in-house using organic stone-ground flours, European butter, and Belgian chocolate. Cancellations accepted up to 24 hours prior to scheduled collection.
            </p>
          </div>
        </div>

        {/* Right Column: Customization Studio */}
        <div className="lg:col-span-6 space-y-8">
          <div>
            <div className="flex flex-wrap gap-2 mb-2">
              {cake.dietaryTags?.map((d: any) => (
                <span
                  key={d.id}
                  className="px-2.5 py-0.5 bg-stone-100 text-[#2D1E18] text-[11px] font-bold rounded-lg border border-stone-200"
                >
                  {d.name}
                </span>
              ))}
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl font-extrabold text-[#2D1E18]">
              {cake.name}
            </h1>
            <p className="text-sm text-[#6B5A4E] mt-3 leading-relaxed">
              {cake.description}
            </p>
          </div>

          {/* 1. Size Selector */}
          {cake.sizes?.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18] block">
                1. Select Size & Portions
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cake.sizes.map((s: any) => {
                  const isSelected = selectedSizeId === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSizeId(s.id)}
                      className={`p-4 rounded-2xl text-left border transition ${
                        isSelected
                          ? "border-[#C86236] bg-[#FAF6F0] ring-2 ring-[#C86236]/20"
                          : "border-[#E8DFC8] bg-white hover:border-[#C86236]/50"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-semibold text-sm text-[#2D1E18]">{s.name}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#C86236]" />}
                      </div>
                      <span className="text-xs text-[#8C7662] mt-1 block">
                        {s.priceModifier > 0 ? `+${formatPrice(s.priceModifier)}` : "Base size included"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 2. Flavour Selector */}
          {cake.flavours?.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18] block">
                2. Select Flavour Profile
              </label>
              <div className="space-y-2">
                {cake.flavours.map((f: any) => {
                  const isSelected = selectedFlavourId === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFlavourId(f.id)}
                      className={`w-full p-4 rounded-2xl text-left border transition flex items-center justify-between ${
                        isSelected
                          ? "border-[#C86236] bg-[#FAF6F0] ring-2 ring-[#C86236]/20"
                          : "border-[#E8DFC8] bg-white hover:border-[#C86236]/50"
                      }`}
                    >
                      <div>
                        <span className="font-semibold text-sm text-[#2D1E18]">{f.name}</span>
                        {f.priceModifier > 0 && (
                          <span className="text-xs text-[#8C7662] ml-2">
                            (+{formatPrice(f.priceModifier)})
                          </span>
                        )}
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#C86236]" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Custom Piped Message (40-char limit enforced) */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18]">
                3. Custom Piped Inscription (+{formatPrice(cake.messageFee)})
              </label>
              <span
                className={`text-xs font-semibold ${
                  customMessage.length > 35 ? "text-amber-600 font-bold" : "text-[#8C7662]"
                }`}
              >
                {customMessage.length}/40 characters
              </span>
            </div>
            <div className="relative">
              <input
                type="text"
                maxLength={40}
                placeholder="e.g. Happy 30th Birthday Sophia! ✨"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF6F0] border border-[#E8DFC8] rounded-2xl text-sm text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#C86236]"
              />
            </div>
            <p className="text-[11px] text-[#8C7662]">
              Hand-piped in dark ganache or royal icing. Maximum 40 characters limit enforced.
            </p>
          </div>

          {/* 4. Customer Reference Image Upload */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18] block">
              4. Reference Photo for Baker (Optional)
            </label>
            <div className="border border-dashed border-[#D9CEBF] rounded-2xl p-4 bg-[#FAF6F0] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UploadCloud className="w-5 h-5 text-[#8C7662]" />
                <span className="text-xs text-[#6B5A4E]">
                  {referenceImageUrl ? "Reference photo attached ✓" : "Upload design or colour palette inspiration"}
                </span>
              </div>
              <label className="px-3.5 py-1.5 bg-white border border-[#E8DFC8] text-[#2D1E18] text-xs font-semibold rounded-xl hover:bg-[#F3EDE2] cursor-pointer transition">
                {uploadingImage ? "Uploading..." : referenceImageUrl ? "Change" : "Browse"}
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Pricing Summary & Action */}
          <div className="pt-6 border-t border-[#E8DFC8] space-y-4">
            <div className="space-y-1.5 text-xs text-[#6B5A4E]">
              <div className="flex justify-between">
                <span>Base Cake</span>
                <span>{formatPrice(cake.basePrice)}</span>
              </div>
              {sizePrice > 0 && (
                <div className="flex justify-between">
                  <span>Size Upgrade ({selectedSize?.name})</span>
                  <span>+{formatPrice(sizePrice)}</span>
                </div>
              )}
              {flavourPrice > 0 && (
                <div className="flex justify-between">
                  <span>Flavour Modifier ({selectedFlavour?.name})</span>
                  <span>+{formatPrice(flavourPrice)}</span>
                </div>
              )}
              {hasMessage && (
                <div className="flex justify-between text-[#C86236] font-semibold">
                  <span>Piped Message Fee</span>
                  <span>+{formatPrice(cake.messageFee)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-serif font-bold text-[#2D1E18] pt-2 border-t border-[#E8DFC8]">
                <span>Total Item Price</span>
                <span className="text-xl text-[#C86236]">{formatPrice(totalPrice)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddToCart}
              className={`w-full py-4 rounded-2xl font-bold text-sm shadow-md transition flex items-center justify-center gap-2 ${
                addedNotice
                  ? "bg-emerald-600 text-white"
                  : "bg-[#C86236] hover:bg-[#B35228] text-white shadow-[#C86236]/25"
              }`}
            >
              {addedNotice ? (
                <>
                  <Check className="w-5 h-5" />
                  Added! Heading to Cart...
                </>
              ) : (
                <>
                  <ShoppingBag className="w-5 h-5" />
                  Add to Cart • {formatPrice(totalPrice)}
                </>
              )}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
