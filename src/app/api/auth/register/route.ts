import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { eq } from "drizzle-orm";
import { users } from "@/src/lib/db/schema";
import { getDb } from "@/src/lib/db";
import { EmailService } from "@/src/lib/services/email.service";


export async function POST(req: Request) {
  try {
    const db = getDb();
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

    // 5. Generate custom 6-digit verification code and 15-minute expiration window
    const verificationCode = EmailService.generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 Minutes from now

    // 6. Insert user into the database with verification markers
    await db.insert(users).values({
      email: normalizedEmail,
      name: fullName,
      passwordHash: hashedPassword,
      role: role, // 'owner', 'tenant', or 'admin'
      verificationCode: verificationCode,
      verificationExpires: verificationExpires,
      emailVerified: null, // Stays null until they verify via your code validation endpoint
    });

    // 7. Fire the SMTP transactional mail with the code
    await EmailService.sendVerificationCode(normalizedEmail, verificationCode, fullName);

    return NextResponse.json(
      { message: "User registered successfully. Verification email sent." },
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