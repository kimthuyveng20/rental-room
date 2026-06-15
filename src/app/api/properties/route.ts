// src/app/api/properties/route.ts
import { NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { S3Service } from '@/src/lib/services/s3.service';
import { properties, rooms } from '@/src/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const db = getDb();
    const dbProperties = await db.query.properties.findMany({
      with: {
        rooms: true, 
      },
      orderBy: (properties, { desc }) => [desc(properties.createdAt)],
    });

    const s3Service = S3Service.getInstance();

    // 1. Create an array of Promises (Notice NO 'await' before dbProperties.map)
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

    // 2. NOW we wait for all those S3 promises to resolve completely!
    const formattedData = await Promise.all(formattedDataPromises);

    console.log("Pro", formattedData); // This will show your actual data now!
    return NextResponse.json(formattedData);

  } catch (error) {
    console.error('FETCH_PROPERTIES_DATABASE_FAULT:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset properties database records' }, 
      { status: 500 }
    );
  }
}

// POST: Safely write a new property record matching Drizzle specifications
export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { name, address, city, state, zipCode, description, khqrImageUrl } = body;

    // Fallback owner profile ID mapping for local testing. 
    // Replace this with your actual user session parsing logic (e.g., auth() or getServerSession)
    const activeOwnerId = 1; 

    const [newProperty] = await db.insert(properties).values({
      ownerId: activeOwnerId,
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      zip: zipCode.trim(), // Maps client-side zipCode directly into database 'zip' column
      description: description?.trim() || null,
      khqrImageUrl: khqrImageUrl?.trim() || null,
    }).returning();

    // Return the structure with an empty rooms array placeholder to keep client maps content
    return NextResponse.json({ ...newProperty, rooms: [] }, { status: 201 });
  } catch (error: any) {
    console.error('CREATE_PROPERTY_DATABASE_FAULT:', error);
    
    if (error.code === '23503') {
      return NextResponse.json({ error: 'Constraint Failure: Owner ID reference row does not exist in the users table.' }, { status: 400 });
    }
    
    return NextResponse.json({ error: 'Failed to create property. Check server console logs.' }, { status: 500 });
  }
}


export async function DELETE(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const propertyIdStr = searchParams.get('id');

    if (!propertyIdStr) {
      return NextResponse.json({ error: 'Missing property identifier param' }, { status: 400 });
    }

    const propertyId = parseInt(propertyIdStr, 10);

    // 1. Verify that the property exists
    const targetProperty = await db.query.properties.findFirst({
      where: (properties, { eq }) => eq(properties.id, propertyId),
    });

    if (!targetProperty) {
      return NextResponse.json({ error: 'Property record not found' }, { status: 404 });
    }

    // 2. Safely cascadingly delete associated files/rooms inside a database transaction block
    await db.transaction(async (tx) => {
      // Step A: Purge all nested rooms belonging to this property
      await tx.delete(rooms).where(eq(rooms.propertyId, propertyId));

      // Step B: Permanently delete the primary property record ledger log
      await tx.delete(properties).where(eq(properties.id, propertyId));
    });

    return NextResponse.json({ success: true, message: 'Property and its associated rooms successfully removed' });
  } catch (error) {
    console.error('DELETE_PROPERTY_ROUTE_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fully execute property deletion sequence' }, { status: 500 });
  }
}


export async function PUT(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const propertyIdStr = searchParams.get('id');

    if (!propertyIdStr) {
      return NextResponse.json({ error: 'Missing property identifier param' }, { status: 400 });
    }

    const propertyId = parseInt(propertyIdStr, 10);
    const body = await req.json();
    const { name, address, city, state, zipCode, description ,khqrImageUrl} = body;

    // Execute update verification row change execution 
    const [updatedProperty] = await db
      .update(properties)
      .set({
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        zip: zipCode.trim(),
        description: description?.trim() || null,
          khqrImageUrl:
    khqrImageUrl?.trim() || null,
      })
      .where(eq(properties.id, propertyId))
      .returning();

    if (!updatedProperty) {
      return NextResponse.json({ error: 'Property record not found' }, { status: 404 });
    }

    return NextResponse.json(updatedProperty);
  } catch (error) {
    console.error('UPDATE_PROPERTY_DATABASE_FAULT:', error);
    return NextResponse.json({ error: 'Failed to update asset property record' }, { status: 500 });
  }
}