'use server';

import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { maintenanceRequests, rooms } from '../lib/db/schema';
import { db } from '../lib/db';

// Query to fetch all requests with room numbers mapped correctly
export async function getMaintenanceData() {
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
      // For now, we mimic fallback or pull assigned personnel if your schema scales
      assignedTo: maintenanceRequests.reportedByUserId, 
    })
    .from(maintenanceRequests)
    .innerJoin(rooms, eq(maintenanceRequests.roomId, rooms.id))
    .orderBy(desc(maintenanceRequests.createdAt));
}

// Server Action to add data safely
export async function createMaintenanceRequest(formData: {
  roomNumber: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description?: string;
}) {
  // Find the internal roomId based on user-entered string roomNumber
  const [matchedRoom] = await db
    .select()
    .from(rooms)
    .where(eq(rooms.roomNumber, formData.roomNumber))
    .limit(1);

  if (!matchedRoom) {
    throw new Error(`Room ${formData.roomNumber} does not exist.`);
  }

  // Fallback System User ID for mock owner entries until auth session is passed
  const fallbackUserId = 1; 

  await db.insert(maintenanceRequests).values({
    roomId: matchedRoom.id,
    reportedByUserId: fallbackUserId,
    title: formData.title,
    description: formData.description || '',
    priority: formData.priority,
    status: 'open',
  });

  // Automatically refresh server data cache seamlessly
  revalidatePath('/maintenance');
}