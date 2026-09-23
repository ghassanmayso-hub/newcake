import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ user: null });
  }
  return NextResponse.json({ user });
}

export async function POST() {
  // Logout
  const res = NextResponse.json({ success: true });
  res.cookies.set("cakecart_session", "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
  });
  return res;
}
