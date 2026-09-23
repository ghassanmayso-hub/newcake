"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Cake, Lock, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/menu";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await login(email, password);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Login failed");
    } else {
      router.push(redirect);
    }
  };

  const handleQuickFill = (role: "baker" | "customer") => {
    if (role === "baker") {
      setEmail("baker@cakecart.com");
      setPassword("baker123");
    } else {
      setEmail("alice@example.com");
      setPassword("customer123");
    }
  };

  return (
    <div className="bg-white p-8 rounded-3xl border border-[#E8DFC8] shadow-lg space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#C86236] text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-[#C86236]/25">
          <Cake className="w-6 h-6" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-[#2D1E18]">Sign in to CakeCart</h1>
        <p className="text-xs text-[#6B5A4E] mt-1">Manage scheduled collections & custom cake orders</p>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18] block mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#8C7662] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@domain.com"
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF6F0] border border-[#E8DFC8] rounded-xl text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#C86236]"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18] block mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#8C7662] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-[#FAF6F0] border border-[#E8DFC8] rounded-xl text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#C86236]"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-[#C86236] hover:bg-[#B35228] text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
        >
          {loading ? "Authenticating..." : "Sign In →"}
        </button>
      </form>

      {/* Quick Demo Credentials */}
      <div className="pt-4 border-t border-[#E8DFC8] space-y-2">
        <p className="text-[11px] font-bold text-[#8C7662] uppercase tracking-wider text-center">
          Demo 1-Click Credentials
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleQuickFill("baker")}
            className="p-2 rounded-xl bg-[#FAF6F0] border border-[#E8DFC8] text-[11px] font-bold text-[#2D1E18] hover:bg-[#EFE8DE] transition text-center"
          >
            Baker Login (Chef)
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill("customer")}
            className="p-2 rounded-xl bg-[#FAF6F0] border border-[#E8DFC8] text-[11px] font-bold text-[#2D1E18] hover:bg-[#EFE8DE] transition text-center"
          >
            Customer Login
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-[#6B5A4E]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-bold text-[#C86236] hover:underline">
          Register here
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <Suspense fallback={<div className="h-96 rounded-3xl bg-white border border-[#E8DFC8] animate-pulse" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
