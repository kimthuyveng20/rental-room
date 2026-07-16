import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import { payments, leases, rooms, properties, tenants } from '@/src/lib/db/schema';
import { eq, and, exists, desc } from 'drizzle-orm';
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

    let data: any[] = [];

    // ==========================================
    // Admin Execution Branch
    // ==========================================
    if (userRole === 'admin') {
      data = await db.query.payments.findMany({
        orderBy: [desc(payments.createdAt)],
        with: {
          lease: {
            with: {
              room: true,
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
      // 🔒 Owner Isolation: Only fetch payment records belonging to rooms inside their property assets
      data = await db.query.payments.findMany({
        where: (payment, { exists }) => exists(
          db.select()
            .from(leases)
            .innerJoin(rooms, eq(leases.roomId, rooms.id))
            .innerJoin(properties, eq(rooms.propertyId, properties.id))
            .where(
              and(
                eq(leases.id, payment.leaseId),
                eq(properties.ownerId, currentUserId)
              )
            )
        ),
        orderBy: [desc(payments.createdAt)],
        with: {
          lease: {
            with: {
              room: true,
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
      // 🔒 Tenant Isolation: A tenant can only see payment histories linked directly to their personal profile
      data = await db.query.payments.findMany({
        where: (payment, { exists }) => exists(
          db.select()
            .from(tenants)
            .where(
              and(
                eq(tenants.id, payment.tenantId),
                eq(tenants.userId, currentUserId)
              )
            )
        ),
        orderBy: [desc(payments.createdAt)],
        with: {
          lease: {
            with: {
              room: true,
              tenant: { with: { user: true } },
            },
          },
        },
      });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("BACKEND_PAYMENT_FETCH_CRASH:", error);
    return NextResponse.json(
      { error: "Failed to read database records asset loops" }, 
      { status: 500 }
    );
  }
}