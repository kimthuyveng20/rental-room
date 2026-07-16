import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { leases, rooms, properties, tenants, invoices, payments } from '@/src/lib/db/schema';
import { eq, and, exists, type InferSelectModel } from 'drizzle-orm';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import jwt, { JwtPayload } from "jsonwebtoken";
// Extract Drizzle schema row types to avoid implicit 'any[]' array assignment bugs
type RoomRecord = InferSelectModel<typeof rooms>;

interface CustomJwtPayload extends JwtPayload {
  id: number;
  role: string;
}

export async function GET(req: NextRequest) {
  try {
    let currentUserId: number;
    let userRole: string;

    // ==========================================
    // 1. Try NextAuth Session (Web clients)
    // ==========================================
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      currentUserId = Number(session.user.id);
      userRole = session.user.role;
    } else {
      // ==========================================
      // 2. Try JWT Token (Flutter mobile client)
      // ==========================================
      const authHeader = req.headers.get("authorization");

      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Unauthorized: Missing or invalid authorization scheme" },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);

      // Verify JWT using your env JWT_SECRET
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as CustomJwtPayload;

      // Force-cast payload.id to number to guarantee Drizzle operations don't crash
      currentUserId = Number(payload.id);
      userRole = payload.role;
    }

    const db = getDb();

    // Explicitly typed tracking storage boundaries
    let activeLeases: any[] = []; 
    let availableRooms: any[] = []; 
    let registeredTenants: any[] = [];

    // ==========================================
    // Admin Execution Branch
    // ==========================================
    if (userRole === 'admin') {
      // Admins pull clean global data feeds
      activeLeases = await db.query.leases.findMany({
        with: {
          room: true,
          tenant: { with: { user: true } }
        },
        orderBy: (leases, { desc }) => [desc(leases.createdAt)],
      });

      availableRooms = await db.query.rooms.findMany({
        where: (rooms, { eq }) => eq(rooms.status, 'available'),
      });

      registeredTenants = await db.query.tenants.findMany({
        with: { user: true }
      });
    } 
    // ==========================================
    // Owner Execution Branch
    // ==========================================
    else if (userRole === 'owner') {
      // 🔒 Owner Isolation: Only discover leases linked to rooms in properties they own
      activeLeases = await db.query.leases.findMany({
        where: (lease, { exists }) => exists(
          db.select()
            .from(rooms)
            .innerJoin(properties, eq(rooms.propertyId, properties.id))
            .where(
              and(
                eq(rooms.id, lease.roomId),
                eq(properties.ownerId, currentUserId)
              )
            )
        ),
        with: {
          room: true,
          tenant: { with: { user: true } }
        },
        orderBy: (leases, { desc }) => [desc(leases.createdAt)],
      });

      // 🔒 Owner Isolation: Only view vacant rooms from properties they own
      availableRooms = await db.query.rooms.findMany({
        where: (room, { exists }) => and(
          eq(room.status, 'available'),
          exists(
            db.select()
              .from(properties)
              .where(
                and(
                  eq(properties.id, room.propertyId),
                  eq(properties.ownerId, currentUserId)
                )
              )
          )
        )
      });

      // Owners can look up registered tenant pools to assign them new leases
      registeredTenants = await db.query.tenants.findMany({
        with: { user: true }
      });
    } 
    // ==========================================
    // Tenant Execution Branch
    // ==========================================
    else if (userRole === 'tenant') {
      // 🔒 Tenant Isolation: Can only discover their specific active contract profiles
      activeLeases = await db.query.leases.findMany({
        where: (lease, { exists }) => exists(
          db.select()
            .from(tenants)
            .where(
              and(
                eq(tenants.id, lease.tenantId),
                eq(tenants.userId, currentUserId)
              )
            )
        ),
        with: {
          room: true,
          tenant: { with: { user: true } }
        },
      });

      // Tenants don't need access to structural assignment parameters
      availableRooms = [];
      registeredTenants = [];
    }

    return NextResponse.json({
      leases: activeLeases,
      rooms: availableRooms,
      tenants: registeredTenants,
    });
  } catch (error) {
    console.error('FETCH_LEASES_PAGE_DATA_ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to balance page data metrics' }, 
      { status: 500 }
    );
  }
}

// --- POST: AUTHENTICATE AND AUTHORIZE NEW LEASES ---
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Tenant role guard block
    if (session.user.role === 'tenant') {
      return NextResponse.json({ error: 'Forbidden: Tenants cannot author leases' }, { status: 403 });
    }

    const currentUserId = Number(session.user.id);
    const db = getDb();
    const body = await req.json();
    const { roomId, tenantId, startDate, endDate, rentAmount, depositAmount } = body;

    // 🔒 Owner Guard: Check room binding rights prior to processing state transformations
    if (session.user.role === 'owner') {
      const targetRoomProperty = await db.query.rooms.findFirst({
        where: (rooms, { eq }) => eq(rooms.id, Number(roomId)),
        with: { property: true }
      });

      if (!targetRoomProperty || targetRoomProperty.property.ownerId !== currentUserId) {
        return NextResponse.json({ error: 'Forbidden: You do not own this property asset room.' }, { status: 403 });
      }
    }

    // Write primary contract ledger track record
    const [newLeaseRecord] = await db.insert(leases).values({
      roomId: Number(roomId),
      tenantId: Number(tenantId),
      startDate: new Date(startDate).toISOString().split('T')[0],
      endDate: new Date(endDate).toISOString().split('T')[0],
      monthlyRent: String(rentAmount),
      depositAmount: String(depositAmount),
      status: 'active',
    }).returning();

    // Automatically transition the room status flag to occupied
    await db
      .update(rooms)
      .set({ status: 'occupied' })
      .where(eq(rooms.id, Number(roomId)));

    // Return the deeply populated lease schema tree layout back to client components
    const detailedLease = await db.query.leases.findFirst({
      where: (leases, { eq }) => eq(leases.id, newLeaseRecord.id),
      with: {
        room: true,
        tenant: { with: { user: true } }
      }
    });

    return NextResponse.json(detailedLease, { status: 201 });
  } catch (error) {
    console.error('CREATE_LEASE_TRANSACTION_ERROR:', error);
    return NextResponse.json({ error: 'Failed to establish lease agreement' }, { status: 500 });
  }
}


export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'tenant') {
      return NextResponse.json(
        { error: 'Forbidden: Tenants cannot void agreements' },
        { status: 403 }
      );
    }

    const currentUserId = Number(session.user.id);
    const db = getDb();

    const { searchParams } = new URL(req.url);
    const leaseIdStr = searchParams.get('id');

    if (!leaseIdStr) {
      return NextResponse.json(
        { error: 'Missing lease identifier param' },
        { status: 400 }
      );
    }

    const leaseId = parseInt(leaseIdStr, 10);

    // Get lease with relations
    const targetLease = await db.query.leases.findFirst({
      where: (leases, { eq }) => eq(leases.id, leaseId),
      with: {
        room: {
          with: {
            property: true,
          },
        },
      },
    });

    if (!targetLease) {
      return NextResponse.json(
        { error: 'Lease agreement record not found' },
        { status: 404 }
      );
    }

    // Owner permission check
    if (
      session.user.role === 'owner' &&
      targetLease.room.property.ownerId !== currentUserId
    ) {
      return NextResponse.json(
        { error: 'Forbidden: You do not own the property tied to this lease.' },
        { status: 403 }
      );
    }

    await db.transaction(async (tx) => {
  // 1. release room first
  if (targetLease.roomId) {
    await tx
      .update(rooms)
      .set({ status: 'available' })
      .where(eq(rooms.id, targetLease.roomId));
  }

  // 2. delete payments FIRST (new blocker)
  await tx.delete(payments).where(eq(payments.leaseId, leaseId));

  // 3. delete invoices SECOND
  await tx.delete(invoices).where(eq(invoices.leaseId, leaseId));

  // 4. delete lease LAST
  await tx.delete(leases).where(eq(leases.id, leaseId));
});

    return NextResponse.json({
      success: true,
      message: 'Lease terminated, invoices removed, and room released',
    });
  } catch (error) {
    console.error('DELETE_LEASE_ROUTE_ERROR:', error);

    return NextResponse.json(
      { error: 'Failed to fully execute lease deletion sequence' },
      { status: 500 }
    );
  }
}