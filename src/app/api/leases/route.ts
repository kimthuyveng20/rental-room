import { rooms } from '@/src/lib/db/schema'; // Ensure this is imported at the top of route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { leases } from '@/src/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    // 1. Fetch current leases with their related room and user data
    const db = getDb();
    const activeLeases = await db.query.leases.findMany({
      with: {
        room: true,
        tenant: {
          with: { user: true }
        }
      },
      orderBy: (leases, { desc }) => [desc(leases.createdAt)],
    });

    // 2. Fetch unlinked/available rooms for new assignments
    const availableRooms = await db.query.rooms.findMany({
      where: (rooms, { eq }) => eq(rooms.status, 'available'),
    });

    // 3. Fetch tenants
    const registeredTenants = await db.query.tenants.findMany({
      with: { user: true }
    });

    return NextResponse.json({
      leases: activeLeases,
      rooms: availableRooms,
      tenants: registeredTenants,
    });
  } catch (error) {
    console.error('FETCH_LEASES_PAGE_DATA_ERROR:', error);
    return NextResponse.json({ error: 'Failed to balance page data metrics' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { roomId, tenantId, startDate, endDate, rentAmount, depositAmount } = body;

    // 1. Write the new lease record into the database using financial scale translations
    const [newLeaseRecord] = await db.insert(leases).values({
      roomId: Number(roomId),
      tenantId: Number(tenantId),
      startDate: new Date(startDate).toISOString().split('T')[0],
      endDate: new Date(endDate).toISOString().split('T')[0],
      monthlyRent: String(rentAmount),
      depositAmount: String(depositAmount),
      status: 'active',
    }).returning();

    // 2. Automatically transition the room status flag to occupied
    await db
      .update(rooms)
      .set({ status: 'occupied' })
      .where(eq(rooms.id, Number(roomId)));

    // 3. Return the fully resolved lease record including related models
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
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const leaseIdStr = searchParams.get('id');

    if (!leaseIdStr) {
      return NextResponse.json({ error: 'Missing lease identifier param' }, { status: 400 });
    }

    const leaseId = parseInt(leaseIdStr, 10);

    // 1. Discover the targeted lease record to find out which room it occupies
    const targetLease = await db.query.leases.findFirst({
      where: (leases, { eq }) => eq(leases.id, leaseId),
    });

    if (!targetLease) {
      return NextResponse.json({ error: 'Lease agreement record not found' }, { status: 404 });
    }

    // 2. Perform a safe multi-step operation inside a database transaction block
    await db.transaction(async (tx) => {
      // Step A: Revert the room status flag back to available
      if (targetLease.roomId) {
        await tx
          .update(rooms)
          .set({ status: 'available' })
          .where(eq(rooms.id, targetLease.roomId));
      }

      // Step B: Permanently delete the primary lease row ledger log
      await tx.delete(leases).where(eq(leases.id, leaseId));
    });

    return NextResponse.json({ success: true, message: 'Lease agreement successfully terminated and room released' });
  } catch (error) {
    console.error('DELETE_LEASE_ROUTE_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fully execute lease deletion sequence' }, { status: 500 });
  }
}