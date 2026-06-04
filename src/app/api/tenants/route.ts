import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { users, tenants } from '@/src/lib/db/schema';
import { eq } from 'drizzle-orm';

// GET: Retrieve all tenants with linked user information and lease statuses
export async function GET() {
  try {
    const tenantsList = await db.query.tenants.findMany({
      with: {
        user: true,
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, phone, emergencyContact, employmentVerification } = body;
    
    const cleanEmail = email.toLowerCase().trim();

    // 1. Proactively check if the user email already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, cleanEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A tenant account with this email address is already registered.' },
        { status: 400 }
      );
    }

    // 2. Run your isolated creation transaction safely
    const result = await db.transaction(async (tx) => {
      const [newUser] = await tx.insert(users).values({
        email: cleanEmail,
        name: name.trim(),
        passwordHash: '$2b$10$UnassignedDummyHashChangeOnPasswordReset',
        role: 'tenant',
      }).returning();

      const [newTenant] = await tx.insert(tenants).values({
        userId: newUser.id,
        phone: phone.trim(),
        emergencyContact: emergencyContact?.trim() || null,
        employmentVerification: Boolean(employmentVerification),
      }).returning();

      return { ...newTenant, user: newUser, leases: [] };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('CREATE_TENANT_TRANSACTION_ERROR:', error);
    
    // Fallback error catcher checking both native codes and message strings
    if (error.code === '23505' || error.message?.includes('unique constraint')) {
      return NextResponse.json(
        { error: 'A user account with this email already exists.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: 'Internal server processing error' }, { status: 500 });
  }
}