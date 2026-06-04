'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
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
import { Textarea } from '@/src/components/ui/textarea';
import { Plus, Edit2, MapPin, Loader2, AlertCircle, Home } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Client verification layout validation schema
const propertySchema = z.object({
  name: z.string().min(1, 'Property name is required'),
  address: z.string().min(1, 'Street physical address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State jurisdiction code is required'),
  zipCode: z.string().min(1, 'Postal zip code tracking indicator is required'),
  description: z.string().optional(),
});

type PropertyFormData = z.infer<typeof propertySchema>;

interface DBRoomRelation {
  id: number;
  status: 'available' | 'occupied' | 'maintenance';
}

interface DBProperty {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string; // Reflects your database 'zip' field syntax configuration
  description: string | null;
  rooms: DBRoomRelation[];
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<DBProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      description: '',
    },
  });

  const syncPropertiesMatrix = async () => {
    try {
      const response = await fetch('/api/properties');
      if (!response.ok) throw new Error('Data processing transmission failure');
      const synchronizedArray = await response.json();
      setProperties(synchronizedArray);
    } catch (error) {
      console.error(error);
      setErrorMessage('Could not load synced property listings matrix array.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncPropertiesMatrix();
  }, []);

  const onSubmit = async (data: PropertyFormData) => {
    setErrorMessage(null);
    try {
      const response = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Server rejected runtime parameters data pipeline write');
      }

      form.reset();
      setOpen(false);
      await syncPropertiesMatrix();
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally{
        form.clearErrors();
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="owner">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Compiling estate framework records mapping arrays...</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="owner">
      <div className="space-y-6">
        {/* Header Block */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Properties</h1>
            <p className="text-muted-foreground mt-1">Real-time complex inventory tracking log analytics</p>
          </div>
          
          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) { form.reset(); setErrorMessage(null); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Property
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Provision New Property Development</DialogTitle>
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
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Development Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Summit Ridge Apartments" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Location Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St Suite C" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="New York" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input placeholder="NY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Public Profile Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter asset parameter structural notes..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Writing System Blocks...' : 'Save Estate Configuration Block'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Standalone Fallback Banner */}
        {errorMessage && !open && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cards Grid Grid Layout Section */}
        {properties.length === 0 ? (
          <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Home className="w-8 h-8 text-muted-foreground/60" />
            <p>No managed property entities parsed inside database instances.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {properties.map((property) => {
              // RENDER COMPUTATION ARRAY CALCULATIONS FROM LIVE MATRIX
              const totalRoomsCalculated = property.rooms?.length || 0;
              const occupiedRoomsCalculated = property.rooms?.filter(r => r.status === 'occupied').length || 0;
              
              const occupancyPercentageRate = totalRoomsCalculated > 0 
                ? Math.round((occupiedRoomsCalculated / totalRoomsCalculated) * 100)
                : 0;

              return (
                <Card key={property.id} className="hover:shadow-md transition-shadow flex flex-col justify-between">
                  <CardHeader>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="truncate text-xl">{property.name}</CardTitle>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1 truncate">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground/80" />
                          <span className="truncate">
                            {property.address}, {property.city}, {property.state} {property.zip}
                          </span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                        <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {property.description || <span className="italic opacity-60 text-xs">No descriptive tags documented.</span>}
                    </p>
                    
                    {/* Database Relational Calculations Section */}
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-muted">
                      <div>
                        <p className="text-2xl font-bold tracking-tight text-foreground">
                          {occupiedRoomsCalculated} <span className="text-sm font-normal text-muted-foreground">/ {totalRoomsCalculated}</span>
                        </p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Rooms Occupied</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold tracking-tight text-foreground">
                          {occupancyPercentageRate}%
                        </p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">Yield Efficiency</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}