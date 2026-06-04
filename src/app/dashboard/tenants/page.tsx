'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { Switch } from '@/src/components/ui/switch';
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
  FormDescription,
} from '@/src/components/ui/form';
import { Plus, Mail, Phone, ShieldAlert, Loader2, UserCheck, ShieldClose } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

const tenantSchema = z.object({
  name: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address address string'),
  phone: z.string().min(5, 'Valid phone protocol number is required'),
  emergencyContact: z.string().optional(),
  employmentVerification: z.boolean().default(false),
});

type TenantFormData = z.infer<typeof tenantSchema>;

interface DBTenant {
  id: number;
  phone: string;
  emergencyContact: string | null;
  employmentVerification: boolean;
  user: { name: string; email: string };
  leases: Array<{
    status: 'active' | 'expired' | 'terminated';
    room: { roomNumber: string };
  }>;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<DBTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      emergencyContact: '',
      employmentVerification: false,
    },
  });

  const loadTenants = async () => {
    try {
      const res = await fetch('/api/tenants');
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (err) {
      console.error('Failed sync', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTenants();
  }, []);

  const onSubmit = async (data: TenantFormData) => {
    setErrorFeedback(null);
    try {
      const response = await fetch('/api/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Server error occurred');
      }

      form.reset();
      setOpen(false);
      await loadTenants();
    } catch (error: any) {
      setErrorFeedback(error.message);
    }
  };

  // Helper calculation to parse active relationship arrays dynamically
  const parseLeaseState = (leases: DBTenant['leases']) => {
    if (!leases || leases.length === 0) return { label: 'No Lease', style: 'bg-gray-100 text-gray-800', room: 'Unassigned' };
    const currentActive = leases.find((l) => l.status === 'active');
    if (currentActive) {
      return { label: 'Active', style: 'bg-green-100 text-green-800', room: `Room ${currentActive.room.roomNumber}` };
    }
    return { label: 'Inactive / Past', style: 'bg-amber-100 text-amber-800', room: 'Vacated' };
  };

  if (loading) {
    return (
      <DashboardLayout userRole="owner">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Synchronizing profiles directory...</p>
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
            <h1 className="text-3xl font-bold">Tenants</h1>
            <p className="text-muted-foreground mt-1">Manage accounts, profile parameters, and rental status</p>
          </div>
          
          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) setErrorFeedback(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Add Tenant
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Tenant Profile</DialogTitle>
              </DialogHeader>

              {errorFeedback && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{errorFeedback}</span>
                </div>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Johnathan Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="j.doe@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 000-0000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="emergencyContact"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Info</FormLabel>
                        <FormControl>
                          <Input placeholder="Spouse / Parent Name & Number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="employmentVerification"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                        <div className="space-y-0.5">
                          <FormLabel>Background & Income Verification</FormLabel>
                          <FormDescription>Has the applicant cleared employment checks?</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Processing Ledger Records...' : 'Provision Tenant Account'}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tenants Grid Output */}
        {tenants.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-background">
            <p className="text-muted-foreground">No tenant registry profiles configured inside database.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => {
              const leaseMeta = parseLeaseState(tenant.leases);
              
              return (
                <Card key={tenant.id} className="hover:shadow-md transition-shadow relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <CardTitle className="text-xl font-bold tracking-tight">
                          {tenant.user?.name}
                        </CardTitle>
                        <Badge variant="outline" className="font-semibold">
                          {leaseMeta.room}
                        </Badge>
                      </div>
                      
                      {/* Background vetting badge flag indicator */}
                      {tenant.employmentVerification ? (
                        <div className="p-1.5 rounded-full bg-green-50 text-green-700" title="Employment Verified">
                          <UserCheck className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-full bg-amber-50 text-amber-700" title="Verification Pending">
                          <ShieldClose className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <a href={`mailto:${tenant.user?.email}`} className="text-primary hover:underline truncate">
                        {tenant.user?.email}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">{tenant.phone}</span>
                    </div>

                    {tenant.emergencyContact && (
                      <div className="text-xs bg-muted/50 p-2 rounded border">
                        <span className="text-muted-foreground block font-mono uppercase tracking-wider text-[10px]">ICE Reference:</span>
                        <span className="text-foreground font-medium block truncate">{tenant.emergencyContact}</span>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Lease Status</span>
                      <Badge className={`${leaseMeta.style} border-none shadow-none`}>
                        {leaseMeta.label}
                      </Badge>
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