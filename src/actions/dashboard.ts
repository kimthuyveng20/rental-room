import { getDb } from '@/src/lib/db'; 
import { properties, rooms, tenants, payments, maintenanceRequests, leases, users } from '@/src/lib/db/schema';
import { eq, and, sql, desc, or } from 'drizzle-orm';

/**
 * 1. Fetch Aggregated Dashboard Statistics isolated by Owner ID
 */
export async function getDashboardStats(ownerUserId: number) {
  const db = getDb();

  // 🔒 1. Total Properties owned by this specific owner
  const [propertyCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(properties)
    .where(eq(properties.ownerId, ownerUserId));

  // 🔒 2. Active Rooms belonging exclusively to this owner's properties
  const [roomCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(rooms)
    .innerJoin(properties, eq(rooms.propertyId, properties.id))
    .where(eq(properties.ownerId, ownerUserId));

  // 🔒 3. Total Tenants (either signed a lease for this owner's property OR registered by this owner)
  const [tenantCount] = await db
    .select({ count: sql<number>`count(distinct ${tenants.id})` })
    .from(tenants)
    .leftJoin(leases, eq(leases.tenantId, tenants.id))
    .leftJoin(rooms, eq(leases.roomId, rooms.id))
    .leftJoin(properties, eq(rooms.propertyId, properties.id))
    .where(
      or(
        eq(properties.ownerId, ownerUserId),
        eq(tenants.createdByOwnerId, ownerUserId)
      )
    );

  // 🔒 4. Monthly Revenue (Sum of paid items within the last 30 days for this owner's properties)
  const [revenueSum] = await db
    .select({ total: sql<number>`sum(${payments.amount})` })
    .from(payments)
    .innerJoin(leases, eq(payments.leaseId, leases.id))
    .innerJoin(rooms, eq(leases.roomId, rooms.id))
    .innerJoin(properties, eq(rooms.propertyId, properties.id))
    .where(
      and(
        eq(properties.ownerId, ownerUserId),
        eq(payments.status, 'paid'),
        sql`${payments.paymentDate} >= NOW() - INTERVAL '30 days'`
      )
    );

  const totalRevenue = revenueSum?.total ? Number(revenueSum.total) : 0;

  return [
    { label: 'Total Properties', value: propertyCount?.count || 0 },
    { label: 'Active Rooms', value: roomCount?.count || 0 },
    { label: 'Total Tenants', value: tenantCount?.count || 0 },
    { label: 'Monthly Revenue', value: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(totalRevenue) },
  ];
}

/**
 * 2. Fetch Recent Payments scoped exclusively to this Owner's portfolio
 */
export async function getRecentPayments(ownerUserId: number) {
  const db = getDb();
  
  return await db
    .select({
      id: payments.id,
      tenant: users.name,
      room: rooms.roomNumber,
      amount: payments.amount,
      date: payments.paymentDate,
      status: payments.status,
    })
    .from(payments)
    .innerJoin(leases, eq(payments.leaseId, leases.id))
    .innerJoin(tenants, eq(leases.tenantId, tenants.id))
    .innerJoin(users, eq(tenants.userId, users.id))
    .innerJoin(rooms, eq(leases.roomId, rooms.id))
    .innerJoin(properties, eq(rooms.propertyId, properties.id)) // Joined to verify ownership
    .where(eq(properties.ownerId, ownerUserId))                 // 🔒 Owner Isolation Filter
    .orderBy(desc(payments.paymentDate), desc(payments.createdAt))
    .limit(5);
}

/**
 * 3. Fetch Recent Maintenance Requests logged against this Owner's rooms
 */
export async function getMaintenanceRequests(ownerUserId: number) {
  const db = getDb();
  
  return await db
    .select({
      id: maintenanceRequests.id,
      room: rooms.roomNumber,
      issue: maintenanceRequests.title,
      priority: maintenanceRequests.priority,
      status: maintenanceRequests.status,
    })
    .from(maintenanceRequests)
    .innerJoin(rooms, eq(maintenanceRequests.roomId, rooms.id))
    .innerJoin(properties, eq(rooms.propertyId, properties.id)) // Joined to verify ownership
    .where(eq(properties.ownerId, ownerUserId))                 // 🔒 Owner Isolation Filter
    .orderBy(desc(maintenanceRequests.createdAt))
    .limit(5);
}