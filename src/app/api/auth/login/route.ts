import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { getDb } from "@/src/lib/db";
import { users } from "@/src/lib/db/schema";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    // Validate request body
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required" }, 
        { status: 400 }
      );
    }

    // 1. LOOKUP THE USER IN YOUR DATABASE (Drizzle ORM)
    const normalizedEmail = email.toLowerCase().trim();
    const db = getDb();
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { message: "Invalid email or password" }, 
        { status: 401 }
      );
    }

    // 2. VERIFY PASSWORD MATCH
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { message: "Invalid email or password" }, 
        { status: 401 }
      );
    }

    // 3. GENERATE MOBILE AUTH TOKEN (Using your NextAuth secret)
    const secret = new TextEncoder().encode(
      process.env.NEXTAUTH_SECRET || "fallback_secret_key_32_chars_long!!"
    );
    
    const token = await new SignJWT({ 
        userId: user.id.toString(), // Converting serial ID number to string if needed by client
        email: user.email, 
        role: user.role 
      })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("30d") // Valid for 30 days on mobile device
      .sign(secret);

    // 4. RETURN RELEVANT RESPONSE WITH EXPLICIT CORS HEADERS
    return NextResponse.json(
      {
        success: true,
        token: token,
        user: { 
          id: user.id, // Dynamically returning the serial ID from the DB
          email: user.email, 
          name: user.name,
          role: user.role
        },
      },
      {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      }
    );
  } catch (error) {
    console.error("API Login Error:", error);
    return NextResponse.json(
      { message: "Internal Authentication Error" }, 
      { status: 500 }
    );
  }
}

// Pre-flight setup to support global mobile access requests without browser pre-flight blocks
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}