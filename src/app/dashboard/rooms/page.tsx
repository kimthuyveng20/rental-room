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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/components/ui/alert-dialog';
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
import { useTranslations } from 'next-intl';

interface DBRoom {
  id: number;
  roomNumber: string;
  type: 'single' | 'double' | 'suite';
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
  const t = useTranslations("Room");
  const [rooms, setRooms] = useState<DBRoom[]>([]);
  const [properties, setProperties] = useState<DBPropertyOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // States for delete tracking
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deletingLoader, setDeletingLoader] = useState(false);

  // Zod Client-Side Error Schema strings resolved dynamically via i18n hooks
  const roomSchema = z.object({
    propertyId: z.string().min(1, t('validation.propertyId')),
    roomNumber: z.string().min(1, t('validation.roomNumber')),
    type: z.string().min(1, t('validation.type')),
    capacity: z.coerce.number().min(1, t('validation.capacity')),
    pricePerMonth: z.coerce.number().min(1, t('validation.price')),
    status: z.enum(['available', 'occupied', 'maintenance']),
  });

  type RoomFormData = z.infer<typeof roomSchema>;

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
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRooms(data.rooms || []);
      setProperties(data.properties || []);
    } catch (err) {
      console.error(err);
      setErrorMessage(t('errFetch'));
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
        body: JSON.stringify({ ...data, amenities: [] }),
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

  // Execution function linked directly to the confirmation button
  const handleDeleteExecute = async () => {
    if (!deleteTargetId) return;

    setErrorMessage(null);
    setDeletingLoader(true);

    try {
      const response = await fetch(`/api/rooms?id=${deleteTargetId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errPayload = await response.json();
        throw new Error(errPayload.error || 'Failed to discard resource from database storage.');
      }

      setDeleteTargetId(null);
      await syncDataStream();
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setDeletingLoader(false);
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
          <p className="text-muted-foreground text-sm">{t('syncing')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout userRole="owner">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold py-2">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>
          
          <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setErrorMessage(null); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> {t('addRoom')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('registerAsset')}</DialogTitle>
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
                        <FormLabel>{t('parentComplex')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectEstate')} />
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
                        <FormLabel>{t('roomIdentifier')}</FormLabel>
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
                        <FormLabel>{t('roomTypeLabel')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={t('selectConfig')} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="single">{t('single')}</SelectItem>
                            <SelectItem value="double">{t('double')}</SelectItem>
                            <SelectItem value="suite">{t('suite')}</SelectItem>
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
                          <FormLabel>{t('maxHeadcount')}</FormLabel>
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
                          <FormLabel>{t('pricePerMonth') + " ($)"}</FormLabel>
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
                        <FormLabel>{t('currentStatus')}</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="available">{t('available')}</SelectItem>
                            <SelectItem value="occupied">{t('occupied')}</SelectItem>
                            <SelectItem value="maintenance">{t('maintenance')}</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? t('saving') : t('saveLog')}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mutation Error Feedback Banner */}
        {errorMessage && !open && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Database Grid Table Layout */}
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground font-medium text-xs uppercase tracking-wider">
                    <th className="text-left py-3 px-4 font-semibold">{t('thLocation')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('thType')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('thCapacity')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('thPrice')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('thOccupant')}</th>
                    <th className="text-left py-3 px-4 font-semibold">{t('thState')}</th>
                    <th className="text-left py-3 px-4 font-semibold text-center">{t('thActions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        {t('noRooms')}
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
                                <Building2 className="w-3 h-3" /> {room.property?.name || t('unassignedAsset')}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-foreground capitalize">
                            {t(room.type) || room.type}
                          </td>
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
                              <span className="text-muted-foreground font-mono italic text-xs">{t('vacantRegistry')}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`${getStatusColor(room.status)} shadow-none border-none capitalize`}>
                              {t(room.status) || room.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTargetId(room.id)}
                            >
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
      
      {/* Absolute Modal Context Layer for Room Discard Operations */}
      <AlertDialog open={deleteTargetId !== null} onOpenChange={(val) => !val && setDeleteTargetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle') || 'Delete Room Entry?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDescription') || 'Are you absolutely sure? Doing this will permanently delete this specific room unit ledger configuration from the system registry. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingLoader}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => { e.preventDefault(); handleDeleteExecute(); }} 
              className="hover:bg-destructive/90 "
              disabled={deletingLoader}
            >
              {deletingLoader ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {t('deleteConfirmBtn') || 'Remove Room'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </DashboardLayout>
  );
}