
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

export default function DashboardPage() {
  // Mock data - replace with actual API calls
  const stats = [
    {
      label: 'Total Properties',
      value: 12,
      icon: Building,
      color: 'bg-blue-100 text-blue-700',
    },
    {
      label: 'Active Rooms',
      value: 48,
      icon: DoorOpen,
      color: 'bg-green-100 text-green-700',
    },
    {
      label: 'Total Tenants',
      value: 45,
      icon: Users,
      color: 'bg-purple-100 text-purple-700',
    },
    {
      label: 'Monthly Revenue',
      value: '$12,450',
      icon: DollarSign,
      color: 'bg-orange-100 text-orange-700',
    },
  ];

  const recentPayments = [
    {
      id: 1,
      tenant: 'John Smith',
      room: '101',
      amount: '$1,200',
      date: '2024-06-01',
      status: 'completed',
    },
    {
      id: 2,
      tenant: 'Jane Doe',
      room: '202',
      amount: '$1,200',
      date: '2024-06-02',
      status: 'completed',
    },
    {
      id: 3,
      tenant: 'Mike Johnson',
      room: '103',
      amount: '$1,200',
      date: '2024-06-03',
      status: 'pending',
    },
  ];

  const maintenanceRequests = [
    {
      id: 1,
      room: '205',
      issue: 'Broken door handle',
      priority: 'high',
      status: 'open',
      date: '2024-06-04',
    },
    {
      id: 2,
      room: '112',
      issue: 'Leaky faucet',
      priority: 'medium',
      status: 'in-progress',
      date: '2024-06-03',
    },
    {
      id: 3,
      room: '308',
      issue: 'AC not working',
      priority: 'high',
      status: 'open',
      date: '2024-06-02',
    },
  ];

  return (
    <DashboardLayout userRole="owner">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Welcome back! Here&apos;s your property overview.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="text-2xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-lg ${stat.color}`}>
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
            <TabsTrigger value="payments">Recent Payments</TabsTrigger>
            <TabsTrigger value="maintenance">Maintenance Requests</TabsTrigger>
          </TabsList>

          {/* Recent Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
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
                          Room {payment.room} • {payment.date}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold">{payment.amount}</span>
                        <Badge
                          variant={
                            payment.status === 'completed'
                              ? 'default'
                              : 'secondary'
                          }
                        >
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Payments
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Maintenance Requests Tab */}
          <TabsContent value="maintenance">
            <Card>
              <CardHeader>
                <CardTitle>Maintenance Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {maintenanceRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">Room {request.room}</p>
                        <p className="text-sm text-muted-foreground">
                          {request.issue}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Badge
                          variant={
                            request.priority === 'high'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {request.priority}
                        </Badge>
                        {request.status === 'open' && (
                          <AlertCircle className="w-5 h-5 text-red-500" />
                        )}
                        {request.status === 'in-progress' && (
                          <Clock className="w-5 h-5 text-yellow-500" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Requests
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
