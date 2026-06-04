import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { payments } from '@/src/lib/db/schema';
import { desc } from 'drizzle-orm';

export async function GET() {
  try {
    // Queries payments ledger sorted dynamically by latest arrivals
    const data = await db.query.payments.findMany({
      orderBy: [desc(payments.createdAt)],
      with: {
        lease: {
          with: {
            room: true,
            tenant: {
              with: {
                user: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("BACKEND_PAYMENT_FETCH_CRASH:", error);
    return NextResponse.json({ error: "Failed to read database records asset loops" }, { status: 500 });
  }
}