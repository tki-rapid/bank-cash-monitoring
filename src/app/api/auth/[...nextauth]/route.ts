import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authOptions } from "@/lib/google-auth";
import { googleAuthConfigured } from "@/lib/google-auth";

const unavailable = () => NextResponse.json({ error: "Google login is not configured. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and AUTH_SECRET." }, { status: 503 });
const handler = googleAuthConfigured() ? NextAuth(authOptions) : unavailable;

export { handler as GET, handler as POST };
