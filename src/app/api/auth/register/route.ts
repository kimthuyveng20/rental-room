import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/src/lib/db"; // Adjust this to your actual DB client export path
import { users } from "@/src/lib/db/schema";

export async function POST(req: Request) {
  try {
    const { email, password, fullName, role } = await req.json();

    // 1. Basic server-side validation
    if (!email || !password || !fullName || !role) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // 2. Normalize inputs
    const normalizedEmail = email.toLowerCase().trim();

    // 3. Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, normalizedEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // 4. Hash the password securely (12 salt rounds)
    const hashedPassword = await hash(password, 12);

    // 5. Insert user into the database
    await db.insert(users).values({
      email: normalizedEmail,
      name: fullName,
      passwordHash: hashedPassword,
      role: role, // 'owner', 'tenant', or 'admin'
    });

    return NextResponse.json(
      { message: "User registered successfully" },
      { status: 201 }
    );
  } catch (error) {
    console.error("REGISTRATION_ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong during registration" },
      { status: 500 }
    );
  }
}