import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "CakeCart | Artisanal Small-Batch Home Bakery",
  description:
    "Order exquisite small-batch artisan cakes with custom sizes, flavours, personalized piped inscriptions, and guaranteed fresh daily pickup slots.",
  keywords: ["artisan bakery", "custom cake order", "eggless cakes", "gluten-free cakes", "fresh pickup cakes"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-[#FFFDF9] text-[#2D1E18] min-h-screen flex flex-col antialiased selection:bg-[#C86236]/20 selection:text-[#2D1E18]">
        <AuthProvider>
          <CartProvider>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
