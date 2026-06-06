'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Badge } from '@/src/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';

interface Payment {
  id: number;
  tenant: string;
  room: string;
  date: string | null;
  amount: string;
  status: "pending" | "paid" | "overdue";
}


interface MaintenanceRequest {
  id: number;
  room: string;
  issue: string;
  priority: string;
  status: 'open' | 'in_progress' |'completed';
}

interface DashboardTabsProps {
  recentPayments: Payment[];
  maintenanceRequests: MaintenanceRequest[];
  translations: any; // Dynamic localization object payload passed down from server parent
}

export function DashboardTabs({ recentPayments, maintenanceRequests, translations: t }: DashboardTabsProps) {
  // Tracking toggles for inline expansion lists
  const [showAllPayments, setShowAllPayments] = useState(false);
  const [showAllMaintenance, setShowAllMaintenance] = useState(false);

  // Pagination index states
  const [paymentPage, setPaymentPage] = useState(1);
  const [maintenancePage, setMaintenancePage] = useState(1);
  
  const ITEMS_PER_PAGE = 10;

  // --- Calculations for Payments ---
  const totalPaymentsCount = recentPayments.length;
  const standardPaymentSlice = showAllPayments 
    ? recentPayments.slice((paymentPage - 1) * ITEMS_PER_PAGE, paymentPage * ITEMS_PER_PAGE)
    : recentPayments.slice(0, 1); // Defaults to showing exactly 1 item

  const totalPaymentPages = Math.ceil(totalPaymentsCount / ITEMS_PER_PAGE);

  // --- Calculations for Maintenance ---
  const totalMaintenanceCount = maintenanceRequests.length;
  const standardMaintenanceSlice = showAllMaintenance
    ? maintenanceRequests.slice((maintenancePage - 1) * ITEMS_PER_PAGE, maintenancePage * ITEMS_PER_PAGE)
    : maintenanceRequests.slice(0, 1); // Defaults to showing exactly 1 item

  const totalMaintenancePages = Math.ceil(totalMaintenanceCount / ITEMS_PER_PAGE);

  return (
    <Tabs defaultValue="payments" className="w-full">
      <TabsList>
        <TabsTrigger value="payments">{t.tabs?.recentPayments || "Recent Payments"}</TabsTrigger>
        <TabsTrigger value="maintenance">{t.tabs?.maintenanceRequests || "Maintenance Requests"}</TabsTrigger>
      </TabsList>

      {/* RECENT PAYMENTS TAB ZONE */}
      <TabsContent value="payments">
        <Card>
          <CardHeader>
            <CardTitle>{t.payments?.title || "Payments Status"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {standardPaymentSlice.map((payment) => (
                <div
                  key={payment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">{payment.tenant}</p>
                    <p className="text-sm text-muted-foreground">
                      Room {payment.room} • {payment.date ? new Date(payment.date).toLocaleDateString() : "N/A"}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-semibold">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(payment.amount))}
                    </span>
                    <Badge
                      variant={
                        payment.status === 'paid'
                          ? 'default'
                          : payment.status === 'overdue'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {payment.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls Rendering Zone */}
            {showAllPayments && totalPaymentPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-xs text-muted-foreground">
                  Page {paymentPage} of {totalPaymentPages} ({totalPaymentsCount} entries)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={paymentPage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPaymentPage((prev) => Math.min(prev + 1, totalPaymentPages))}
                    disabled={paymentPage === totalPaymentPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {!showAllPayments && totalPaymentsCount > 1 && (
              <Button variant="outline" className="w-full mt-4" onClick={() => setShowAllPayments(true)}>
                {t.payments?.viewAll || "View All Payments"}
              </Button>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* MAINTENANCE REQUESTS TAB ZONE */}
      <TabsContent value="maintenance">
        <Card>
          <CardHeader>
            <CardTitle>{t.maintenance?.title || "Maintenance Ledger"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {standardMaintenanceSlice.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-medium">Room {request.room}</p>
                    <p className="text-sm text-muted-foreground">{request.issue}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={
                        request.priority === 'urgent' || request.priority === 'high'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {request.priority}
                    </Badge>
                    {request.status === 'open' && <AlertCircle className="w-5 h-5 text-red-500" />}
                    {request.status === 'in_progress' && <Clock className="w-5 h-5 text-yellow-500" />}
                    {request.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls Rendering Zone */}
            {showAllMaintenance && totalMaintenancePages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t mt-4">
                <p className="text-xs text-muted-foreground">
                  Page {maintenancePage} of {totalMaintenancePages} ({totalMaintenanceCount} entries)
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMaintenancePage((prev) => Math.max(prev - 1, 1))}
                    disabled={maintenancePage === 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMaintenancePage((prev) => Math.min(prev + 1, totalMaintenancePages))}
                    disabled={maintenancePage === totalMaintenancePages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {!showAllMaintenance && totalMaintenanceCount > 1 && (
              <Button variant="outline" className="w-full mt-4" onClick={() => setShowAllMaintenance(true)}>
                {t.payments?.viewAll || "View All Payments"}
              </Button>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}