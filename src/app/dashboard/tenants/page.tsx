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
import { useTranslations } from 'next-intl';

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
  const t = useTranslations('tenants');
  const [tenants, setTenants] = useState<DBTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  // Zod structural tracking schema generated with translation values
  const tenantSchema = z.object({
    name: z.string().min(2, t('validation.nameRequired')),
    email: z.string().email(t('validation.emailInvalid')),
    phone: z.string().min(5, t('validation.phoneRequired')),
    emergencyContact: z.string().optional(),
    employmentVerification: z.boolean().default(false),
  });

  type TenantFormData = z.infer<typeof tenantSchema>;

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
        throw new Error(result.error || t('errors.serverError'));
      }

      form.reset();
      setOpen(false);
      await loadTenants();
    } catch (error: any) {
      setErrorFeedback(error.message);
    }
  };

  const parseLeaseState = (leases: DBTenant['leases']) => {
    if (!leases || leases.length === 0) {
      return { 
        label: t('leaseStatus.noLease'), 
        style: 'bg-gray-100 text-gray-800', 
        room: t('rooms.unassigned') 
      };
    }
    const currentActive = leases.find((l) => l.status === 'active');
    if (currentActive) {
      return { 
        label: t('leaseStatus.active'), 
        style: 'bg-green-100 text-green-800', 
        room: t('rooms.assignedRoom', { roomNumber: currentActive.room.roomNumber }) 
      };
    }
    return { 
      label: t('leaseStatus.inactive'), 
      style: 'bg-amber-100 text-amber-800', 
      room: t('rooms.vacated') 
    };
  };

  if (loading) {
    return (
      <DashboardLayout userRole="owner">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">{t('loadingText')}</p>
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
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>
          
          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) { form.reset(); setErrorFeedback(null); } }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> {t('addBtn')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('form.title')}</DialogTitle>
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
                        <FormLabel>{t('form.labels.name')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('form.placeholders.name')} {...field} />
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
                        <FormLabel>{t('form.labels.email')}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t('form.placeholders.email')} {...field} />
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
                        <FormLabel>{t('form.labels.phone')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('form.placeholders.phone')} {...field} />
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
                        <FormLabel>{t('form.labels.emergencyContact')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('form.placeholders.emergencyContact')} {...field} />
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
                        <div className="space-y-0.5 pr-2">
                          <FormLabel>{t('form.labels.verification')}</FormLabel>
                          <FormDescription>{t('form.descriptions.verification')}</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? t('form.btnSubmitting') : t('form.btnSave')}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tenants Grid Output */}
        {tenants.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-background">
            <p className="text-muted-foreground">{t('noTenants')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => {
              const leaseMeta = parseLeaseState(tenant.leases);
              
              return (
                <Card key={tenant.id} className="hover:shadow-md transition-shadow relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1 min-w-0 flex-1">
                        <CardTitle className="text-xl font-bold tracking-tight truncate">
                          {tenant.user?.name}
                        </CardTitle>
                        <Badge variant="outline" className="font-semibold">
                          {leaseMeta.room}
                        </Badge>
                      </div>
                      
                      {tenant.employmentVerification ? (
                        <div className="p-1.5 rounded-full bg-green-50 text-green-700 shrink-0" title={t('tooltips.verified')}>
                          <UserCheck className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-full bg-amber-50 text-amber-700 shrink-0" title={t('tooltips.pending')}>
                          <ShieldClose className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${tenant.user?.email}`} className="text-primary hover:underline truncate">
                        {tenant.user?.email}
                      </a>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground font-medium truncate">{tenant.phone}</span>
                    </div>

                    {tenant.emergencyContact && (
                      <div className="text-xs bg-muted/50 p-2 rounded border">
                        <span className="text-muted-foreground block font-mono uppercase tracking-wider text-[10px]">
                          {t('iceReference')}
                        </span>
                        <span className="text-foreground font-medium block truncate">
                          {tenant.emergencyContact}
                        </span>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('leaseStatusTitle')}</span>
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