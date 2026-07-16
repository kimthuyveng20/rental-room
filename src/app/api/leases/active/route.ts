import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/src/lib/db';
import {  rooms, properties, tenants } from '@/src/lib/db/schema';
import { and, } from 'drizzle-orm';
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

    let activeLeases: any[] = [];

    // ==========================================
    // Admin Execution Branch
    // ==========================================
    if (userRole === 'admin') {
      // Admins fetch all active leases across the platform
      activeLeases = await db.query.leases.findMany({
        where: (leases, { eq }) => eq(leases.status, 'active'),
        with: {
          room: true,
          tenant: { with: { user: true } },
        },
        orderBy: (leases, { desc }) => [desc(leases.createdAt)],
      });
    } 
    // ==========================================
    // Owner Execution Branch
    // ==========================================
    else if (userRole === 'owner') {
      // 🔒 Owner Isolation: Only fetch active leases for rooms belonging to properties owned by this user
      activeLeases = await db.query.leases.findMany({
        where: (lease, { eq, exists }) => and(
          eq(lease.status, 'active'),
          exists(
            db.select()
              .from(rooms)
              .innerJoin(properties, eq(rooms.propertyId, properties.id))
              .where(
                and(
                  eq(rooms.id, lease.roomId),
                  eq(properties.ownerId, currentUserId)
                )
              )
          )
        ),
        with: {
          room: true,
          tenant: { with: { user: true } },
        },
        orderBy: (leases, { desc }) => [desc(leases.createdAt)],
      });
    } 
    // ==========================================
    // Tenant Execution Branch
    // ==========================================
    else if (userRole === 'tenant') {
      // 🔒 Tenant Isolation: Tenants can strictly only view their own active lease agreement(s)
      activeLeases = await db.query.leases.findMany({
        where: (lease, { eq, exists }) => and(
          eq(lease.status, 'active'),
          exists(
            db.select()
              .from(tenants)
              .where(
                and(
                  eq(tenants.id, lease.tenantId),
                  eq(tenants.userId, currentUserId)
                )
              )
          )
        ),
        with: {
          room: true,
          tenant: { with: { user: true } },
        },
      });
    }

    return NextResponse.json(activeLeases);
  } catch (error) {
    console.error('FETCH_ACTIVE_LEASES_ERROR:', error);
    return NextResponse.json(
      { error: 'Failed to fetch active leases' }, 
      { status: 500 }
    );
  }
}