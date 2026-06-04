import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';

export async function GET() {
  try {
    const activeLeases = await db.query.leases.findMany({
      where: (leases, { eq }) => eq(leases.status, 'active'),
      with: {
        room: true,
        tenant: {
          with: {
            user: true,
          },
        },
      },
    });
    console.log("Leases", activeLeases)
    return NextResponse.json(activeLeases);
  } catch (error) {
    console.error('FETCH_ACTIVE_LEASES_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch active leases' }, { status: 500 });
  }
}