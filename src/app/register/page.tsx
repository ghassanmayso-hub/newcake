"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Cake, Lock, Mail, User, Phone } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await register({ fullName, email, phone, password });
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Registration failed");
    } else {
      router.push("/menu");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white p-8 rounded-3xl border border-[#E8DFC8] shadow-lg space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#C86236] text-white flex items-center justify-center mx-auto mb-3 shadow-md shadow-[#C86236]/25">
            <Cake className="w-6 h-6" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-[#2D1E18]">Create CakeCart Account</h1>
          <p className="text-xs text-[#6B5A4E] mt-1">Book your custom artisanal creations</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18] block mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-[#8C7662] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF6F0] border border-[#E8DFC8] rounded-xl text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#C86236]"
              />
            </div>
          </div>

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
                placeholder="jane@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF6F0] border border-[#E8DFC8] rounded-xl text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#C86236]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18] block mb-1">
              Phone Number (For Collection SMS)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[#8C7662] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-10 pr-4 py-2.5 bg-[#FAF6F0] border border-[#E8DFC8] rounded-xl text-xs text-[#2D1E18] focus:outline-none focus:ring-2 focus:ring-[#C86236]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-[#2D1E18] block mb-1">
              Password (Min 6 Characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8C7662] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
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
            className="w-full py-3 bg-[#C86236] hover:bg-[#B35228] text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            {loading ? "Creating Account..." : "Register & Continue →"}
          </button>
        </form>

        <p className="text-center text-xs text-[#6B5A4E]">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-[#C86236] hover:underline">
            Sign In here
          </Link>
        </p>
      </div>
    </div>
  );
}
