import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { S3Service } from '@/src/lib/services/s3.service';
import { properties, rooms, leases, tenants } from '@/src/lib/db/schema';
import { eq, and, exists, InferSelectModel } from 'drizzle-orm';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import jwt from "jsonwebtoken";

// 1. Define the basic structural model type for properties and rooms
type PropertyBase = InferSelectModel<typeof properties>;
type RoomBase = InferSelectModel<typeof rooms>;

// 2. Combine them into an explicit type that matches your query's ".findMany({ with: { rooms: true } })"
type PropertyWithRooms = PropertyBase & {
  rooms: RoomBase[];
};


interface JwtPayload {
  id: number;
  role: string;
}

interface DBRoomRelation {
  id: number;
  status: 'available' | 'occupied' | 'maintenance';
}

interface DBProperty {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  description: string | null;
  khqrImageUrl?: string | null;
  rooms: DBRoomRelation[];
}
export async function GET(req: NextRequest) {
  try {
    let currentUserId: number;
    let userRole: string;

    // ============================
    // 1. Try NextAuth Session
    // ============================
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      currentUserId = Number(session.user.id);
      userRole = session.user.role;
    } else {
      // ============================
      // 2. Try JWT Token (Flutter)
      // ============================

      const authHeader = req.headers.get("authorization");

      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
          {
            success: false,
            message: "Unauthorized",
          },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);

      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as JwtPayload;

      currentUserId = payload.id;
      userRole = payload.role;
    }

    const db = getDb();

    let dbProperties: any[] = [];

    // ============================
    // Admin
    // ============================

    if (userRole === "admin") {
      dbProperties = await db.query.properties.findMany({
        with: {
          rooms: true,
        },
        orderBy: (properties, { desc }) => [
          desc(properties.createdAt),
        ],
      });
    }

    // ============================
    // Owner
    // ============================

    else if (userRole === "owner") {
      dbProperties = await db.query.properties.findMany({
        where: (property, { eq }) =>
          eq(property.ownerId, currentUserId),

        with: {
          rooms: true,
        },

        orderBy: (properties, { desc }) => [
          desc(properties.createdAt),
        ],
      });
    }

    // ============================
    // Tenant
    // ============================

    else if (userRole === "tenant") {
      dbProperties = await db.query.properties.findMany({
        where: (property, { exists }) =>
          exists(
            db
              .select()
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

        with: {
          rooms: true,
        },

        orderBy: (properties, { desc }) => [
          desc(properties.createdAt),
        ],
      });
    }

    const s3Service = S3Service.getInstance();

   const formattedData: DBProperty[] = await Promise.all(
    dbProperties.map(async (property) => {
      let imgUrl: string | null = null;

      if (property.khqrImageUrl?.trim()) {
        const key = s3Service.extractKeyFromUrl(property.khqrImageUrl);
        imgUrl = await s3Service.getPresignedUrl(key);
      }

      return {
        id: property.id,
        name: property.name,
        address: property.address,
        city: property.city,
        state: property.state,
        zip: property.zip,
        description: property.description,
        khqrImageUrl: imgUrl,
        rooms: property.rooms,
      };
    })
  );
    return NextResponse.json({
      success: true,
      data: formattedData,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal Server Error",
      },
      {
        status: 500,
      }
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