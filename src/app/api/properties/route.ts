import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { properties } from '@/src/lib/db/schema';

// GET: Fetch all properties along with their rooms
export async function GET() {
  try {
    const dataMatrix = await db.query.properties.findMany({
      with: {
        rooms: true, 
      },
      orderBy: (properties, { desc }) => [desc(properties.createdAt)],
    });

    return NextResponse.json(dataMatrix);
  } catch (error) {
    console.error('FETCH_PROPERTIES_DATABASE_FAULT:', error);
    return NextResponse.json({ error: 'Failed to fetch asset properties database records' }, { status: 500 });
  }
}

// POST: Safely write a new property record matching Drizzle specifications
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, address, city, state, zipCode, description } = body;

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