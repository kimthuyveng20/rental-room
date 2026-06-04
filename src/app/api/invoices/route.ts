import { NextResponse } from 'next/server';
import { db } from '@/src/lib/db';
import { invoices } from '@/src/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
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
    } = body;

    // Fetch the lease record from relationship to pull authoritative room & tenant data
    const activeLease = await db.query.leases.findFirst({
      where: (leases, { eq }) => eq(leases.id, Number(leaseId)),
      with: {
        room: true,
        tenant: { with: { user: true } },
      },
    });

    if (!activeLease) {
      return NextResponse.json({ error: 'Selected active lease not found' }, { status: 404 });
    }

    // Calculations
    const waterUsage = Math.max(0, Number(waterThisMonth) - Number(waterLastMonth));
    const waterTotal = (waterUsage * Number(waterRate)).toFixed(2);

    const electricityUsage = Math.max(0, Number(electricityThisMonth) - Number(electricityLastMonth));
    const electricityTotal = (electricityUsage * Number(electricityRate)).toFixed(2);

    const roomRent = activeLease.monthlyRent; // Authoritative value directly from lease contract
    const grandTotal = (
      Number(roomRent) +
      Number(waterTotal) +
      Number(electricityTotal)
    ).toFixed(2);

    // Write directly into invoice schema using relationship lookups
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
    }).returning();

    return NextResponse.json(newInvoice, { status: 201 });
  } catch (error) {
    console.error('CREATE_INVOICE_ERROR:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

export async function GET() {
 try {
  // We pass a configuration object to findMany to include nested relations
  const data = await db.query.invoices.findMany({
    with: {
      lease: {
        with: {
          tenant: {
            with: {
              user: true 
            }
          },
          room: true 
        }
      }
    }
  });

  return NextResponse.json(data || []); 
} catch (error) {
  console.error("BACKEND_INVOICE_CRASH:", error);
  return NextResponse.json({ error: "Failed to load invoices records matrix" }, { status: 500 });
}
}