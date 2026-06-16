import { getMaintenanceData, getRoomsForOwner } from '@/src/actions/maintenance';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { MaintenanceClient } from '@/src/components/maintenance-client';

export default async function MaintenancePage() {
  const requests = await getMaintenanceData();
  const rooms = await getRoomsForOwner();

  return (
    <DashboardLayout userRole="owner">
      <MaintenanceClient initialRequests={requests}  rooms={rooms}/>
    </DashboardLayout>
  );
}