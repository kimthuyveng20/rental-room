'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
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
import { Plus, Trash2, Loader2, AlertCircle, Building2, Users } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const roomSchema = z.object({
  propertyId: z.string().min(1, 'Please select a parent property asset'),
  roomNumber: z.string().min(1, 'Room/Suite allocation identifier is required'),
  type: z.string().min(1, 'Room configuration layout type is required'),
  capacity: z.coerce.number().min(1, 'Max target occupancy limit must be at least 1'),
  pricePerMonth: z.coerce.number().min(1, 'Base standard pricing premium rate must be greater than 0'),
  status: z.enum(['available', 'occupied', 'maintenance']),
});

type RoomFormData = z.infer<typeof roomSchema>;
 
interface DBRoom {
  id: number;
  roomNumber: string;
  type: 'single' | 'double' |'suite',
  capacity: number;
  pricePerMonth: string | number;
  status: 'available' | 'occupied' | 'maintenance';
  property: { name: string } | null;
  leases?: Array<{
    tenant?: {
      user?: { name: string };
    };
  }>;
}

interface DBPropertyOption {
  id: number;
  name: string;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<DBRoom[]>([]);
  const [properties, setProperties] = useState<DBPropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      propertyId: '',
      roomNumber: '',
      type: '',
      capacity: 1,
      pricePerMonth: 0,
      status: 'available',
    },
  });

  const syncDataStream = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (!res.ok) throw new Error('Data matrix processing execution faults');
      const data = await res.json();
      setRooms(data.rooms || []);
      setProperties(data.properties || []);
    } catch (err) {
      console.error(err);
      setErrorMessage('Could not synchronize live inventory metrics layout schemas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncDataStream();
  }, []);

  const onSubmit = async (data: RoomFormData) => {
    setErrorMessage(null);
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, amenities: [] }), // Default schema array placeholder
      });

      if (!response.ok) {
        const errPayload = await response.json();
        throw new Error(errPayload.error || 'Database storage mapping exceptions.');
      }

      form.reset();
      setOpen(false);
      await syncDataStream();
    } catch (error: any) {
      setErrorMessage(error.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'occupied': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'available': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="owner">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Validating structure properties schema values...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="owner">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Rooms</h1>
            <p className="text-muted-foreground mt-1">Manage infrastructure, capacities, and yield tables</p>
          </div>
          
          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setErrorMessage(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Room
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Register Real Asset Unit</DialogTitle>
              </DialogHeader>

              {errorMessage && (
                <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="propertyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent Complex Assignment</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select active real estate development" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {properties.map((p) => (
                              <SelectItem key={p.id} value={p.id.toString()}>
                                {p.name}
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
                    name="roomNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Identifier Code</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Suite 101, Apt 4B" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Room Type (Matches Database Enum)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select asset configuration" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {/* Make sure these match the literal strings inside your backend roomTypeEnum exactly */}
                            <SelectItem value="single">Single</SelectItem>
                            <SelectItem value="double">Double</SelectItem>
                            <SelectItem value="suite">Suite</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="capacity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Headcount Capacity</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pricePerMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price Per Month ($)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="1250.00" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Current Operation Status</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">Available / Clean</SelectItem>
                            <SelectItem value="occupied">Occupied</SelectItem>
                            <SelectItem value="maintenance">Maintenance Log</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Writing System Blocks...' : 'Save Unit Structure Log'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Database Grid Table Layout */}
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    <th className="text-left py-3 px-4 font-semibold">Location Allocation</th>
                    <th className="text-left py-3 px-4 font-semibold">Unit Type</th>
                    <th className="text-left py-3 px-4 font-semibold">Max Capacity</th>
                    <th className="text-left py-3 px-4 font-semibold">Price / Month</th>
                    <th className="text-left py-3 px-4 font-semibold">Active Occupant Base</th>
                    <th className="text-left py-3 px-4 font-semibold">State</th>
                    <th className="text-left py-3 px-4 font-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No active managed rooms records found in the system registry layout.
                      </td>
                    </tr>
                  ) : (
                    rooms.map((room) => {
                      const activeLeaseInstance = room.leases?.find(() => true); 
                      const occupantIdentityString = activeLeaseInstance?.tenant?.user?.name || null;

                      return (
                        <tr key={room.id} className="border-b hover:bg-muted/50 transition-colors">
                          <td className="py-3 px-4 font-medium text-foreground">
                            <div className="flex flex-col">
                              <span>#{room.roomNumber}</span>
                              <span className="text-xs text-muted-foreground flex items-center gap-1 font-normal">
                                <Building2 className="w-3 h-3" /> {room.property?.name || 'Unassigned Asset'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-foreground capitalize">{room.type}</td>
                          <td className="py-3 px-4">
                            <span className="flex items-center gap-1 font-mono text-xs text-foreground">
                              <Users className="w-3 h-3 text-muted-foreground" /> Max {room.capacity}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold text-foreground">
                            ${Number(room.pricePerMonth).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-4 font-medium">
                            {occupantIdentityString ? (
                              <span className="text-primary font-semibold">{occupantIdentityString}</span>
                            ) : (
                              <span className="text-muted-foreground font-mono italic text-xs">Vacant Registry</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`${getStatusColor(room.status)} shadow-none border-none capitalize`}>
                              {room.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}