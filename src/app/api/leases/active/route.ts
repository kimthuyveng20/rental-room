import { NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import {  rooms, properties, tenants } from '@/src/lib/db/schema';
import { and, } from 'drizzle-orm';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";

// --- GET: FETCH SECURITY-ISOLATED ACTIVE LEASES ---
export async function GET() {
  try {
    // 1. Authenticate user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = Number(session.user.id);
    const userRole = session.user.role;
    const db = getDb();

    let activeLeases: any[] = [];

    // 2. Apply multi-role data isolation logic
    if (userRole === 'admin') {
      // Admins fetch all active leases across the platform
      activeLeases = await db.query.leases.findMany({
        where: (leases, { eq }) => eq(leases.status, 'active'),
        with: {
          room: true,
          tenant: { with: { user: true } },
        },
        orderBy: (leases, { desc }) => [desc(leases.createdAt)],
      });

    } else if (userRole === 'owner') {
      // 🔒 Owner Isolation: Only fetch active leases for rooms belonging to properties owned by this user
      activeLeases = await db.query.leases.findMany({
        where: (lease, { eq, exists }) => and(
          eq(lease.status, 'active'),
          exists(
            db.select()
              .from(rooms)
              .innerJoin(properties, eq(rooms.propertyId, properties.id))
              .where(
                and(
                  eq(rooms.id, lease.roomId),
                  eq(properties.ownerId, currentUserId)
                )
              )
          )
        ),
        with: {
          room: true,
          tenant: { with: { user: true } },
        },
        orderBy: (leases, { desc }) => [desc(leases.createdAt)],
      });

    } else if (userRole === 'tenant') {
      // 🔒 Tenant Isolation: Tenants can strictly only view their own active lease agreement(s)
      activeLeases = await db.query.leases.findMany({
        where: (lease, { eq, exists }) => and(
          eq(lease.status, 'active'),
          exists(
            db.select()
              .from(tenants)
              .where(
                and(
                  eq(tenants.id, lease.tenantId),
                  eq(tenants.userId, currentUserId)
                )
              )
          )
        ),
        with: {
          room: true,
          tenant: { with: { user: true } },
        },
      });
    }

    return NextResponse.json(activeLeases);
  } catch (error) {
    console.error('FETCH_ACTIVE_LEASES_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch active leases' }, { status: 500 });
  }
}