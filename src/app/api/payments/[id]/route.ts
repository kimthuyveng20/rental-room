import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { payments, leases, rooms, properties } from '@/src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { format } from 'date-fns';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";

type RouteContext = {
  params: Promise<{
    id: string; 
  }>;
};

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // 1. Authenticate user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 🔒 Tenant Guard: Tenants cannot mutate transactional ledgers
    if (session.user.role === 'tenant') {
      return NextResponse.json({ error: 'Forbidden: Tenants cannot authorize status transitions' }, { status: 403 });
    }

    const currentUserId = Number(session.user.id);
    const userRole = session.user.role;
    const db = getDb();
    
    const body = await request.json();
    let { status } = body;

    // 2. Await Next.js dynamic path parameters
    const resolvedParams = await context.params;
    const rawId = resolvedParams.id || request.url.split('/').pop()?.split('?')[0];
    const paymentId = rawId ? parseInt(rawId, 10) : NaN;

    if (isNaN(paymentId)) {
      return NextResponse.json({ error: `Invalid payment URL ID parameter input: "${rawId}"` }, { status: 400 });
    }

    // 3. Fetch existing ledger item to evaluate scope permissions
    const existingPayment = await db.query.payments.findFirst({
      where: (payments, { eq }) => eq(payments.id, paymentId),
      with: {
        lease: {
          with: { room: true }
        }
      }
    });

    if (!existingPayment) {
      return NextResponse.json({ error: `Payment entry record row #${paymentId} was not found.` }, { status: 404 });
    }

    // 🔒 Owner Guard: Verify ownership of property holding the room asset tied to this lease
    if (userRole === 'owner') {
      const targetProperty = await db.query.properties.findFirst({
        where: (properties, { eq }) => eq(properties.id, existingPayment.lease.room.propertyId)
      });

      if (!targetProperty || targetProperty.ownerId !== currentUserId) {
        return NextResponse.json({ error: 'Forbidden: Unauthorized adjustment attempt for this asset ledger line item' }, { status: 403 });
      }
    }

    // 4. Standardize the state metrics strings
    if (status === 'completed') {
      status = 'paid';
    }

    if (!['pending', 'paid', 'overdue'].includes(status)) {
      return NextResponse.json({ error: `Invalid status enumeration tag value: "${status}"` }, { status: 400 });
    }

    // 5. Build localized time stamps 
    const paymentDate = status === 'paid' 
      ? format(new Date(), 'yyyy-MM-dd') 
      : null;

    // 6. Persist status change transformations
    const [updatedPayment] = await db
      .update(payments)
      .set({ 
        status, 
        paymentDate,
        updatedAt: new Date()
      })
      .where(eq(payments.id, paymentId))
      .returning();

    return NextResponse.json(updatedPayment);
  } catch (error: any) {
    console.error("PAYMENT_UPDATE_ERROR_DETAILS:", error?.message || error);
    return NextResponse.json({ error: error?.message || "Failed to update record" }, { status: 500 });
  }
}