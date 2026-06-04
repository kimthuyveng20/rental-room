import { getMaintenanceData } from '@/src/actions/maintenance';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { MaintenanceClient } from '@/src/components/maintenance-client';

export default async function MaintenancePage() {
  const requests = await getMaintenanceData();

  return (
    <DashboardLayout userRole="owner">
      <MaintenanceClient initialRequests={requests} />
    </DashboardLayout>
  );
}