"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  cartItemId: string;
  productId: string;
  productName: string;
  basePrice: number;
  imageUrl: string;
  quantity: number;
  sizeOptionId?: string;
  sizeName?: string;
  sizePriceModifier?: number;
  flavourOptionId?: string;
  flavourName?: string;
  flavourPriceModifier?: number;
  customMessage?: string;
  messageFee?: number;
  customerReferenceImageUrl?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "cartItemId">) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  clearCart: () => void;
  totalCakes: number;
  subtotalCents: number;
  messageFeesCents: number;
  totalCents: number;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cakecart_items");
      if (saved) setItems(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("cakecart_items", JSON.stringify(items));
    } catch {}
  }, [items]);

  const addItem = (newItem: Omit<CartItem, "cartItemId">) => {
    const id = `${newItem.productId}-${newItem.sizeOptionId || ""}-${newItem.flavourOptionId || ""}-${Date.now()}`;
    setItems((prev) => [...prev, { ...newItem, cartItemId: id }]);
  };

  const removeItem = (cartItemId: string) => {
    setItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((i) => {
          if (i.cartItemId === cartItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => setItems([]);

  const totalCakes = items.reduce((acc, i) => acc + i.quantity, 0);

  const subtotalCents = items.reduce((acc, i) => {
    const unit = i.basePrice + (i.sizePriceModifier || 0) + (i.flavourPriceModifier || 0);
    return acc + unit * i.quantity;
  }, 0);

  const messageFeesCents = items.reduce((acc, i) => {
    if (i.customMessage && i.customMessage.trim().length > 0) {
      return acc + (i.messageFee || 350) * i.quantity;
    }
    return acc;
  }, 0);

  const totalCents = subtotalCents + messageFeesCents;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCakes,
        subtotalCents,
        messageFeesCents,
        totalCents,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
