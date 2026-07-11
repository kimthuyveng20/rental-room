
import { getDashboardStats, getMaintenanceRequests, getRecentPayments } from '@/src/actions/dashboard';
import { NextResponse } from 'next/server';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const ownerIdStr = searchParams.get('ownerId');

    if (!ownerIdStr) {
      return NextResponse.json({ error: 'Missing ownerId parameter' }, { status: 400 });
    }

    const ownerUserId = parseInt(ownerIdStr, 10);
    if (isNaN(ownerUserId)) {
      return NextResponse.json({ error: 'Invalid ownerId' }, { status: 400 });
    }

    // Fetch all data concurrently to optimize performance
    const [stats, recentPayments, maintenanceRequests] = await Promise.all([
      getDashboardStats(ownerUserId),
      getRecentPayments(ownerUserId),
      getMaintenanceRequests(ownerUserId),
    ]);

    // Return a structured JSON response
    return NextResponse.json({
      success: true,
      data: {
        stats,
        recentPayments,
        maintenanceRequests,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}