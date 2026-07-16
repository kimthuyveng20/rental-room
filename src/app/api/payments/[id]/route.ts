import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { payments, leases, rooms, properties } from '@/src/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { format } from 'date-fns';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import jwt, { JwtPayload } from 'jsonwebtoken';

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
    let currentUserId: number;
    let currentUserRole: string | undefined;

    // 1. Attempt NextAuth Session (Cookie-based / Web clients)
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      currentUserId = Number(session.user.id);
      currentUserRole = session.user.role;
    } else {
      // 2. Fallback to Authorization Header (JWT-based / Mobile clients)
      const authHeader = request.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
          { success: false, message: "Unauthorized: Missing or invalid token format" },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);

      try {
        const payload = jwt.verify(
          token,
          process.env.JWT_SECRET!
        ) as JwtPayload;

        if (!payload || !payload.id) {
          return NextResponse.json(
            { success: false, message: "Unauthorized: Invalid token payload" },
            { status: 401 }
          );
        }

        currentUserId = Number(payload.id);
        currentUserRole = payload.role; // Extract role from your manual JWT payload
      } catch (jwtError) {
        return NextResponse.json(
          { success: false, message: "Unauthorized: Token verification failed or expired" },
          { status: 401 }
        );
      }
    }

    // 🔒 Tenant Guard: Tenants cannot mutate transactional ledgers
    if (currentUserRole === 'tenant') {
      return NextResponse.json(
        { error: 'Forbidden: Tenants cannot authorize status transitions' }, 
        { status: 403 }
      );
    }

    const db = getDb();
    const body = await request.json();
    let { status } = body;

    // 3. Await Next.js dynamic path parameters
    const resolvedParams = await context.params;
    const rawId = resolvedParams.id || request.url.split('/').pop()?.split('?')[0];
    const paymentId = rawId ? parseInt(rawId, 10) : NaN;

    if (isNaN(paymentId)) {
      return NextResponse.json(
        { error: `Invalid payment URL ID parameter input: "${rawId}"` }, 
        { status: 400 }
      );
    }

    // 4. Fetch existing ledger item to evaluate scope permissions
    const existingPayment = await db.query.payments.findFirst({
      where: (payments, { eq }) => eq(payments.id, paymentId),
      with: {
        lease: {
          with: { room: true }
        }
      }
    });

    if (!existingPayment) {
      return NextResponse.json(
        { error: `Payment entry record row #${paymentId} was not found.` }, 
        { status: 404 }
      );
    }

    // 🔒 Owner Guard: Verify ownership of property holding the room asset tied to this lease
    if (currentUserRole === 'owner') {
      const targetProperty = await db.query.properties.findFirst({
        where: (properties, { eq }) => eq(properties.id, existingPayment.lease.room.propertyId)
      });

      if (!targetProperty || targetProperty.ownerId !== currentUserId) {
        return NextResponse.json(
          { error: 'Forbidden: Unauthorized adjustment attempt for this asset ledger line item' }, 
          { status: 403 }
        );
      }
    }

    // 5. Standardize the state metrics strings
    if (status === 'completed') {
      status = 'paid';
    }

    if (!['pending', 'paid', 'overdue'].includes(status)) {
      return NextResponse.json(
        { error: `Invalid status enumeration tag value: "${status}"` }, 
        { status: 400 }
      );
    }

    // 6. Build localized time stamps 
    const paymentDate = status === 'paid' 
      ? format(new Date(), 'yyyy-MM-dd') 
      : null;

    // 7. Persist status change transformations
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
    return NextResponse.json(
      { error: error?.message || "Failed to update record" }, 
      { status: 500 }
    );
  }
}