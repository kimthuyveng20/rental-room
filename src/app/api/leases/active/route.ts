import { getDb } from '@/src/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = getDb();
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

    return NextResponse.json(activeLeases);
  } catch (error) {
    console.error('FETCH_ACTIVE_LEASES_ERROR:', error);
    return NextResponse.json({ error: 'Failed to fetch active leases' }, { status: 500 });
  }
}