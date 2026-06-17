import { NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { invoices, leases, rooms, properties, tenants } from '@/src/lib/db/schema'; 
import { eq, and, exists } from 'drizzle-orm';
import { S3Service } from '@/src/lib/services/s3.service';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";

// --- POST: CREATE INVOICE ---
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role === 'tenant') {
      return NextResponse.json({ error: 'Forbidden: Tenants cannot create invoices' }, { status: 403 });
    }
    
    const currentUserId = Number(session.user.id);
    const db = getDb();
    const body = await req.json();
    const {
      leaseId,
      waterLastMonth,
      waterThisMonth,
      waterRate,
      electricityLastMonth,
      electricityThisMonth,
      electricityRate,
      billingPeriod,
      dueDate,
    } = body;

    const activeLease = await db.query.leases.findFirst({
      where: (leases, { eq }) => eq(leases.id, Number(leaseId)),
      with: {
        room: { with: { property: true } },
        tenant: { with: { user: true } },
      },
    });

    if (!activeLease) {
      return NextResponse.json({ error: 'Selected active lease not found' }, { status: 404 });
    }

    // 🔒 Owner Check: Make sure the owner logging in actually owns the property this lease belongs to
    if (session.user.role === 'owner' && activeLease.room.property.ownerId !== currentUserId) {
      return NextResponse.json({ error: 'Forbidden: You do not own this property' }, { status: 403 });
    }

    // Calculations
    const waterUsage = Math.max(0, Number(waterThisMonth) - Number(waterLastMonth));
    const waterTotal = (waterUsage * Number(waterRate)).toFixed(2);

    const electricityUsage = Math.max(0, Number(electricityThisMonth) - Number(electricityLastMonth));
    const electricityTotal = (electricityUsage * Number(electricityRate)).toFixed(2);

    const roomRent = activeLease.monthlyRent; 
    const grandTotal = (
      Number(roomRent) +
      Number(waterTotal) +
      Number(electricityTotal)
    ).toFixed(2);

    const [newInvoice] = await db.insert(invoices).values({
      leaseId: activeLease.id,
      roomNumber: activeLease.room.roomNumber,
      tenantName: activeLease.tenant.user.name,
      waterLastMonth: Number(waterLastMonth),
      waterThisMonth: Number(waterThisMonth),
      waterUsage,
      waterRate: String(waterRate),
      waterTotal,
      electricityLastMonth: Number(electricityLastMonth),
      electricityThisMonth: Number(electricityThisMonth),
      electricityUsage,
      electricityRate: String(electricityRate),
      electricityTotal,
      roomRent,
      grandTotal,
      status: 'pending',
      billingPeriod,
      dueDate: new Date(dueDate).toISOString().split('T')[0],
    }).returning();

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('CREATE_INVOICE_ERROR:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

// --- GET: FETCH INVOICES ---
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserId = Number(session.user.id);
    const userRole = session.user.role;
    const db = getDb();

    let allInvoices: any[] = [];

    if (userRole === 'admin') {
      // Admins see everything
      allInvoices = await db.query.invoices.findMany({
        with: {
          lease: {
            with: {
              room: { with: { property: true } },
              tenant: { with: { user: true } },
            },
          },
        },
      });

    } else if (userRole === 'owner') {
      // 🔒 Owner Query
      allInvoices = await db.query.invoices.findMany({
        where: (invoice, { exists }) => exists(
          db.select()
            .from(leases)
            .innerJoin(rooms, eq(leases.roomId, rooms.id))
            .innerJoin(properties, eq(rooms.propertyId, properties.id))
            .where(
              and(
                eq(leases.id, invoice.leaseId),
                eq(properties.ownerId, currentUserId)
              )
            )
        ),
       with: {
        lease: {
          with: {
            room: { 
              with: { 
                property: {
                  with: {
                    owner: true // <--- Add this to fetch user data
                  }
                } 
              } 
            },
            tenant: { with: { user: true } },
          },
        },
      },
      });

    } else if (userRole === 'tenant') {
      // 🔒 Tenant Query
      allInvoices = await db.query.invoices.findMany({
        where: (invoice, { exists }) => exists(
          db.select()
            .from(leases)
            .innerJoin(tenants, eq(leases.tenantId, tenants.id))
            .where(
              and(
                eq(leases.id, invoice.leaseId),
                eq(tenants.userId, currentUserId)
              )
            )
        ),
        with: {
          lease: {
            with: {
              room: { with: { property: true } },
              tenant: { with: { user: true } },
            },
          },
        },
      });
    }

    // Process S3 Images (Presigning URLs)
    const s3Service = S3Service.getInstance();

    const formattedData = await Promise.all(
      allInvoices.map(async (invoice) => {
        const khqrUrl = invoice.lease?.room?.property?.khqrImageUrl;
        const property = invoice.lease?.room?.property;
        const owner = property?.owner;
        let presignedKhqrUrl = null;

        if (khqrUrl?.trim()) {
          const key = s3Service.extractKeyFromUrl(khqrUrl);
          presignedKhqrUrl = await s3Service.getPresignedUrl(key);
        }
        return {
          ...invoice,
          lease: {
            ...invoice.lease,
            room: {
              ...invoice.lease?.room,
              property: {
                ...invoice.lease?.room?.property,
                khqrImageUrl: presignedKhqrUrl,
                name: owner?.name || 'N/A',
                email: owner.email || 'N/A',
              },
            },
          },
        };
      })
    );
   
    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('BACKEND_INVOICE_CRASH:', error);
    return NextResponse.json({ error: 'Failed to load invoices records matrix' }, { status: 500 });
  }
}