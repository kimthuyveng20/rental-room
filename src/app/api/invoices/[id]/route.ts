import { NextResponse } from 'next/server';
import {  getDb } from '@/src/lib/db';
import { invoices, payments } from '@/src/lib/db/schema';
import { eq } from 'drizzle-orm';
import { format } from 'date-fns';

type RouteParams = {
  params: Promise<{ id?: string; invoiceId?: string }>;
};

export async function PATCH(
  req: Request,
  { params }: RouteParams // Applied here
) {
  try {
    const db = getDb();
    const { status } = await req.json();
    const resolvedParams = await params;
    const rawId = resolvedParams.id || resolvedParams.invoiceId || req.url.split('/').pop()?.split('?')[0];
    const invoiceId = rawId ? parseInt(rawId, 10) : NaN;

    if (isNaN(invoiceId)) {
      return NextResponse.json({ 
        error: `Invalid URL Parameter parsing state. Received raw input: "${rawId}"` 
      }, { status: 400 });
    }

    if (!status || !['pending', 'paid', 'overdue'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status validation tag.' }, { status: 400 });
    }

    // Now execute your transaction safely
    const result = await db.transaction(async (tx) => {
      const [updatedInvoice] = await tx
        .update(invoices)
        .set({ 
          status: status,
          updatedAt: new Date()
        })
        .where(eq(invoices.id, invoiceId))
        .returning();

      if (!updatedInvoice) {
        throw new Error(`Target invoice record row #${invoiceId} not found.`);
      }

      if (status === 'paid') {
        await tx.insert(payments).values({
          leaseId: updatedInvoice.leaseId,
          amount: updatedInvoice.grandTotal,
          dueDate: updatedInvoice.dueDate,
          paymentDate: format(new Date(), 'yyyy-MM-dd'),
          status: 'paid', 
          paymentMethod: 'Invoice Status Sync',
        });
      }

      return updatedInvoice;
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('INVOICE_PATCH_FAULT:', error);
    return NextResponse.json({ error: error?.message || 'Failed to update fields.' }, { status: 500 });
  }
}