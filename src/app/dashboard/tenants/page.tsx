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
import { 
  Plus, Mail, Phone, ShieldAlert, Loader2, UserCheck, 
  ShieldClose, Upload, Image as ImageIcon, FileText, Edit2, Eye, Trash2 
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';

interface DBTenant {
  id: number;
  phone: string;
  emergencyContact: string | null;
  employmentVerification: boolean;
  imageUrl: string | null;
  user: { name: string; email: string };
  leases: Array<{
    status: 'active' | 'expired' | 'terminated';
    room: { roomNumber: string };
  }>;
  documents?: Array<{
    documentType: string;
    filePath: string;
  }>;
}

export default function TenantsPage() {
  const t = useTranslations('tenants');
  const [tenants, setTenants] = useState<DBTenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  
  // Edit & Delete Control Interactivity States
  const [editingTenantId, setEditingTenantId] = useState<number | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<number | null>(null);
  const [deletingLoader, setDeletingLoader] = useState(false);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingIdDoc, setUploadingIdDoc] = useState(false);

  const tenantSchema = z.object({
    name: z.string().min(2, t('validation.nameRequired')),
    email: z.string().email(t('validation.emailInvalid')),
    phone: z.string().min(5, t('validation.phoneRequired')),
    emergencyContact: z.string().optional(),
    employmentVerification: z.boolean().default(false),
    imageUrl: z.string().url().optional().or(z.literal('')),
    idDocumentUrl: z.string().url().optional().or(z.literal('')),
  });

  type TenantFormData = z.infer<typeof tenantSchema>;

  const form = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: { name: '', email: '', phone: '', emergencyContact: '', employmentVerification: false, imageUrl: '', idDocumentUrl: '' },
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

  const uploadBinaryFile = async (file: File, purpose: 'avatar' | 'id-document', setLoader: (loading: boolean) => void, formField: 'imageUrl' | 'idDocumentUrl') => {
    setLoader(true);
    setErrorFeedback(null);
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: file,
        headers: { 'content-type': file.type, 'x-filename': file.name, 'x-upload-purpose': purpose },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Asset upload processing failure');
      form.setValue(formField, data.url);
    } catch (err: any) {
      setErrorFeedback(err.message);
    } finally {
      setLoader(false);
    }
  };

  const handleEditClick = (tenant: DBTenant) => {
    setEditingTenantId(tenant.id);
    const existingIdFile = tenant.documents?.find(d => d.documentType === 'Government_ID')?.filePath || '';
    form.reset({
      name: tenant.user?.name || '',
      email: tenant.user?.email || '',
      phone: tenant.phone || '',
      emergencyContact: tenant.emergencyContact || '',
      employmentVerification: tenant.employmentVerification,
      imageUrl: tenant.imageUrl || '',
      idDocumentUrl: existingIdFile,
    });
    setOpen(true);
  };

  // Safe orchestrator for passing deletion commands back to server logic
  const handleDeleteExecute = async () => {
    if (!deleteTargetId) return;
    setDeletingLoader(true);
    try {
      const res = await fetch(`/api/tenants?id=${deleteTargetId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove tenant profile');
      setDeleteTargetId(null);
      await loadTenants();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingLoader(false);
    }
  };

  const onSubmit = async (data: TenantFormData) => {
    setErrorFeedback(null);
    const isEditing = editingTenantId !== null;
    try {
      const response = await fetch('/api/tenants', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEditing ? { id: editingTenantId, ...data } : data),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t('errors.serverError'));
      form.reset();
      setEditingTenantId(null);
      setOpen(false);
      await loadTenants();
    } catch (error: any) {
      setErrorFeedback(error.message);
    }
  };

  const parseLeaseState = (leases: DBTenant['leases']) => {
    if (!leases || leases.length === 0) return { label: t('leaseStatus.noLease'), style: 'bg-gray-100 text-gray-800', room: t('rooms.unassigned') };
    const currentActive = leases.find((l) => l.status === 'active');
    if (currentActive) return { label: t('leaseStatus.active'), style: 'bg-green-100 text-green-800', room: t('rooms.assignedRoom', { roomNumber: currentActive.room.roomNumber }) };
    return { label: t('leaseStatus.inactive'), style: 'bg-amber-100 text-amber-800', room: t('rooms.vacated') };
  };

  return (
    <DashboardLayout userRole="owner">
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{t('title')}</h1>
            <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
          </div>
          
          <Dialog open={open} 
            onOpenChange={(val) => { 
              setOpen(val); 
              if (!val) { 
                form.reset({
                  name: '',
                  email: '',
                  phone: '',
                  emergencyContact: '',
                  employmentVerification: false,
                  imageUrl: '',
                  idDocumentUrl: '',
                }); 
                setEditingTenantId(null); 
                setErrorFeedback(null); 
              } 
            }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" /> {t('addBtn')}</Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editingTenantId ? "Edit Tenant Profile" : t('form.title')}</DialogTitle></DialogHeader>
              {errorFeedback && <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md flex items-center gap-2"><ShieldAlert className="w-4 h-4 flex-shrink-0" /><span>{errorFeedback}</span></div>}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  {/* Profile Image Zone */}
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Profile Image (Avatar)</FormLabel>
                        <div className="flex items-center gap-4 border rounded-lg p-3 bg-muted/20">
                          <div className="relative w-14 h-14 rounded-full bg-muted border flex items-center justify-center overflow-hidden shrink-0">
                            {field.value ? (
                              <a 
                                href={field.value} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="w-full h-full cursor-zoom-in block"
                                title="View full image"
                              >
                                <img src={field.value} alt="Preview" className="w-full h-full object-cover" />
                              </a>
                            ) : (
                              <ImageIcon className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 space-y-1">
                            <FormControl>
                              <Input type="file" accept="image/*" className="hidden" id="avatar-image-upload" onChange={(e) => e.target.files?.[0] && uploadBinaryFile(e.target.files[0], 'avatar', setUploadingAvatar, 'imageUrl')} disabled={uploadingAvatar} />
                            </FormControl>
                            <label htmlFor="avatar-image-upload">
                              <Button type="button" variant="outline" size="sm" className="gap-2 cursor-pointer" asChild disabled={uploadingAvatar}>
                                <span>{uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}Change Photo</span>
                              </Button>
                            </label>
                          </div>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* ID Document Field */}
                  <FormField
                    control={form.control}
                    name="idDocumentUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Government Verification ID</FormLabel>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3 border border-dashed rounded-lg p-3 bg-muted/10 justify-between">
                            <div className="flex items-center gap-2 min-w-0">
                              <FileText className={`w-5 h-5 shrink-0 ${field.value ? 'text-green-600' : 'text-muted-foreground'}`} />
                              <p className="text-xs font-medium truncate">{field.value ? "✓ Identification Attached" : "Upload ID (Image or PDF)"}</p>
                            </div>
                            <FormControl>
                              <Input type="file" accept="image/*,application/pdf" className="hidden" id="id-document-upload" onChange={(e) => e.target.files?.[0] && uploadBinaryFile(e.target.files[0], 'id-document', setUploadingIdDoc, 'idDocumentUrl')} disabled={uploadingIdDoc} />
                            </FormControl>
                            <label htmlFor="id-document-upload">
                              <Button type="button" variant="secondary" size="sm" className="gap-1 cursor-pointer" asChild disabled={uploadingIdDoc}>
                                <span>{uploadingIdDoc ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}Select File</span>
                              </Button>
                            </label>
                          </div>
                          {field.value && (
                            <div className="flex justify-between items-center bg-muted p-2 rounded text-xs">
                              <a href={field.value} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 font-semibold shrink-0"><Eye className="w-3 h-3" /> View Document</a>
                            </div>
                          )}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Standard Form Registration Fields */}
                  <FormField control={form.control} name="name" render={({ field }) => <FormItem><FormLabel>{t('form.labels.name')}</FormLabel><FormControl><Input placeholder={t('form.placeholders.name')} {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>{t('form.labels.email')}</FormLabel><FormControl><Input type="email" placeholder={t('form.placeholders.email')} {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="phone" render={({ field }) => <FormItem><FormLabel>{t('form.labels.phone')}</FormLabel><FormControl><Input placeholder={t('form.placeholders.phone')} {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="emergencyContact" render={({ field }) => <FormItem><FormLabel>{t('form.labels.emergencyContact')}</FormLabel><FormControl><Input placeholder={t('form.placeholders.emergencyContact')} {...field} /></FormControl><FormMessage /></FormItem>} />
                  <FormField control={form.control} name="employmentVerification" render={({ field }) => <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5 pr-2"><FormLabel>{t('form.labels.verification')}</FormLabel><FormDescription>{t('form.descriptions.verification')}</FormDescription></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>} />

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || uploadingAvatar || uploadingIdDoc}>
                    {form.formState.isSubmitting ? t('form.btnSubmitting') : "Save Changes"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Global Confirmation Alert Dialog for Delete Actions */}
        <AlertDialog open={deleteTargetId !== null} onOpenChange={(val) => !val && setDeleteTargetId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this tenant's login profile, phone details, and any uploaded identification document links from the storage ledger.
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
                Delete Tenant
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Output Render Matrix Area */}
        {loading ? (
          <div className="flex h-[30vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-background"><p className="text-muted-foreground">{t('noTenants')}</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.map((tenant) => {
              const leaseMeta = parseLeaseState(tenant.leases);
              const idDocument = tenant.documents?.find(d => d.documentType === 'Government_ID');
              
              return (
                <Card key={tenant.id} className="hover:shadow-md transition-shadow relative overflow-hidden group">
                  <CardHeader className="pb-3">
                    <div className="flex gap-3 items-start justify-between">
                      <div className="flex gap-3 items-start min-w-0 flex-1">
                        <div className="w-12 h-12 rounded-full border bg-muted shrink-0 overflow-hidden flex items-center justify-center shadow-inner">
                         <a 
                            href={tenant.imageUrl || '#'} 
                            target={tenant.imageUrl ? "_blank" : undefined} 
                            rel="noreferrer"
                            className={`w-12 h-12 rounded-full border bg-muted shrink-0 overflow-hidden flex items-center justify-center shadow-inner ${tenant.imageUrl ? 'cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all' : 'cursor-default'}`}
                            title={tenant.imageUrl ? "View full profile image" : undefined}
                          >
                            {tenant.imageUrl ? (
                              <img src={tenant.imageUrl} alt={tenant.user?.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-muted-foreground uppercase">
                                {tenant.user?.name?.slice(0, 2)}
                              </span>
                            )}
                          </a>
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <CardTitle className="text-xl font-bold tracking-tight truncate">{tenant.user?.name}</CardTitle>
                          <Badge variant="outline" className="font-semibold">{leaseMeta.room}</Badge>
                        </div>
                      </div>
                      
                      {/* Interactive Card Action Buttons - Includes Edit and Delete */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" onClick={() => handleEditClick(tenant)} title="Edit">
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive" onClick={() => setDeleteTargetId(tenant.id)} title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        {tenant.employmentVerification ? (
                          <div className="p-1 text-green-700" title={t('tooltips.verified')}><UserCheck className="w-4 h-4" /></div>
                        ) : (
                          <div className="p-1 text-amber-700" title={t('tooltips.pending')}><ShieldClose className="w-4 h-4" /></div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                      <a href={`mailto:${tenant.user?.email}`} className="text-primary hover:underline truncate">{tenant.user?.email}</a>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground font-medium truncate">{tenant.phone}</span>
                    </div>

                    {tenant.emergencyContact && (
                      <div className="text-xs bg-muted/50 p-2 rounded border">
                        <span className="text-muted-foreground block font-mono uppercase tracking-wider text-[10px]">{t('iceReference')}</span>
                        <span className="text-foreground font-medium block truncate">{tenant.emergencyContact}</span>
                      </div>
                    )}

                    {idDocument?.filePath && (
                      <div className="pt-1">
                        <a href={idDocument.filePath} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors bg-muted/70 px-2 py-1 rounded border border-dashed">
                          <FileText className="w-3 h-3 text-blue-600" />
                          <span>View Stored Government ID</span>
                        </a>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t('leaseStatusTitle')}</span>
                      <Badge className={`${leaseMeta.style} border-none shadow-none`}>{leaseMeta.label}</Badge>
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