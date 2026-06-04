import { db } from '@/src/lib/db'; // Path to your drizzle db initialization
import { properties, rooms, tenants, payments, maintenanceRequests, leases, users } from '@/src/lib/db/schema';
import { eq, and, sql, desc } from 'drizzle-orm';

export async function getDashboardStats() {
  // 1. Total Properties
  const [propertyCount] = await db.select({ count: sql<number>`count(*)` }).from(properties);

  // 2. Active Rooms (Status is occupied or available, adjusting based on your preference)
  const [roomCount] = await db.select({ count: sql<number>`count(*)` }).from(rooms);

  // 3. Total Tenants
  const [tenantCount] = await db.select({ count: sql<number>`count(*)` }).from(tenants);

  // 4. Monthly Revenue (Sum of completed/paid payments within the last 30 days)
  const [revenueSum] = await db
    .select({ total: sql<number>`sum(${payments.amount})` })
    .from(payments)
    .where(
      and(
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

export async function getRecentPayments() {
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
    .orderBy(desc(payments.paymentDate))
    .limit(5);
}

export async function getMaintenanceRequests() {
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
    .orderBy(desc(maintenanceRequests.createdAt))
    .limit(5);
}

