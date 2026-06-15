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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Textarea } from '@/src/components/ui/textarea';
import { Plus, Edit2, MapPin, Loader2, AlertCircle, Home, Trash2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

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
  zip: string;
  description: string | null;
  khqrImageUrl?: string | null;
  rooms: DBRoomRelation[];
}

export default function PropertiesPage() {
  const t = useTranslations('properties');
  const [properties, setProperties] = useState<DBProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Added control states to manage update target tracks
  const [editTargetId, setEditTargetId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deletingLoader, setDeletingLoader] = useState(false);
  const [uploadingKhqr, setUploadingKhqr] = useState(false);
  const [selectedKhqrFile, setSelectedKhqrFile] =
  useState<File | null>(null);

 const [khqrPreview, setKhqrPreview] =
  useState<string>('');


  const propertySchema = z.object({
    name: z.string().min(1, t('validation.nameRequired')),
    address: z.string().min(1, t('validation.addressRequired')),
    city: z.string().min(1, t('validation.cityRequired')),
    state: z.string().min(1, t('validation.stateRequired')),
    zipCode: z.string().min(1, t('validation.zipRequired')),
    description: z.string().optional(),
    khqrImageUrl: z.string().optional(),
  });

  type PropertyFormData = z.infer<typeof propertySchema>;

  const form = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
    defaultValues: { name: '', address: '', city: '', state: '', zipCode: '', description: '' , khqrImageUrl: '',},
  });

  const uploadKhqr = async (
  file: File
): Promise<string> => {
  const formData = new FormData();

  formData.append('file', file);

  const response = await fetch(
    '/api/properties/upload-khqr',
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    throw new Error('Failed to upload KHQR');
  }

  const result = await response.json();

  return result.url;
};
  const syncPropertiesMatrix = async () => {
    try {
      const response = await fetch('/api/properties');
      if (!response.ok) throw new Error(t('errors.transmissionFailure'));
      const synchronizedArray = await response.json();
      setProperties(synchronizedArray);
    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.message || t('errors.loadFailure'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncPropertiesMatrix();
  }, []);

  const handleDeleteExecute = async () => {
    if (!deleteTargetId) return;
    setDeletingLoader(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/properties?id=${deleteTargetId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove property profile');
      setDeleteTargetId(null);
      await syncPropertiesMatrix();
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setDeletingLoader(false);
    }
  };

  // Triggers edit form mode and maps database records into form field controllers
  const handleEditInit = (property: DBProperty) => {
    setEditTargetId(property.id);
    setErrorMessage(null);
    setKhqrPreview(
      property.khqrImageUrl || ''
    );
    form.reset({
      name: property.name,
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zip,
      description: property.description || '',
      khqrImageUrl: property.khqrImageUrl || '',
    });
    setOpen(true);
  };

  const onSubmit = async (data: PropertyFormData) => {
    setErrorMessage(null);
    const isEditing = editTargetId !== null;
    const url = isEditing ? `/api/properties?id=${editTargetId}` : '/api/properties';
    const method = isEditing ? 'PUT' : 'POST';
    
    try {
       let khqrImageUrl =
        data.khqrImageUrl || '';

      if (selectedKhqrFile) {
        setUploadingKhqr(true);

        khqrImageUrl =
          await uploadKhqr(
            selectedKhqrFile
          );

        setUploadingKhqr(false);
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
              ...data,
          khqrImageUrl,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        throw new Error(errorBody.error || t('errors.serverRejected'));
      }

      form.reset({ name: '', address: '', city: '', state: '', zipCode: '', description: '' });
      setEditTargetId(null);
      setOpen(false);
      await syncPropertiesMatrix();
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      form.clearErrors();
    }
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
        {/* Header Block */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold py-2">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>

          <Button 
            className="gap-2"
            onClick={() => {
              setEditTargetId(null);
              form.reset({ name: '', address: '', city: '', state: '', zipCode: '', description: '' });
              setErrorMessage(null);
              setOpen(true);
            }}
          >
            <Plus className="w-4 h-4" /> {t('addBtn')}
          </Button>

          <Dialog 
            open={open} 
            onOpenChange={(val) => { 
              setOpen(val); 
              if (!val) { 
                form.reset({ name: '', address: '', city: '', state: '', zipCode: '', description: '' }); 
                setEditTargetId(null);
                setErrorMessage(null); 
              } 
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editTargetId !== null ? t('form.editTitle') || 'Update Property' : t('form.title')}
                </DialogTitle>
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
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('form.labels.address')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('form.placeholders.address')} {...field} />
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
                          <FormLabel>{t('form.labels.city')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('form.placeholders.city')} {...field} />
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
                          <FormLabel>{t('form.labels.state')}</FormLabel>
                          <FormControl>
                            <Input placeholder={t('form.placeholders.state')} {...field} />
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
                        <FormLabel>{t('form.labels.zipCode')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('form.placeholders.zipCode')} {...field} />
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
                        <FormLabel>{t('form.labels.description')}</FormLabel>
                        <FormControl>
                          <Textarea placeholder={t('form.placeholders.description')} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormItem>
                    <FormLabel>ABA KHQR</FormLabel>

                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];

                        if (!file) return;

                        setSelectedKhqrFile(file);

                        setKhqrPreview(
                          URL.createObjectURL(file)
                        );
                      }}
                    />
                  </FormItem>
                     {khqrPreview && (
                      <div className="mt-2">
                        <img
                          src={khqrPreview}
                          alt="KHQR Preview"
                          className="w-40 h-40 object-contain border rounded"
                        />
                      </div>
                    )}
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        form.formState.isSubmitting ||
                        uploadingKhqr
                      }
                    >
                      {uploadingKhqr ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uploading KHQR...
                        </>
                      ) : form.formState.isSubmitting ? (
                        t('form.btnSubmitting')
                      ) : (
                        t('form.btnSave')
                      )}
                    </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <AlertDialog open={deleteTargetId !== null} onOpenChange={(val) => !val && setDeleteTargetId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Property Portfolio?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you absolutely sure? Doing this will permanently delete this property listing along with all rooms linked inside its registry. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deletingLoader}>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={(e) => { e.preventDefault(); handleDeleteExecute(); }} 
                className="bg-destructive hover:bg-destructive/90"
                disabled={deletingLoader}
              >
                {deletingLoader ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Remove Property
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {errorMessage && !open && (
          <div className="bg-destructive/15 text-destructive p-4 rounded-md text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Cards Grid Section */}
        {properties.length === 0 ? (
          <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground flex flex-col items-center justify-center gap-2">
            <Home className="w-8 h-8 text-muted-foreground/60" />
            <p>{t('noProperties')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
            {properties.map((property, idx) => {
              const totalRoomsCalculated = property.rooms?.length || 0;
              const occupiedRoomsCalculated = property.rooms?.filter(r => r.status === 'occupied').length || 0;
              
              const occupancyPercentageRate = totalRoomsCalculated > 0 
                ? Math.round((occupiedRoomsCalculated / totalRoomsCalculated) * 100)
                : 0;

              return (
                <Card key={property.id + idx} className="hover:shadow-md transition-shadow h-full flex flex-col relative overflow-hidden group justify-between">
                  <div>
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="truncate text-xl font-bold tracking-tight">{property.name}</CardTitle>
                          
                          {/* Dynamic wrapping alignment layer addressing the image_022f5a.png layout break bug */}
                          <div className="flex items-start gap-1 text-sm text-muted-foreground mt-1.5">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-muted-foreground/80 mt-0.5" />
                            <span className="whitespace-normal break-words leading-tight flex-1">
                              {property.address}, {property.city}, {property.state} {property.zip}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-0.5 shrink-0">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-55 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEditInit(property)}
                            title="Edit Property"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-55 group-hover:opacity-100 transition-opacity"
                            onClick={() => setDeleteTargetId(property.id)}
                            title="Delete Property"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="pb-4">
                      <p className="text-sm text-muted-foreground line-clamp-3">
                        {property.description || <span className="italic opacity-50 text-xs">{t('noDescription')}</span>}
                      </p>
                    </CardContent>
                  </div>

                  <CardContent className="pt-0 mt-auto">
                    <div className="grid grid-cols-2 gap-2 pt-4 border-t border-muted">
                      <div>
                        <p className="text-2xl font-bold tracking-tight text-foreground">
                          {occupiedRoomsCalculated} <span className="text-sm font-normal text-muted-foreground">/ {totalRoomsCalculated}</span>
                        </p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">{t('roomsOccupied')}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold tracking-tight text-foreground">
                          {occupancyPercentageRate}%
                        </p>
                        <p className="text-xs text-muted-foreground font-medium mt-0.5">{t('yieldEfficiency')}</p>
                      </div>
                    </div>
                  </CardContent>

                  {property.khqrImageUrl && (
                    <div className="mt-3">
                      <img
                        src={property.khqrImageUrl}
                        alt="ABA KHQR"
                        className="w-24 h-24 rounded border"
                      />
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}