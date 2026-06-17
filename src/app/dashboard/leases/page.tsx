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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Plus, Calendar, FileText, Loader2, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

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

  // Added control tracks to safely orchestrate lease purges
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deletingLoader, setDeletingLoader] = useState(false);

  const form = useForm<LeaseFormData>({
    resolver: zodResolver(leaseSchema),
    defaultValues: { roomId: '', tenantId: '', startDate: '', endDate: '', rentAmount: 0, depositAmount: 0, notes: '' },
  });

  const loadData = async () => {
    try {
      const response = await fetch('/api/leases');
      if (response.ok) {
        const data = await response.json();
        setLeases(data.leases || []);
        setRooms(data.rooms || []);
        setTenants(data.tenants || []);
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

  const handleDeleteExecute = async () => {
    if (!deleteTargetId) return;
    setDeletingLoader(true);
    try {
      const res = await fetch(`/api/leases?id=${deleteTargetId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cancel lease profile');
      setDeleteTargetId(null);
      await loadData(); // Reload listings to update state and reset rooms dropdown matrices
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingLoader(false);
    }
  };

  const onSubmit = async (data: LeaseFormData) => {
    try {
      const response = await fetch('/api/leases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        form.reset({ roomId: '', tenantId: '', startDate: '', endDate: '', rentAmount: 0, depositAmount: 0, notes: '' });
        setOpen(false);
        await loadData();
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

  const t = useTranslations("Leases");
  
  if (loading) {
    return (
      <DashboardLayout userRole="owner">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">{t("syncing")}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="owner">
      <div className="space-y-6">
        {/* Header Block Section */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold py-2">{t("title")}</h1>
            <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
          </div>
          
          {/* Programmatically trigger modal while strictly ensuring safe clean default states initialization */}
          <Button 
            className="gap-2"
            onClick={() => {
              form.reset({ roomId: '', tenantId: '', startDate: '', endDate: '', rentAmount: 0, depositAmount: 0, notes: '' });
              setOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> {t("newLease")}
          </Button>

          <Dialog 
            open={open} 
            onOpenChange={(val) => {
              setOpen(val);
              if (!val) form.reset({ roomId: '', tenantId: '', startDate: '', endDate: '', rentAmount: 0, depositAmount: 0, notes: '' });
            }}
          >
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{t("createTitle")}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="roomId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("roomLabel")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("roomPlaceholder")} />
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
                          <FormLabel>{t("tenantLabel")}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={t("tenantPlaceholder")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {tenants.map((tProfile) => (
                                <SelectItem key={tProfile.id} value={tProfile.id.toString()}>
                                  {tProfile.user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("startDate")}</FormLabel>
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
                          <FormLabel>{t("endDate")}</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="rentAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("monthlyRent") + " ($)"}</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder={t("rentPlaceholder")} {...field} />
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
                          <FormLabel>{t("depositLabel")}</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder={t("depositPlaceholder")} {...field} />
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
                        <FormLabel>{t("notesLabel")}</FormLabel>
                        <FormControl>
                          <Textarea placeholder={t("notesPlaceholder")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? t("writingLedger") : t("createAuthenticate")}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Dynamic Deletion Modal Protection Overlay Box */}
        <AlertDialog open={deleteTargetId !== null} onOpenChange={(val) => !val && setDeleteTargetId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
              <AlertDialogDescription>
                {t("deleteDialog.description")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingLoader}>
                {t("deleteDialog.cancel")}
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => { e.preventDefault(); handleDeleteExecute(); }} 
                className="bg-destructive hover:bg-destructive/90"
                disabled={deletingLoader}
              >
                {deletingLoader ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" /> 
                    {t("deleteDialog.confirmLoading")}
                  </>
                ) : (
                  t("deleteDialog.confirm")
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Leases Output Matrix Area */}
        <div className="space-y-4">
  {leases.length === 0 ? (
    <div className="text-center py-12 border rounded-lg bg-background">
      <FileText className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-muted-foreground">{t("noLeases")}</p>
    </div>
  ) : (
    leases.map((lease) => {
      const daysRemaining = getDaysRemaining(lease.endDate);
      const isExpiringSoon = lease.status === 'active' && daysRemaining > 0 && daysRemaining < 30;
      const statusKey = isExpiringSoon ? 'expiringSoon' : lease.status;

      return (
        <Card key={lease.id} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-6">
            {/* Mobile-first layout: Column stack on small, row on medium+ */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Tenant & Room Info */}
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-muted flex-shrink-0">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm md:text-base">
                    {lease.tenant?.user?.name || t("unknownTenant")}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                     • Room {lease.room?.roomNumber || "N/A"}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    {format(new Date(lease.startDate), 'MMM dd')} - {format(new Date(lease.endDate), 'MMM dd, yyyy')}
                  </div>
                </div>
              </div>

              {/* Financials & Status - Adjusted for Mobile */}
              <div className="flex items-center justify-between md:justify-end gap-6 border-t pt-4 md:border-t-0 md:pt-0">
                <div className="text-right">
                  <p className="font-semibold text-sm">${Number(lease.monthlyRent).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">{t("monthlyRent")}</p>
                </div>

                <div className="text-right">
                  {lease.status === 'active' && daysRemaining > 0 ? (
                    <p className="text-xs font-medium text-green-600 mb-1 whitespace-nowrap">
                      {daysRemaining} {t("daysLeft")}
                    </p>
                  ) : (
                    <p className="text-xs font-medium text-destructive mb-1">{t("agreementFinished")}</p>
                  )}
                  <Badge className={`${getStatusColor(isExpiringSoon ? 'expiring-soon' : lease.status)} text-[10px]`}>
                    {t(statusKey) || lease.status}
                  </Badge>
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
                  onClick={() => setDeleteTargetId(lease.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
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