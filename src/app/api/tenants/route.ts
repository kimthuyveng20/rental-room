import { NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { users, tenants, documents, leases, rooms, properties } from '@/src/lib/db/schema';
import { eq, and, exists, or } from 'drizzle-orm';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";

// Strict frontend UI contract interface matching your requirements
interface DBTenant {
  id: number;
  phone: string;
  emergencyContact: string | null;
  employmentVerification: boolean;
  imageUrl: string | null;
  user: { name: string; email: string };
  leases: Array<{
    status: 'active' | 'expired' | 'terminated';
    room: { roomNumber: string };
  }>;
  documents?: Array<{
    documentType: string;
    filePath: string;
  }>;
}

// --- GET: FETCH SECURITY-ISOLATED TENANTS BY OWNER ID ---
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = Number(session.user.id);
    const userRole = session.user.role;
    const db = getDb();

    // Enforce role barrier: Only owners or admins can perform broad tenant management listings
    if (userRole !== 'owner' && userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Access denied' }, { status: 403 });
    }

    let rawTenants: any[] = [];

    if (userRole === 'admin') {
      rawTenants = await db.query.tenants.findMany({
        with: {
          user: true,
          documents: { columns: { documentType: true, filePath: true } },
          leases: { with: { room: { columns: { roomNumber: true } } } }
        },
      });
    } else if (userRole === 'owner') {
      // 🔒 Exclusive Owner Isolation: Only fetch tenants registered by or leasing from this owner
      rawTenants = await db.query.tenants.findMany({
        where: (tenant) => or(
          eq(tenant.createdByOwnerId, currentUserId),
          exists(
            db.select()
              .from(leases)
              .innerJoin(rooms, eq(leases.roomId, rooms.id))
              .innerJoin(properties, eq(rooms.propertyId, properties.id))
              .where(
                and(
                  eq(leases.tenantId, tenant.id),
                  eq(properties.ownerId, currentUserId)
                )
              )
          )
        ),
        with: {
          user: true,
          documents: { columns: { documentType: true, filePath: true } },
          leases: {
            with: { room: { columns: { roomNumber: true } } },
            orderBy: (leases, { desc }) => [desc(leases.createdAt)],
          },
        },
      });
    }

    // Transform database rows to match frontend structure type contracts perfectly
    const formattedTenants: DBTenant[] = rawTenants.map((t) => ({
      id: t.id,
      phone: t.phone,
      emergencyContact: t.emergencyContact || null,
      employmentVerification: Boolean(t.employmentVerification),
      imageUrl: t.imageUrl || null,
      user: {
        name: t.user.name,
        email: t.user.email,
      },
      leases: (t.leases || []).map((l: any) => ({
        status: l.status,
        room: { roomNumber: l.room.roomNumber },
      })),
      documents: t.documents ? t.documents.map((d: any) => ({
        documentType: d.documentType,
        filePath: d.filePath,
      })) : [],
    }));

    return NextResponse.json(formattedTenants);
  } catch (error) {
    console.error('FETCH_TENANTS_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch relational tenants' }, { status: 500 });
  }
}

// --- POST: CREATE TENANT LOGS EXCLUSIVELY BY SIGNED-IN OWNER ID ---
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'owner' && session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Account authorization rejected' }, { status: 403 });
    }

    const currentUserId = Number(session.user.id);
    const db = getDb();
    const body = await req.json();
    const { name, email, phone, emergencyContact, employmentVerification, imageUrl, idDocumentUrl } = body;
    
    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, cleanEmail),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A tenant account with this email address is already registered.' },
        { status: 400 }
      );
    }

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
        imageUrl: imageUrl || null,
        createdByOwnerId: currentUserId, // 🔒 Bound exclusively to creating owner ID
      }).returning();

      if (idDocumentUrl) {
        await tx.insert(documents).values({
          tenantId: newTenant.id,
          documentType: 'Government_ID',
          filePath: idDocumentUrl, 
        });
      }

      return {
        id: newTenant.id,
        phone: newTenant.phone,
        emergencyContact: newTenant.emergencyContact,
        employmentVerification: newTenant.employmentVerification,
        imageUrl: newTenant.imageUrl,
        user: { name: newUser.name, email: newUser.email },
        leases: [],
        documents: idDocumentUrl ? [{ documentType: 'Government_ID', filePath: idDocumentUrl }] : []
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error('CREATE_TENANT_TRANSACTION_ERROR:', error);
    return NextResponse.json({ error: 'Internal server processing error' }, { status: 500 });
  }
}

// --- PUT: MODIFY PROFILE WITH OWNER MANAGEMENT AUTHENTICATION ---
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = Number(session.user.id);
    const db = getDb();
    const body = await req.json();
    const { id, name, email, phone, emergencyContact, employmentVerification, imageUrl, idDocumentUrl } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing tenant ID' }, { status: 400 });
    }

    const existingTenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.id, id),
      with: { user: true }
    });

    if (!existingTenant) {
      return NextResponse.json({ error: 'Tenant record not found' }, { status: 404 });
    }

    // 🔒 Owner Guard: Block edit if owner doesn't manage or own this specific tenant profile
    if (session.user.role === 'owner') {
      const isCreator = existingTenant.createdByOwnerId === currentUserId;
      const hasLeaseRelationship = await db.query.leases.findFirst({
        where: (lease, { exists }) => exists(
          db.select()
            .from(rooms)
            .innerJoin(properties, eq(rooms.propertyId, properties.id))
            .where(
              and(
                eq(leases.tenantId, id),
                eq(rooms.id, lease.roomId),
                eq(properties.ownerId, currentUserId)
              )
            )
        )
      });

      if (!isCreator && !hasLeaseRelationship) {
        return NextResponse.json({ error: 'Forbidden: You do not manage this tenant profile resource.' }, { status: 403 });
      }
    }

    await db.transaction(async (tx) => {
      await tx.update(users)
        .set({ name: name.trim(), email: email.toLowerCase().trim(), updatedAt: new Date() })
        .where(eq(users.id, existingTenant.userId));

      await tx.update(tenants)
        .set({
          phone: phone.trim(),
          emergencyContact: emergencyContact?.trim() || null,
          employmentVerification: Boolean(employmentVerification),
          imageUrl: imageUrl || null,
        })
        .where(eq(tenants.id, id));

      if (idDocumentUrl) {
        const existingDoc = await tx.query.documents.findFirst({
          where: (documents, { and, eq }) => 
            and(eq(documents.tenantId, id), eq(documents.documentType, 'Government_ID'))
        });

        if (existingDoc) {
          await tx.update(documents).set({ filePath: idDocumentUrl }).where(eq(documents.id, existingDoc.id));
        } else {
          await tx.insert(documents).values({ tenantId: id, documentType: 'Government_ID', filePath: idDocumentUrl });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('UPDATE_TENANT_ERROR:', error);
    return NextResponse.json({ error: 'Internal server processing error' }, { status: 500 });
  }
}

// --- DELETE: SECURE ISOLATED PURGE FOR MANAGEMENT NETWORKS ---
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = Number(session.user.id);
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const tenantIdStr = searchParams.get('id');

    if (!tenantIdStr) {
      return NextResponse.json({ error: 'Missing tenant identifier param' }, { status: 400 });
    }

    const tenantId = parseInt(tenantIdStr, 10);
    const targetTenant = await db.query.tenants.findFirst({
      where: (tenants, { eq }) => eq(tenants.id, tenantId),
    });

    if (!targetTenant) {
      return NextResponse.json({ error: 'Tenant record not found' }, { status: 404 });
    }

    // 🔒 Owner Guard: Block deletion if owner doesn't own or manage this specific tenant profile record
    if (session.user.role === 'owner') {
      const isCreator = targetTenant.createdByOwnerId === currentUserId;
      const hasLeaseRelationship = await db.query.leases.findFirst({
        where: (lease, { exists }) => exists(
          db.select()
            .from(rooms)
            .innerJoin(properties, eq(rooms.propertyId, properties.id))
            .where(
              and(
                eq(leases.tenantId, tenantId),
                eq(rooms.id, lease.roomId),
                eq(properties.ownerId, currentUserId)
              )
            )
        )
      });

      if (!isCreator && !hasLeaseRelationship) {
        return NextResponse.json({ error: 'Forbidden: Unauthorized management request' }, { status: 403 });
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(documents).where(eq(documents.tenantId, tenantId));
      await tx.delete(leases).where(eq(leases.tenantId, tenantId));
      await tx.delete(tenants).where(eq(tenants.id, tenantId));
      await tx.delete(users).where(eq(users.id, targetTenant.userId));
    });

    return NextResponse.json({ success: true, message: 'Tenant successfully removed' });
  } catch (error) {
    console.error('DELETE_TENANT_ROUTE_ERROR:', error);
    return NextResponse.json({ error: 'Failed to purge tenant relationships' }, { status: 500 });
  }
}