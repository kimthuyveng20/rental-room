'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import { Button } from '@/src/components/ui/button';
import { FileText, Download, Printer } from 'lucide-react';

interface InvoiceDetailProps {
  roomNumber: string;
  tenantName: string;
  billingPeriod: string;
  dueDate: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  waterLastMonth: number;
  waterThisMonth: number;
  waterUsage: number;
  waterRate: string;
  waterTotal: string;
  electricityLastMonth: number;
  electricityThisMonth: number;
  electricityUsage: number;
  electricityRate: string;
  electricityTotal: string;
  roomRent: string;
  grandTotal: string;
}

export function InvoiceDetail({
  roomNumber,
  tenantName,
  billingPeriod,
  dueDate,
  status,
  waterLastMonth,
  waterThisMonth,
  waterUsage,
  waterRate,
  waterTotal,
  electricityLastMonth,
  electricityThisMonth,
  electricityUsage,
  electricityRate,
  electricityTotal,
  roomRent,
  grandTotal,
}: InvoiceDetailProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Invoice</h1>
          <p className="text-muted-foreground mt-1">Billing Period: {billingPeriod}</p>
        </div>
        <div className="text-right">
          <Badge className={getStatusColor(status)}>
            {status.toUpperCase()}
          </Badge>
          <p className="text-sm text-muted-foreground mt-2">Due: {dueDate}</p>
        </div>
      </div>

      {/* Room and Tenant Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Billing Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Room Number</p>
              <p className="font-semibold text-lg">{roomNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tenant Name</p>
              <p className="font-semibold text-lg">{tenantName}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Utilities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Water */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Water Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Last Month</p>
                <p className="font-semibold">{waterLastMonth} units</p>
              </div>
              <div>
                <p className="text-muted-foreground">This Month</p>
                <p className="font-semibold">{waterThisMonth} units</p>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm mb-2">
                <p className="text-muted-foreground">Usage</p>
                <p className="font-semibold">{waterUsage} units</p>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <p className="text-muted-foreground">Rate</p>
                <p className="font-semibold">${waterRate} per unit</p>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <p className="font-semibold">Total</p>
                <p className="font-bold text-lg">${waterTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Electricity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Electricity Usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Last Month</p>
                <p className="font-semibold">{electricityLastMonth} kWh</p>
              </div>
              <div>
                <p className="text-muted-foreground">This Month</p>
                <p className="font-semibold">{electricityThisMonth} kWh</p>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-sm mb-2">
                <p className="text-muted-foreground">Usage</p>
                <p className="font-semibold">{electricityUsage} kWh</p>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <p className="text-muted-foreground">Rate</p>
                <p className="font-semibold">${electricityRate} per kWh</p>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <p className="font-semibold">Total</p>
                <p className="font-bold text-lg">${electricityTotal}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm pb-3 border-b">
              <p className="text-muted-foreground">Water</p>
              <p>${waterTotal}</p>
            </div>
            <div className="flex justify-between text-sm pb-3 border-b">
              <p className="text-muted-foreground">Electricity</p>
              <p>${electricityTotal}</p>
            </div>
            <div className="flex justify-between text-sm pb-3 border-b">
              <p className="text-muted-foreground">Room Rent</p>
              <p>${roomRent}</p>
            </div>
            <div className="flex justify-between text-lg font-bold pt-3 border-t">
              <p>Grand Total</p>
              <p className="text-primary text-xl">${grandTotal}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button variant="outline" size="sm">
          <FileText className="w-4 h-4 mr-2" />
          View PDF
        </Button>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" size="sm">
          <Printer className="w-4 h-4 mr-2" />
          Print
        </Button>
      </div>
    </div>
  );
}
