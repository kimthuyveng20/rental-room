import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/src/lib/db';
import { invoices, paymentTransactions } from '@/src/lib/db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      transactionRef,
      qrReference,
      status,
      amount,
    } = body;

    const db = getDb();

    // 1. Find transaction
    const [transaction] = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.qrReference, qrReference));

    if (!transaction) {
      return NextResponse.json(
        { message: 'Transaction not found' },
        { status: 404 }
      );
    }

    // 2. If paid → update everything
    if (status === 'SUCCESS' || status === 'PAID') {
      // update transaction
      await db
        .update(paymentTransactions)
        .set({
          status: 'paid',
          transactionRef,
          paidAt: new Date(),
        })
        .where(eq(paymentTransactions.id, transaction.id));

      // update invoice
      await db
        .update(invoices)
        .set({
          status: 'paid',
          paidAt: new Date(),
        })
        .where(eq(invoices.id, transaction.invoiceId));
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('ABA webhook error:', err);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}