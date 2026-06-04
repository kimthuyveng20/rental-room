import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Badge } from '@/src/components/ui/badge';
import {
  Building,
  DoorOpen,
  Users,
  DollarSign,
  AlertCircle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { getDashboardStats, getMaintenanceRequests, getRecentPayments } from '@/src/lib/queries';
import { getTranslations } from 'next-intl/server';

// Icon styling dictionary matching your schema metrics
const STATS_CONFIG: Record<string, { icon: any; color: string }> = {
  'Total Properties': { icon: Building, color: 'bg-blue-100 text-blue-700' },
  'Active Rooms': { icon: DoorOpen, color: 'bg-green-100 text-green-700' },
  'Total Tenants': { icon: Users, color: 'bg-purple-100 text-purple-700' },
  'Monthly Revenue': { icon: DollarSign, color: 'bg-orange-100 text-orange-700' },
};

export default async function DashboardPage() {
  const [dbStats, recentPayments, maintenanceRequests] = await Promise.all([
    getDashboardStats(),
    getRecentPayments(),
    getMaintenanceRequests(),
  ]);

  const t = await getTranslations("dashboard");

  return (
    <DashboardLayout userRole="owner">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">
            {t('welcomeMessage')}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {dbStats.map((stat) => {
            const config = STATS_CONFIG[stat.label] || { icon: Building, color: 'bg-gray-100 text-gray-700' };
            const Icon = config.icon;
            
            // Generate a clean key for localization (e.g., "Total Properties" -> "totalProperties")
            const translationKey = stat.label.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (m, chr) => chr.toUpperCase());

            return (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t(`stats.${translationKey}`, { defaultValue: stat.label })}
                      </p>
                      <p className="text-2xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${config.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="payments" className="w-full">
          <TabsList>
            <TabsTrigger value="payments">{t('tabs.recentPayments')}</TabsTrigger>
            <TabsTrigger value="maintenance">{t('tabs.maintenanceRequests')}</TabsTrigger>
          </TabsList>

          {/* Recent Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>{t('payments.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{payment.tenant}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('payments.roomInfo', { room: payment.room })} • {payment.date ? new Date(payment.date).toLocaleDateString() : t('common.na')}
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
                          {t(`payments.status.${payment.status}`, { defaultValue: payment.status })}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  {t('payments.viewAll')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Requests Tab */}
          <TabsContent value="maintenance">
            <Card>
              <CardHeader>
                <CardTitle>{t('maintenance.title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {maintenanceRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{t('maintenance.roomInfo', { room: request.room })}</p>
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
                          {t(`maintenance.priority.${request.priority}`, { defaultValue: request.priority })}
                        </Badge>
                        {request.status === 'open' && (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        {request.status === 'in_progress' && (
                          <Clock className="w-5 h-5 text-yellow-500" />
                        )}
                        {request.status === 'completed' && (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  {t('maintenance.viewAll')}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}