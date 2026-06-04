'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { Card, CardContent } from '@/src/components/ui/card';
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
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Plus, Calendar, FileText, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';

const leaseSchema = z.object({
  roomId: z.string().min(1, 'Room selection is required'),
  tenantId: z.string().min(1, 'Tenant assignment is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  rentAmount: z.coerce.number().min(1, 'Rent amount must be greater than 0'),
  depositAmount: z.coerce.number().min(0, 'Deposit cannot be negative'),
  notes: z.string().optional(),
});

type LeaseFormData = z.infer<typeof leaseSchema>;

interface DBLease {
  id: number;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  status: string;
  room: { id: number; roomNumber: string };
  tenant: { user: { name: string } };
}

export default function LeasesPage() {
  const [leases, setLeases] = useState<DBLease[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: number; roomNumber: string }>>([]);
  const [tenants, setTenants] = useState<Array<{ id: number; user: { name: string } }>>([]);
  
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema),
    defaultValues: {
      roomId: '',
      tenantId: '',
      startDate: '',
      endDate: '',
      rentAmount: 0,
      depositAmount: 0,
      notes: '',
    },
  });

  const loadData = async () => {
    try {
      const response = await fetch('/api/leases');
      if (response.ok) {
        const data = await response.json();
        setLeases(data.leases);
        setRooms(data.rooms);
        setTenants(data.tenants);
      }
    } catch (error) {
      console.error('Initialization Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onSubmit = async (data: LeaseFormData) => {
    try {
      const response = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        form.reset();
        setOpen(false);
        await loadData(); // Reload both options and layout lists
      }
    } catch (error) {
      console.error('Error creating lease:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'terminated': return 'bg-amber-100 text-amber-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const today = new Date();
    const days = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  if (loading) {
    return (
      <DashboardLayout userRole="owner">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Synchronizing live rental registries...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="owner">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Leases</h1>
            <p className="text-muted-foreground mt-1">Manage rental agreements and leases</p>
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> New Lease
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Lease</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  
                  {/* Dynamic Selection Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="roomId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign Vacant Room</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select available room" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {rooms.map((room) => (
                                <SelectItem key={room.id} value={room.id.toString()}>
                                  Room {room.roomNumber}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tenantId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assign Tenant Profile</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select tenant" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tenants.map((t) => (
                                <SelectItem key={t.id} value={t.id.toString()}>
                                  {t.user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Dates Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Financial Metrics Row */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Rent ($)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="1200" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="depositAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Security Deposit ($)</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="2400" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional lease terms or notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Writing to Ledger...' : 'Create & Authenticate Lease'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Leases List Rendering Section */}
        <div className="space-y-4">
          {leases.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-background">
              <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No active rental agreements found.</p>
            </div>
          ) : (
            leases.map((lease) => {
              const daysRemaining = getDaysRemaining(lease.endDate);
              const isExpiringSoon = lease.status === 'active' && daysRemaining > 0 && daysRemaining < 30;

              return (
                <Card key={lease.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="p-3 rounded-lg bg-muted">
                            <FileText className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {lease.tenant?.user?.name || "Unknown Tenant"}
                              <span className="text-muted-foreground text-sm ml-2">
                                • Room {lease.room?.roomNumber || "N/A"}
                              </span>
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {format(new Date(lease.startDate), 'MMM dd, yyyy')} -{' '}
                                {format(new Date(lease.endDate), 'MMM dd, yyyy')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 ml-4">
                        <div className="text-right">
                          <p className="font-semibold">${Number(lease.monthlyRent).toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">Monthly Rent</p>
                        </div>

                        <div className="text-right min-w-[100px]">
                          {lease.status === 'active' && daysRemaining > 0 ? (
                            <p className="text-sm font-medium text-green-600 mb-1">
                              {daysRemaining} days left
                            </p>
                          ) : (
                            <p className="text-sm font-medium text-destructive mb-1">
                              Agreement Finished
                            </p>
                          )}
                          <Badge className={getStatusColor(isExpiringSoon ? 'expiring-soon' : lease.status)}>
                            {isExpiringSoon ? 'Expiring Soon' : lease.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}