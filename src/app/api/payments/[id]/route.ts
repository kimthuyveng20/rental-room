import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { payments } from '@/src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';

export async function PATCH(
  request: Request,
  { params }: { params: { id?: string; paymentId?: string } }
) {
  try {
    const body = await request.json();
    let { status } = body;

    // 💡 FIX 1: Robust fallback parsing to protect against undefined parameters
    const rawId = params.id || params.paymentId || request.url.split('/').pop()?.split('?')[0];
    const paymentId = rawId ? parseInt(rawId, 10) : NaN;

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: `Invalid payment URL ID parameter input: "${rawId}"` }, { status: 400 });
    }

    // 💡 FIX 2: Standardize the state string. If frontend sends 'completed', save it as 'paid'
    if (status === 'completed') {
      status = 'paid';
    }

    if (!['pending', 'paid', 'overdue'].includes(status)) {
      return NextResponse.json({ error: `Invalid status enumeration tag value: "${status}"` }, { status: 400 });
    }

    // 💡 FIX 3: Stamping date for 'paid'
    const paymentDate = status === 'paid' 
      ? format(new Date(), 'yyyy-MM-dd') 
      : null;

    const [updatedPayment] = await db
      .update(payments)
      .set({ 
        status, 
        paymentDate,
        updatedAt: new Date()
      })
      .where(eq(payments.id, paymentId))
      .returning();

    if (!updatedPayment) {
      return NextResponse.json({ error: `Payment entry record row #${paymentId} was not found.` }, { status: 404 });
    }

    return NextResponse.json(updatedPayment);
  } catch (error: any) {
    console.error("PAYMENT_UPDATE_ERROR_DETAILS:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Failed to update record" }, { status: 500 });
  }
}