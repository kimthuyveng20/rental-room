'use client';

import { useState } from 'react';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/src/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/src/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import { Textarea } from '@/src/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { Plus, AlertCircle, Clock, CheckCircle, Wrench } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';

const maintenanceSchema = z.object({
  room: z.string().min(1, 'Room is required'),
  issue: z.string().min(1, 'Issue description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  description: z.string().optional(),
});

type MaintenanceFormData = z.infer<typeof maintenanceSchema>;

export default function MaintenancePage() {
  const [requests, setRequests] = useState([
    {
      id: 1,
      room: '205',
      issue: 'Broken door handle',
      priority: 'high',
      status: 'open',
      date: '2024-06-04',
      assignedTo: 'Unassigned',
      description: 'Main door handle is broken and needs replacement',
    },
    {
      id: 2,
      room: '112',
      issue: 'Leaky faucet',
      priority: 'medium',
      status: 'in-progress',
      date: '2024-06-03',
      assignedTo: 'John Contractor',
      description: 'Kitchen sink faucet is leaking',
    },
    {
      id: 3,
      room: '308',
      issue: 'AC not working',
      priority: 'high',
      status: 'open',
      date: '2024-06-02',
      assignedTo: 'Unassigned',
      description: 'Air conditioning unit not turning on',
    },
    {
      id: 4,
      room: '101',
      issue: 'Paint touch-ups needed',
      priority: 'low',
      status: 'completed',
      date: '2024-05-28',
      assignedTo: 'Mike Painter',
      description: 'Interior walls need paint touch-ups',
    },
  ]);

  const [open, setOpen] = useState(false);
  const form = useForm<MaintenanceFormData>({
    resolver: zodResolver(maintenanceSchema),
    defaultValues: {
      room: '',
      issue: '',
      priority: 'medium',
      description: '',
    },
  });

  const onSubmit = async (data: MaintenanceFormData) => {
    const newRequest = {
      id: requests.length + 1,
      ...data,
      status: 'open',
      date: format(new Date(), 'yyyy-MM-dd'),
      assignedTo: 'Unassigned',
    };
    setRequests([...requests, newRequest]);
    form.reset();
    setOpen(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'in-progress':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return null;
    }
  };

  const stats = [
    {
      label: 'Open Requests',
      value: requests.filter((r) => r.status === 'open').length,
      color: 'text-red-600',
    },
    {
      label: 'In Progress',
      value: requests.filter((r) => r.status === 'in-progress').length,
      color: 'text-yellow-600',
    },
    {
      label: 'Completed',
      value: requests.filter((r) => r.status === 'completed').length,
      color: 'text-green-600',
    },
  ];

  return (
    <DashboardLayout userRole="owner">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Maintenance</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage maintenance requests
            </p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Request
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Maintenance Request</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="room"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Number</FormLabel>
                        <FormControl>
                          <input
                            placeholder="e.g., 101"
                            {...field}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="issue"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Issue</FormLabel>
                        <FormControl>
                          <input
                            placeholder="Brief description of the issue"
                            {...field}
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="low">Low</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Detailed Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Provide more details about the maintenance issue..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full">
                    Create Request
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className={`text-3xl font-bold mt-2 ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                  <Wrench className={`w-8 h-8 ${stat.color} opacity-50`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Requests Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="in-progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <div className="space-y-3">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          {getStatusIcon(request.status)}
                          <div>
                            <p className="font-semibold">
                              Room {request.room}: {request.issue}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {request.description}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">
                              Created: {format(new Date(request.date), 'MMM dd, yyyy')} •
                              Assigned to: {request.assignedTo}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="open" className="mt-6">
                <div className="space-y-3">
                  {requests
                    .filter((r) => r.status === 'open')
                    .map((request) => (
                      <div
                        key={request.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">
                            Room {request.room}: {request.issue}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {request.description}
                          </p>
                        </div>
                        <Badge className={getPriorityColor(request.priority)}>
                          {request.priority}
                        </Badge>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="in-progress" className="mt-6">
                <div className="space-y-3">
                  {requests
                    .filter((r) => r.status === 'in-progress')
                    .map((request) => (
                      <div
                        key={request.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">
                            Room {request.room}: {request.issue}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Assigned to: {request.assignedTo}
                          </p>
                        </div>
                        <Badge variant="secondary">{request.status}</Badge>
                      </div>
                    ))}
                </div>
              </TabsContent>

              <TabsContent value="completed" className="mt-6">
                <div className="space-y-3">
                  {requests
                    .filter((r) => r.status === 'completed')
                    .map((request) => (
                      <div
                        key={request.id}
                        className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex-1">
                          <p className="font-semibold">
                            Room {request.room}: {request.issue}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Completed on:{' '}
                            {format(new Date(request.date), 'MMM dd, yyyy')}
                          </p>
                        </div>
                        <Badge variant="default">Completed</Badge>
                      </div>
                    ))}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
