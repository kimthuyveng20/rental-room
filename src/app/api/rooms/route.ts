import { NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { rooms, properties, leases, tenants } from '@/src/lib/db/schema';
import { eq, and, exists, type InferSelectModel } from 'drizzle-orm';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";

// Extract base model shapes to explicitly type tracking arrays and eliminate implicit 'any[]' compile faults
type PropertySummary = { id: number; name: string };

// --- GET: FETCH SECURITY-ISOLATED RENTAL INVENTORY ---
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = Number(session.user.id);
    const userRole = session.user.role;
    const db = getDb();

    let roomsList: any[] = [];
    let propertiesList: PropertySummary[] = [];

    // Apply isolation boundaries across structural execution logic
    if (userRole === 'admin') {
      roomsList = await db.query.rooms.findMany({
        with: {
          property: true,
          leases: {
            where: (leases, { eq }) => eq(leases.status, 'active'),
            with: { tenant: { with: { user: true } } },
          },
        },
        orderBy: (rooms, { asc }) => [asc(rooms.roomNumber)],
      });

      propertiesList = await db.query.properties.findMany({
        columns: { id: true, name: true },
      });

    } else if (userRole === 'owner') {
      // 🔒 Owner Isolation: Only fetch room listings built inside properties they own
      roomsList = await db.query.rooms.findMany({
        where: (room, { exists }) => exists(
          db.select()
            .from(properties)
            .where(
              and(
                eq(properties.id, room.propertyId),
                eq(properties.ownerId, currentUserId)
              )
            )
        ),
        with: {
          property: true,
          leases: {
            where: (leases, { eq }) => eq(leases.status, 'active'),
            with: { tenant: { with: { user: true } } },
          },
        },
        orderBy: (rooms, { asc }) => [asc(rooms.roomNumber)],
      });

      // 🔒 Owner Isolation: Only provide choice dropdowns for properties they manage
      propertiesList = await db.query.properties.findMany({
        where: (property, { eq }) => eq(property.ownerId, currentUserId),
        columns: { id: true, name: true },
      });

    } else if (userRole === 'tenant') {
      // 🔒 Tenant Isolation: Only allow a tenant to see details of the room they are currently leasing
      roomsList = await db.query.rooms.findMany({
        where: (room, { exists }) => exists(
          db.select()
            .from(leases)
            .innerJoin(tenants, eq(leases.tenantId, tenants.id))
            .where(
              and(
                eq(leases.roomId, room.id),
                eq(leases.status, 'active'),
                eq(tenants.userId, currentUserId)
              )
            )
        ),
        with: {
          property: true,
          leases: {
            where: (leases, { eq }) => eq(leases.status, 'active'),
            with: { tenant: { with: { user: true } } },
          },
        },
        orderBy: (rooms, { asc }) => [asc(rooms.roomNumber)],
      });

      propertiesList = []; // Tenants don't have access to create dropdown context lists
    }

    return NextResponse.json({ rooms: roomsList, properties: propertiesList });
  } catch (error) {
    console.error('FETCH_ROOMS_SCHEMA_ERROR:', error);
    return NextResponse.json({ error: 'Failed to synchronize rental inventory records' }, { status: 500 });
  }
}

// --- POST: INJECT ROOM SAFELY ENFORCING PROPERTY WRITING RIGHTS ---
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'tenant') {
      return NextResponse.json({ error: 'Forbidden: Tenants cannot allocate units' }, { status: 403 });
    }

    const currentUserId = Number(session.user.id);
    const db = getDb();
    const body = await req.json();
    const { propertyId, roomNumber, type, capacity, pricePerMonth, status, amenities } = body;

    // 🔒 Owner Guard: Ensure property belongs to them before injecting a room into it
    if (session.user.role === 'owner') {
      const targetProperty = await db.query.properties.findFirst({
        where: (properties, { eq }) => eq(properties.id, parseInt(propertyId, 10)),
      });

      if (!targetProperty || targetProperty.ownerId !== currentUserId) {
        return NextResponse.json({ error: 'Forbidden: Asset ownership verification failed.' }, { status: 403 });
      }
    }

    const [insertedRoom] = await db.insert(rooms).values({
      propertyId: parseInt(propertyId, 10),
      roomNumber: roomNumber.trim(),
      type: type, 
      capacity: parseInt(capacity, 10),
      pricePerMonth: parseFloat(pricePerMonth).toFixed(2), 
      status: status || 'available', 
      amenities: amenities || [],
    }).returning();

    return NextResponse.json(insertedRoom, { status: 201 });
  } catch (error) {
    console.error('CREATE_ROOM_SCHEMA_ERROR:', error);
    return NextResponse.json({ error: 'Failed to register the unit. Check database enum configurations.' }, { status: 500 });
  }
}

// --- DELETE: REMOVE ROOM ENSURING MANAGEMENT OWNERSHIP ---
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'tenant') {
      return NextResponse.json({ error: 'Forbidden: Tenants cannot drop units' }, { status: 403 });
    }

    const currentUserId = Number(session.user.id);
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json({ error: 'Bad Request: Missing unique room identifier parameter.' }, { status: 400 });
    }

    const roomId = parseInt(idParam, 10);
    if (isNaN(roomId)) {
      return NextResponse.json({ error: 'Bad Request: Invalid roomId parameter formatting.' }, { status: 400 });
    }

    // Trace parental scope records to look up underlying property properties
    const targetRoom = await db.query.rooms.findFirst({
      where: (rooms, { eq }) => eq(rooms.id, roomId),
      with: { property: true }
    });

    if (!targetRoom) {
      return NextResponse.json({ error: 'Target room not found or already deleted from database storage.' }, { status: 404 });
    }

    // 🔒 Owner Guard: Check room parent property handling rights
    if (session.user.role === 'owner' && targetRoom.property.ownerId !== currentUserId) {
      return NextResponse.json({ error: 'Forbidden: Unauthorized management request boundary.' }, { status: 403 });
    }

    const [deletedRoom] = await db
      .delete(rooms)
      .where(eq(rooms.id, roomId))
      .returning();

    return NextResponse.json({ success: true, discardedUnit: deletedRoom });
  } catch (error: any) {
    console.error('DELETE_ROOM_SCHEMA_ERROR:', error);

    if (error.message?.toLowerCase().includes('foreign key constraint') || error.code === '23503') {
      return NextResponse.json(
        { error: 'Cannot remove this room configuration because it has active data entries or leases bound to it.' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'Failed to discard resource from database storage.' }, { status: 500 });
  }
}