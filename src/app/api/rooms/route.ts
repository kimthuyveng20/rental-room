import { NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { rooms } from '@/src/lib/db/schema';
import { eq } from 'drizzle-orm';


// GET: Fetch real synchronized rooms matching schema specifications
export async function GET() {
  try {
    const db = getDb();
    const roomsList = await db.query.rooms.findMany({
      with: {
        property: true,
        leases: {
          where: (leases, { eq }) => eq(leases.status, 'active'),
          with: {
            tenant: {
              with: {
                user: true,
              },
            },
          },
        },
      },
      orderBy: (rooms, { asc }) => [asc(rooms.roomNumber)],
    });

    const propertiesList = await db.query.properties.findMany({
      columns: {
        id: true,
        name: true,
      },
    });

    return NextResponse.json({ rooms: roomsList, properties: propertiesList });
  } catch (error) {
    console.error('FETCH_ROOMS_SCHEMA_ERROR:', error);
    return NextResponse.json({ error: 'Failed to synchronize rental inventory records' }, { status: 500 });
  }
}

// POST: Add room safely using your exact database column keys
export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { propertyId, roomNumber, type, capacity, pricePerMonth, status, amenities } = body;

    const [insertedRoom] = await db.insert(rooms).values({
      propertyId: parseInt(propertyId, 10),
      roomNumber: roomNumber.trim(),
      type: type, // Aligns with your custom roomTypeEnum
      capacity: parseInt(capacity, 10),
      pricePerMonth: parseFloat(pricePerMonth).toFixed(2), // Matches decimal precision requirements
      status: status || 'available', // Safely sets your roomStatusEnum configuration
      amenities: amenities || [],
    }).returning();

    return NextResponse.json(insertedRoom, { status: 201 });
  } catch (error) {
    console.error('CREATE_ROOM_SCHEMA_ERROR:', error);
    return NextResponse.json({ error: 'Failed to register the unit. Check database enum configurations.' }, { status: 500 });
  }
}

// DELETE: Discard a specific room ledger using URL params id matching frontend structure
export async function DELETE(req: Request) {
  try {
    const db = getDb();
    
    // Parse target id from URL parameters
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');

    if (!idParam) {
      return NextResponse.json(
        { error: 'Bad Request: Missing unique room identifier parameter.' }, 
        { status: 400 }
      );
    }

    const roomId = parseInt(idParam, 10);
    if (isNaN(roomId)) {
      return NextResponse.json(
        { error: 'Bad Request: Invalid roomId parameter formatting.' }, 
        { status: 400 }
      );
    }

    // Execute deletion sequence targeting the matching column key identifier
    const [deletedRoom] = await db
      .delete(rooms)
      .where(eq(rooms.id, roomId))
      .returning();

    if (!deletedRoom) {
      return NextResponse.json(
        { error: 'Target room not found or already deleted from database storage.' }, 
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, discardedUnit: deletedRoom });
  } catch (error: any) {
    console.error('DELETE_ROOM_SCHEMA_ERROR:', error);

    // Provide friendly error response if structural relations (foreign key constraints) block deletion
    if (error.message?.toLowerCase().includes('foreign key constraint')) {
      return NextResponse.json(
        { error: 'Cannot remove this room configuration because it has active data entries or leases bound to it.' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to discard resource from database storage.' }, 
      { status: 500 }
    );
  }
}