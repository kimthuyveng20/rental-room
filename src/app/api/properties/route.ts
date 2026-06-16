import { NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { S3Service } from '@/src/lib/services/s3.service';
import { properties, rooms, leases, tenants } from '@/src/lib/db/schema';
import { eq, and, exists, InferSelectModel } from 'drizzle-orm';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";

// --- GET: FETCH SECURITY-ISOLATED PROPERTIES WITH PRESIGNED S3 URLS ---

// 1. Define the basic structural model type for properties and rooms
type PropertyBase = InferSelectModel<typeof properties>;
type RoomBase = InferSelectModel<typeof rooms>;

// 2. Combine them into an explicit type that matches your query's ".findMany({ with: { rooms: true } })"
type PropertyWithRooms = PropertyBase & {
  rooms: RoomBase[];
};

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = Number(session.user.id);
    const userRole = session.user.role;
    const db = getDb();

   let dbProperties: PropertyWithRooms[] = [];

    if (userRole === 'admin') {
      dbProperties = await db.query.properties.findMany({
        with: { rooms: true },
        orderBy: (properties, { desc }) => [desc(properties.createdAt)],
      });

    } else if (userRole === 'owner') {
      // 🔒 Owner Isolation: Only fetch properties belonging to this specific owner
      dbProperties = await db.query.properties.findMany({
        where: (property, { eq }) => eq(property.ownerId, currentUserId),
        with: { rooms: true },
        orderBy: (properties, { desc }) => [desc(properties.createdAt)],
      });

    } else if (userRole === 'tenant') {
      // 🔒 Tenant Isolation: Only fetch properties hosting a room currently under active lease by this user
      dbProperties = await db.query.properties.findMany({
        where: (property, { exists }) => exists(
          db.select()
            .from(rooms)
            .innerJoin(leases, eq(rooms.id, leases.roomId))
            .innerJoin(tenants, eq(leases.tenantId, tenants.id))
            .where(
              and(
                eq(rooms.propertyId, property.id),
                eq(tenants.userId, currentUserId)
              )
            )
        ),
        with: { rooms: true },
        orderBy: (properties, { desc }) => [desc(properties.createdAt)],
      });
    }

    const s3Service = S3Service.getInstance();

    const formattedDataPromises = dbProperties.map(async (property) => {
      let imgUrl = null;
      if (property.khqrImageUrl && property.khqrImageUrl.trim() !== '') {
        const extractImg = s3Service.extractKeyFromUrl(property.khqrImageUrl);
        imgUrl = await s3Service.getPresignedUrl(extractImg);
      }

      return {
        ...property,
        khqrImageUrl: imgUrl, 
      };
    });

    const formattedData = await Promise.all(formattedDataPromises);
    return NextResponse.json(formattedData);

  } catch (error) {
    console.error('FETCH_PROPERTIES_DATABASE_FAULT:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset properties database records' }, 
      { status: 500 }
    );
  }
}

// --- POST: CREATE PROPERTY BOUND TO LOGGED-IN SESSION ---
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'tenant') {
      return NextResponse.json({ error: 'Forbidden: Tenants cannot author assets' }, { status: 403 });
    }

    const currentUserId = Number(session.user.id);
    const db = getDb();
    const body = await req.json();
    const { name, address, city, state, zipCode, description, khqrImageUrl } = body;

    // Enforce authorization rules: Only Admins can explicitly bypass assigning property ownership
    const targetOwnerId = session.user.role === 'admin' ? (body.ownerId ? Number(body.ownerId) : currentUserId) : currentUserId;

    const [newProperty] = await db.insert(properties).values({
      ownerId: targetOwnerId,
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zipCode.trim(), 
      description: description?.trim() || null,
      khqrImageUrl: khqrImageUrl?.trim() || null,
    }).returning();

    return NextResponse.json({ ...newProperty, rooms: [] }, { status: 201 });
  } catch (error: any) {
    console.error('CREATE_PROPERTY_DATABASE_FAULT:', error);
    if (error.code === '23503') {
      return NextResponse.json({ error: 'Constraint Failure: Owner ID reference row does not exist.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create property records' }, { status: 500 });
  }
}

// --- PUT: MODIFY RELEVANT PROPERTY RECORDS USING OWNERSHIP VERIFICATION ---
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'tenant') {
      return NextResponse.json({ error: 'Forbidden: Tenants cannot update properties' }, { status: 403 });
    }

    const currentUserId = Number(session.user.id);
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const propertyIdStr = searchParams.get('id');

    if (!propertyIdStr) {
      return NextResponse.json({ error: 'Missing property identifier param' }, { status: 400 });
    }

    const propertyId = parseInt(propertyIdStr, 10);
    const body = await req.json();
    const { name, address, city, state, zipCode, description, khqrImageUrl } = body;

    // 🔒 Security Check: Fetch row target data to protect ownership bounds
    const existingProperty = await db.query.properties.findFirst({
      where: (properties, { eq }) => eq(properties.id, propertyId),
    });

    if (!existingProperty) {
      return NextResponse.json({ error: 'Property record not found' }, { status: 404 });
    }

    if (session.user.role === 'owner' && existingProperty.ownerId !== currentUserId) {
      return NextResponse.json({ error: 'Forbidden: Unauthorized adjustment attempt' }, { status: 403 });
    }

    const [updatedProperty] = await db
      .update(properties)
      .set({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zipCode.trim(),
        description: description?.trim() || null,
        khqrImageUrl: khqrImageUrl?.trim() || null,
      })
      .where(eq(properties.id, propertyId))
      .returning();

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error('UPDATE_PROPERTY_DATABASE_FAULT:', error);
    return NextResponse.json({ error: 'Failed to update asset property record' }, { status: 500 });
  }
}

// --- DELETE: SECURE CASCADING ASSET PURGES ---
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'tenant') {
      return NextResponse.json({ error: 'Forbidden: Tenants cannot drop assets' }, { status: 403 });
    }

    const currentUserId = Number(session.user.id);
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const propertyIdStr = searchParams.get('id');

    if (!propertyIdStr) {
      return NextResponse.json({ error: 'Missing property identifier param' }, { status: 400 });
    }

    const propertyId = parseInt(propertyIdStr, 10);

    const targetProperty = await db.query.properties.findFirst({
      where: (properties, { eq }) => eq(properties.id, propertyId),
    });

    if (!targetProperty) {
      return NextResponse.json({ error: 'Property record not found' }, { status: 404 });
    }

    // 🔒 Security Check: Block unauthorized deletion attempts across accounts
    if (session.user.role === 'owner' && targetProperty.ownerId !== currentUserId) {
      return NextResponse.json({ error: 'Forbidden: Unauthorized asset deletion attempt' }, { status: 403 });
    }

    // Execute atomic operations safely across boundaries using transactions
    await db.transaction(async (tx) => {
      await tx.delete(rooms).where(eq(rooms.propertyId, propertyId));
      await tx.delete(properties).where(eq(properties.id, propertyId));
    });

    return NextResponse.json({ success: true, message: 'Property and its associated rooms successfully removed' });
  } catch (error) {
    console.error('DELETE_PROPERTY_ROUTE_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fully execute property deletion sequence' }, { status: 500 });
  }
}