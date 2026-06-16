'use server';

import { eq, and, desc, exists } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { maintenanceRequests, rooms, properties } from '../lib/db/schema';
import { getDb } from '../lib/db';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/src/lib/auth";

/**
 * 1. GET: Fetch maintenance data isolated strictly to the logged-in owner's property rooms
 */
export async function getMaintenanceData() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const currentUserId = Number(session.user.id);
  const db = getDb();

  // 🔒 Owner Isolation: Only select requests linked to rooms whose properties belong to this owner
  return await db
    .select({
      id: maintenanceRequests.id,
      room: rooms.roomNumber,
      roomId: maintenanceRequests.roomId,
      issue: maintenanceRequests.title,
      description: maintenanceRequests.description,
      priority: maintenanceRequests.priority,
      status: maintenanceRequests.status,
      date: maintenanceRequests.createdAt,
      assignedTo: maintenanceRequests.reportedByUserId, 
    })
    .from(maintenanceRequests)
    .innerJoin(rooms, eq(maintenanceRequests.roomId, rooms.id))
    .innerJoin(properties, eq(rooms.propertyId, properties.id))
    .where(eq(properties.ownerId, currentUserId))
    .orderBy(desc(maintenanceRequests.createdAt));
}

/**
 * 2. POST: Create a maintenance request verifying room ownership
 */
export async function createMaintenanceRequest(formData: {
  roomNumber: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const currentUserId = Number(session.user.id);
  const db = getDb();

  // 🔒 Owner Isolation Guard: Check if the room exists AND belongs to a property owned by this user
  const [matchedRoom] = await db
    .select({ id: rooms.id })
    .from(rooms)
    .innerJoin(properties, eq(rooms.propertyId, properties.id))
    .where(
      and(
        eq(rooms.roomNumber, formData.roomNumber),
        eq(properties.ownerId, currentUserId)
      )
    )
    .limit(1);

  if (!matchedRoom) {
    throw new Error(`Room ${formData.roomNumber} does not exist in your properties.`);
  }

  // Insert request securely tagging the authenticated owner as the reporter
  await db.insert(maintenanceRequests).values({
    roomId: matchedRoom.id,
    reportedByUserId: currentUserId, // 🔒 Safe user context mapping
    title: formData.title,
    description: formData.description || '',
    priority: formData.priority,
    status: 'open',
  });

  revalidatePath('/maintenance');
}

export async function getRoomsForOwner() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new Error('Unauthorized');

  const db = getDb();
  return await db
    .select({
      id: rooms.id,
      roomNumber: rooms.roomNumber,
    })
    .from(rooms)
    .innerJoin(properties, eq(rooms.propertyId, properties.id))
    .where(eq(properties.ownerId, Number(session.user.id)));
}