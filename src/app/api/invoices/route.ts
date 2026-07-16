import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { invoices, leases, rooms, properties, tenants } from '@/src/lib/db/schema'; 
import { eq, and, exists } from 'drizzle-orm';
import { S3Service } from '@/src/lib/services/s3.service';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";
import jwt, { JwtPayload } from "jsonwebtoken";



interface CustomJwtPayload extends JwtPayload {
  id: number;
  role: string;
}

export async function GET(req: NextRequest) {
  try {
    let currentUserId: number;
    let userRole: string;

    // ==========================================
    // 1. Try NextAuth Session (Web clients)
    // ==========================================
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      currentUserId = Number(session.user.id);
      userRole = session.user.role;
    } else {
      // ==========================================
      // 2. Try JWT Token (Flutter mobile client)
      // ==========================================
      const authHeader = req.headers.get("authorization");

      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
          { error: "Unauthorized: Missing or invalid authorization scheme" },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);

      // Verify JWT using your env JWT_SECRET
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET!
      ) as CustomJwtPayload;

      // Force-cast payload.id to number to guarantee Drizzle operations don't crash
      currentUserId = Number(payload.id);
      userRole = payload.role;
    }

    const db = getDb();
    let allInvoices: any[] = [];

    // ==========================================
    // Admin Execution Branch
    // ==========================================
    if (userRole === 'admin') {
      // Admins see everything
      allInvoices = await db.query.invoices.findMany({
        with: {
          lease: {
            with: {
              room: { 
                with: { 
                  property: {
                    with: {
                      owner: true
                    }
                  } 
                } 
              },
              tenant: { with: { user: true } },
            },
          },
        },
      });
    } 
    // ==========================================
    // Owner Execution Branch
    // ==========================================
    else if (userRole === 'owner') {
      // 🔒 Owner Query: Only get invoices for leases of properties they own
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
                      owner: true
                    }
                  } 
                } 
              },
              tenant: { with: { user: true } },
            },
          },
        },
      });
    } 
    // ==========================================
    // Tenant Execution Branch
    // ==========================================
    else if (userRole === 'tenant') {
      // 🔒 Tenant Query: Only get invoices linked directly to their user profile
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
              room: { 
                with: { 
                  property: {
                    with: {
                      owner: true
                    }
                  } 
                } 
              },
              tenant: { with: { user: true } },
            },
          },
        },
      });
    }

    // ==========================================
    // Process S3 Images (Presigning URLs)
    // ==========================================
    const s3Service = S3Service.getInstance();

    const formattedData = await Promise.all(
      allInvoices.map(async (invoice) => {
        const property = invoice.lease?.room?.property;
        const khqrUrl = property?.khqrImageUrl;
        const owner = property?.owner;
        let presignedKhqrUrl = null;

        if (khqrUrl?.trim()) {
          try {
            const key = s3Service.extractKeyFromUrl(khqrUrl);
            presignedKhqrUrl = await s3Service.getPresignedUrl(key);
          } catch (s3Error) {
            console.error("S3_PRESIGN_ERROR for invoice ID:", invoice.id, s3Error);
            // Fallback gracefully without crashing the request if a single image fails
          }
        }

        return {
          ...invoice,
          lease: {
            ...invoice.lease,
            room: {
              ...invoice.lease?.room,
              property: {
                ...property,
                khqrImageUrl: presignedKhqrUrl,
                name: owner?.name || 'N/A',
                email: owner?.email || 'N/A',
              },
            },
          },
        };
      })
    );

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('BACKEND_INVOICE_CRASH:', error);
    return NextResponse.json(
      { error: 'Failed to load invoices records matrix' }, 
      { status: 500 }
    );
  }
}

// --- POST: CREATE INVOICE ---
export async function POST(req: NextRequest) {
  try {
    let currentUserId: number;
    let currentUserRole: string | undefined;

    // 1. Attempt NextAuth Session (Cookie-based / Web clients)
    const session = await getServerSession(authOptions);

    if (session?.user?.id) {
      currentUserId = Number(session.user.id);
      currentUserRole = session.user.role;
    } else {
      // 2. Fallback to Authorization Header (JWT-based / Mobile clients)
      const authHeader = req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return NextResponse.json(
          { success: false, message: "Unauthorized: Missing or invalid token format" },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);

      try {
        const payload = jwt.verify(
          token,
          process.env.JWT_SECRET!
        ) as JwtPayload;

        if (!payload || !payload.id) {
          return NextResponse.json(
            { success: false, message: "Unauthorized: Invalid token payload" },
            { status: 401 }
          );
        }

        currentUserId = Number(payload.id);
        currentUserRole = payload.role; // Extract role from your manual JWT payload
      } catch (jwtError) {
        return NextResponse.json(
          { success: false, message: "Unauthorized: Token verification failed or expired" },
          { status: 401 }
        );
      }
    }

    // Role Enforcement Guard
    if (currentUserRole === 'tenant') {
      return NextResponse.json(
        { error: 'Forbidden: Tenants cannot create invoices' }, 
        { status: 403 }
      );
    }
    
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
      startDate,
      endDate,
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
    if (currentUserRole === 'owner' && activeLease.room.property.ownerId !== currentUserId) {
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
      startDate: new Date(startDate).toISOString().split('T')[0],
      endDate: new Date(endDate).toISOString().split('T')[0],
    }).returning();

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('CREATE_INVOICE_ERROR:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}