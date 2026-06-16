import { NextResponse } from 'next/server';
import { users } from '@/src/lib/db/schema';
import { eq, and, gt } from 'drizzle-orm';
import { getDb } from '@/src/lib/db';

export async function POST(req: Request) {
  try {
    const { email, code } = await req.json();

    if (!email || !code) {
      return NextResponse.json({ error: 'Missing email or verification code' }, { status: 400 });
    }

    const db = getDb();
    const cleanEmail = email.toLowerCase().trim();
    const cleanCode = code.trim();

    // 1. Look for a user where email matches, code matches, AND the expiration time is greater than right now
    const user = await db.query.users.findFirst({
      where: and(
        eq(users.email, cleanEmail),
        eq(users.verificationCode, cleanCode),
        gt(users.verificationExpires, new Date())
      ),
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code.' },
        { status: 400 }
      );
    }

    // 2. Clear the verification fields and set the emailVerified timestamp
    await db
      .update(users)
      .set({
        emailVerified: new Date(),
        verificationCode: null,     // Clean up code so it can't be reused
        verificationExpires: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return NextResponse.json(
      { success: true, message: 'Email verified successfully!' },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Verification API error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred during verification.' },
      { status: 500 }
    );
  }
}