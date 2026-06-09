import { NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { users, tenants, documents, leases } from '@/src/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const db = getDb();
  try {
    const tenantsList = await db.query.tenants.findMany({
      with: {
        user: true,
        documents: {
          columns: {
            documentType: true,
            filePath: true,
          }
        },
        leases: {
          with: {
            room: true,
          },
          orderBy: (leases, { desc }) => [desc(leases.createdAt)],
        },
      },
    });

    return NextResponse.json(tenantsList);
  } catch (error) {
    console.error('FETCH_TENANTS_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch relational tenants' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { 
      id, // The tenant ID being edited
      name, 
      email, 
      phone, 
      emergencyContact, 
      employmentVerification, 
      imageUrl, 
      idDocumentUrl 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Fetch current tenant to discover their linked user record
    const existingTenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.id, id),
      with: { user: true }
    });

    if (!existingTenant) {
      return NextResponse.json({ error: 'Tenant record not found' }, { status: 404 });
    }

    // 2. Perform safe relational updates via a transaction block
    await db.transaction(async (tx) => {
      // Update User table details
      await tx.update(users)
        .set({
          name: name.trim(),
          email: cleanEmail,
        })
        .where(eq(users.id, existingTenant.userId));

      // Update Tenant table details (including profile image)
      await tx.update(tenants)
        .set({
          phone: phone.trim(),
          emergencyContact: emergencyContact?.trim() || null,
          employmentVerification: Boolean(employmentVerification),
          imageUrl: imageUrl || null,
        })
        .where(eq(tenants.id, id));

      // Handle ID Document updates
      if (idDocumentUrl) {
        // Check if they already had a Government ID document logged
        const existingDoc = await tx.query.documents.findFirst({
          where: (documents, { and, eq }) => 
            and(eq(documents.tenantId, id), eq(documents.documentType, 'Government_ID'))
        });

        if (existingDoc) {
          // Update the existing ID document file path string
          await tx.update(documents)
            .set({ filePath: idDocumentUrl })
            .where(eq(documents.id, existingDoc.id));
        } else {
          // Insert a new row if they didn't have one before
          await tx.insert(documents).values({
            tenantId: id,
            documentType: 'Government_ID',
            filePath: idDocumentUrl,
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('UPDATE_TENANT_ERROR:', error);
    return NextResponse.json({ error: 'Internal server processing error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const db = getDb();
    const body = await req.json();
    const { 
      name, 
      email, 
      phone, 
      emergencyContact, 
      employmentVerification, 
      imageUrl, 
      idDocumentUrl 
    } = body;
    
    const cleanEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, cleanEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A tenant account with this email address is already registered.' },
        { status: 400 }
      );
    }

    // Run transaction safe sequence
    const result = await db.transaction(async (tx) => {
      // Create user record
      const [newUser] = await tx.insert(users).values({
        email: cleanEmail,
        name: name.trim(),
        passwordHash: '$2b$10$UnassignedDummyHashChangeOnPasswordReset',
        role: 'tenant',
      }).returning();

      // Create tenant record with profile image
      const [newTenant] = await tx.insert(tenants).values({
        userId: newUser.id,
        phone: phone.trim(),
        emergencyContact: emergencyContact?.trim() || null,
        employmentVerification: Boolean(employmentVerification),
        imageUrl: imageUrl || null,
      }).returning();

      // If an ID document string exists, automatically log it inside the documents table
      if (idDocumentUrl) {
        await tx.insert(documents).values({
          tenantId: newTenant.id,
          documentType: 'Government_ID',
          filePath: idDocumentUrl, 
        });
      }

      return { ...newTenant, user: newUser, leases: [] };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('CREATE_TENANT_TRANSACTION_ERROR:', error);
    if (error.code === '23505' || error.message?.includes('unique constraint')) {
      return NextResponse.json({ error: 'A user account with this email already exists.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server processing error' }, { status: 500 });
  }
}


export async function DELETE(req: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const tenantIdStr = searchParams.get('id');

    if (!tenantIdStr) {
      return NextResponse.json({ error: 'Missing tenant identifier param' }, { status: 400 });
    }

    const tenantId = parseInt(tenantIdStr, 10);

    // 1. Check if the tenant exists and fetch user relations
    const targetTenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.id, tenantId),
    });

    if (!targetTenant) {
      return NextResponse.json({ error: 'Tenant record not found' }, { status: 404 });
    }

    // 2. Perform safe cascade purging using a database transaction
    await db.transaction(async (tx) => {
      // Step A: Purge uploaded documents (like Government ID) tied to this profile
      await tx.delete(documents).where(eq(documents.tenantId, tenantId));

      // Step B: Set tenantId reference to null or delete dependent leases 
      // (Depends on business constraints; here we cleanly remove loose unassigned test leases)
      await tx.delete(leases).where(eq(leases.tenantId, tenantId));

      // Step C: Drop the primary tenant Profile row
      await tx.delete(tenants).where(eq(tenants.id, tenantId));

      // Step D: Drop the global User security row account
      await tx.delete(users).where(eq(users.id, targetTenant.userId));
    });

    return NextResponse.json({ success: true, message: 'Tenant successfully removed' });
  } catch (error) {
    console.error('DELETE_TENANT_ROUTE_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fully purge tenant relationships' }, { status: 500 });
  }
}