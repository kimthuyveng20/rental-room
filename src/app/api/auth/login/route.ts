import { NextResponse } from "next/server";
import { SignJWT } from "jose"; // Using 'jose' which is standard and natively supported in Next.js edge runtimes
// import { db } from "@/src/lib/db"; // <- Import your Prisma or database reference here
// import bcrypt from "bcryptjs";    // My database uses bcrypt for passwords

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 });
    }

    // 1. LOOKUP THE USER IN YOUR DATABASE (Uncomment and update based on your database setup)
    // const user = await db.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    // if (!user) {
    //   return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    // }

    // 2. VERIFY PASSWORD MATCH (Uncomment and check against your encrypted database password)
    // const passwordMatch = await bcrypt.compare(password, user.password);
    // if (!passwordMatch) {
    //   return NextResponse.json({ message: "Invalid email or password" }, { status: 401 });
    // }

    // 3. GENERATE MOBILE AUTH TOKEN (Using your NextAuth secret)
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || "fallback_secret_key_32_chars_long!!");
    const token = await new SignJWT({ 
        userId: "mock_id_change_to_user_id", // user.id
        email: email, 
        role: "Owner" // user.role
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
        user: { email: email, name: "Property Manager" },
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
    return NextResponse.json({ message: "Internal Authentication Error" }, { status: 500 });
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