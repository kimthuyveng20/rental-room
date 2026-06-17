import { NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { payments, leases, rooms, properties, tenants } from '@/src/lib/db/schema';
import { eq, and, exists, desc } from 'drizzle-orm';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";

// --- GET: FETCH SECURITY-ISOLATED PAYMENT TRANSACTIONS LEDGER ---
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = Number(session.user.id);
    const userRole = session.user.role;
    const db = getDb();

    let data: any[] = [];

    // Apply isolation boundaries at query level depending on access tier
    if (userRole === 'admin') {
      data = await db.query.payments.findMany({
        orderBy: [desc(payments.createdAt)],
        with: {
          lease: {
            with: {
              room: true,
              tenant: { with: { user: true } },
            },
          },
        },
      });

    } else if (userRole === 'owner') {
      // 🔒 Owner Isolation: Only fetch payment records belonging to rooms inside their property assets
      data = await db.query.payments.findMany({
        where: (payment, { exists }) => exists(
          db.select()
            .from(leases)
            .innerJoin(rooms, eq(leases.roomId, rooms.id))
            .innerJoin(properties, eq(rooms.propertyId, properties.id))
            .where(
              and(
                eq(leases.id, payment.leaseId),
                eq(properties.ownerId, currentUserId)
              )
            )
        ),
        orderBy: [desc(payments.createdAt)],
        with: {
          lease: {
            with: {
              room: true,
              tenant: { with: { user: true } },
            },
          },
        },
      });

    } else if (userRole === 'tenant') {
      // 🔒 Tenant Isolation: A tenant can only see payment histories linked directly to their personal profile
      data = await db.query.payments.findMany({
        where: (payment, { exists }) => exists(
          db.select()
            .from(tenants)
            .where(
              and(
                eq(tenants.id, payment.tenantId),
                eq(tenants.userId, currentUserId)
              )
            )
        ),
        orderBy: [desc(payments.createdAt)],
        with: {
          lease: {
            with: {
              room: true,
              tenant: { with: { user: true } },
            },
          },
        },
      });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("BACKEND_PAYMENT_FETCH_CRASH:", error);
    return NextResponse.json({ error: "Failed to read database records asset loops" }, { status: 500 });
  }
}