// src/app/dashboard/page.tsx
import { Card, CardContent } from '@/src/components/ui/card';
import { Building, DoorOpen, Users, DollarSign } from 'lucide-react';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { getDashboardStats, getMaintenanceRequests, getRecentPayments } from '@/src/lib/queries';
import { getTranslations } from 'next-intl/server';
import { DashboardTabs } from '@/src/components/dashboard-tabs'; // Import new client handler

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

  // Format key objects to pass down translations cleanly to a client scope safely
  const clientTranslations = {
    tabs: {
      recentPayments: t('tabs.recentPayments'),
      maintenanceRequests: t('tabs.maintenanceRequests'),
    },
    payments: {
      title: t('payments.title'),
      viewAll: t('payments.viewAll'),
    },
    maintenance: {
      title: t('maintenance.title'),
    }
  };

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

        {/* Mounted Interactivity Client Tab component containing inline pagination layout engines */}
        <DashboardTabs 
          recentPayments={recentPayments} 
          maintenanceRequests={maintenanceRequests} 
          translations={clientTranslations}
        />
      </div>
    </DashboardLayout>
  );
}