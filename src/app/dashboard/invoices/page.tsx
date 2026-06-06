'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/src/components/ui/dialog";
import { Input } from "@/src/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/src/components/ui/dropdown-menu";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetDescription 
} from "@/src/components/ui/sheet";
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
import { useTranslations } from 'next-intl'; 
import { Plus, FileText, Printer, Loader2, ChevronDown, Eye, Trash2, Calendar, User, Hash, Share2, MessageSquare, Send } from 'lucide-react';

interface ActiveLease {
  id: number;
  monthlyRent: string;
  room: { roomNumber: string };
  tenant: { user: { name: string } };
}

interface DBInvoice {
  id: number;
  leaseId: number;
  billingPeriod: string;
  dueDate: string;
  waterLastMonth: number;
  waterThisMonth: number;
  waterRate: string;
  electricityLastMonth: number;
  electricityThisMonth: number;
  electricityRate: string;
  status: 'pending' | 'paid' | 'overdue';
  createdAt: string;
  lease?: ActiveLease;
}

export default function InvoicesPage() {
  const t = useTranslations('Invoices'); 

  const [invoices, setInvoices] = useState<DBInvoice[]>([]);
  const [activeLeases, setActiveLeases] = useState<ActiveLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [selectedInvoice, setSelectedInvoice] = useState<DBInvoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);

  // New States for Bulk Action Operations
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<number[]>([]);
  const [invoicesToPrint, setInvoicesToPrint] = useState<DBInvoice[]>([]);
  
  const [selectedMonth, setSelectedMonth] = useState("");

  const filteredInvoices = invoices.filter((invoice) => {
  if (!selectedMonth) return true;
  return invoice.createdAt.startsWith(selectedMonth)
  });


  const [formData, setFormData] = useState({
    leaseId: '',
    waterLastMonth: '',
    waterThisMonth: '',
    waterRate: '2.50',
    electricityLastMonth: '',
    electricityThisMonth: '',
    electricityRate: '0.25',
    billingPeriod: '',
    dueDate: '',
  });

  const selectedLeaseDetails = activeLeases.find(l => l.id === Number(formData.leaseId));

  const syncInvoiceModuleMatrix = async () => {
    try {
      const [invRes, leaseRes] = await Promise.all([
        fetch('/api/invoices'),
        fetch('/api/leases/active')
      ]);
      if (!invRes.ok || !leaseRes.ok){
        return;
      } 
      setInvoices(await invRes.json());
      setActiveLeases(await leaseRes.json());
    } catch (err) {
      console.error("Initialization failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncInvoiceModuleMatrix();
  }, [isDialogOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leaseId) return alert(t('selectLeaseAlert'));
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!response.ok) throw new Error('Failed to create invoice');

      setFormData({
        leaseId: '',
        waterLastMonth: '',
        waterThisMonth: '',
        waterRate: '2.50',
        electricityLastMonth: '',
        electricityThisMonth: '',
        electricityRate: '0.25',
        billingPeriod: '',
        dueDate: '',
      });
      setIsDialogOpen(false);
      await syncInvoiceModuleMatrix();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateInvoiceStatus = async (invoiceId: number, targetStatus: 'pending' | 'paid' | 'overdue') => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: targetStatus }),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update status');
      }
      
      setInvoices(prev => 
        prev.map(inv => inv.id === invoiceId ? { ...inv, status: targetStatus } : inv)
      );
      if (selectedInvoice?.id === invoiceId) {
        setSelectedInvoice(prev => prev ? { ...prev, status: targetStatus } : null);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      const response = await fetch(`/api/invoices/${invoiceToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete invoice');
      
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete));
      setSelectedInvoiceIds(prev => prev.filter(id => id !== invoiceToDelete));
      setInvoiceToDelete(null);
    } catch (error) {
      console.error(error);
      alert(t('deleteErrorAlert'));
    }
  };

  // Checkbox Select All Toggle
  const handleSelectAllToggle = () => {
     const filteredIds = filteredInvoices.map((inv) => inv.id);

    const allSelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedInvoiceIds.includes(id));

    if (allSelected) {
      setSelectedInvoiceIds((prev) =>
        prev.filter((id) => !filteredIds.includes(id))
      );
    } else {
      setSelectedInvoiceIds((prev) => [
        ...new Set([...prev, ...filteredIds]),
      ]);
    }
  };

  // Row Level Checkbox Toggle
  const handleSelectInvoiceToggle = (id: number) => {
    setSelectedInvoiceIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Execution for Bulk Invoices Printing Sequential Buffer
  const triggerBulkPrintSequence = () => {
    const targets = invoices.filter(inv => selectedInvoiceIds.includes(inv.id));
    if (targets.length === 0) return;
    
    setInvoicesToPrint(targets);
    setTimeout(() => {
      window.print();
    }, 200);
  };

  const triggerBrowserPrintSequence = (invoice: DBInvoice) => {
    setInvoicesToPrint([invoice]);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const openDetailsPanel = (invoice: DBInvoice) => {
    setSelectedInvoice(invoice);
    setIsDetailOpen(true);
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
      case 'overdue': return 'bg-rose-500/15 text-rose-600 border-rose-500/30';
      default: return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
    }
  };

  const calculateTotals = (invoice: DBInvoice | null) => {
    if (!invoice) return { rent: 0, water: 0, electricity: 0, grandTotal: 0 };
    const rent = parseFloat(invoice.lease?.monthlyRent || '0');
    const waterUnits = Math.max(0, invoice.waterThisMonth - invoice.waterLastMonth);
    const water = waterUnits * parseFloat(invoice.waterRate);
    const electUnits = Math.max(0, invoice.electricityThisMonth - invoice.electricityLastMonth);
    const electricity = electUnits * parseFloat(invoice.electricityRate);
    return { rent, water, electricity, grandTotal: rent + water + electricity };
  };

  const handleShareInvoice = async (invoice: DBInvoice, platform?: 'telegram' | 'whatsapp' | 'messenger') => {
    const { grandTotal, water = 0, electricity = 0 } = calculateTotals(invoice);
    
    const tenantName = invoice.lease?.tenant?.user?.name || t('unknownTenant');
    const roomNum = invoice.lease?.room?.roomNumber || '';
    const invoiceId = invoice.id;
    
    const formatDate = (date: any) => date ? new Date(date).toLocaleDateString() : '';
    const invoiceDate = formatDate(invoice.createdAt);
    const dueDate = formatDate(invoice.dueDate);
    
    const rentAmount = invoice.lease?.monthlyRent || 0;
    
    const shareText = `
      ${t("RECEIPT")}        
      ==============================
      ${t("InvoiceNo")} : ${invoiceId}
      ${t("date")}       : ${invoiceDate}
      ${t("dueDate")}   : ${dueDate}
      ------------------------------
      ${t("tenantInfo")}
      👤 ${tenantName.slice(0, 26)}
      🚪 ${t("room")} ${roomNum.padEnd(21)}
      📅 ${invoice.billingPeriod?.slice(0, 26) || ''}
      ------------------------------
      ${t("itemizedFees")}
        ${t("baseRent").padEnd(15)} $${rentAmount}
        ${t("waterSupply").padEnd(15)} $${water.toFixed(2).padStart(11)}
        ${t("electricity").padEnd(15)} $${electricity.toFixed(2).padStart(11)}
      ------------------------------
      ${t("totalDue").padEnd(17)} $${grandTotal.toFixed(2).padStart(11)}
      ==============================
      ${t("thankYou")}
    `;
    const invoiceUrl = `${window.location.origin}/dashboard/invoices/${invoice.id}`;

    if (platform === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + '\n' + invoiceUrl)}`, '_blank');
      return;
    }
    if (platform === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareText)}`, '_blank');
      return;
    }
    if (platform === 'messenger') {
      window.open(`https://www.facebook.com/dialog/send?link=${encodeURIComponent(invoiceUrl)}&app_id=YOUR_FB_APP_ID&redirect_uri=${encodeURIComponent(window.location.origin)}`, '_blank');
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice #INV-${String(invoice.id).padStart(5, '0')}`,
          text: shareText,
          url: invoiceUrl,
        });
      } catch (err) {
        console.log('Native share canceled or failed:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\n${invoiceUrl}`);
        alert('Invoice link and summary copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">{t('loadingLedger')}</p>
        </div>
      </DashboardLayout>
    );
  }

  const activeDetails = calculateTotals(selectedInvoice);

  return (
    <DashboardLayout>
      <div className="space-y-6 print:hidden">
        {/* Top Control Block Row */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight py-2">{t('title')}</h1>
            <p className="text-muted-foreground mt-0.5">{t('subtitle')}</p>
          </div>
             <div className="flex items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  Billing Month
                </label>

                <Input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-[180px]"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => setSelectedMonth("")}
              >
                Clear
              </Button>
            </div>
          <div className="flex items-center gap-2">
            {/* Conditional "Print Selected" Action Trigger bar */}
            {selectedInvoiceIds.length > 0 && (
              <Button variant="outline" onClick={triggerBulkPrintSequence} className="font-semibold border-primary/40 text-primary hover:bg-primary/5 transition-all">
                <Printer className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                {t('printSelectedBtn') || `Print Selected (${selectedInvoiceIds.length})`}
              </Button>
            )}

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="font-semibold">
                  <Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />
                  {t('createInvoiceBtn')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('dialogTitle')}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateInvoice} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">{t('labelSelectTenant')}</label>
                    <select name="leaseId" value={formData.leaseId} onChange={handleInputChange} className="w-full h-10 px-3 py-2 border rounded-md bg-background focus:outline-none text-sm" required>
                      <option value="">-- {t('chooseTenantPlaceholder')} --</option>
                      {activeLeases.map((lease) => (
                        <option key={lease.id} value={lease.id}>
                          {lease.tenant?.user?.name || 'Unknown Tenant'} ({t('roomShort')} {lease.room?.roomNumber})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedLeaseDetails && (
                    <div className="bg-muted/40 p-3 rounded-lg text-sm grid grid-cols-2 gap-2 border">
                      <div><span className="text-muted-foreground">{t('tenant')}:</span> <strong className="block">{selectedLeaseDetails.tenant?.user?.name}</strong></div>
                      <div><span className="text-muted-foreground">{t('room')}:</span> <strong className="block">{t('roomShort')} {selectedLeaseDetails.room?.roomNumber}</strong></div>
                    </div>
                  )}

                  {/* Billing & Due Date */}
                  <div className="grid grid-cols-2 gap-4 border-t pt-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">{t('placeholderBillingPeriod')}</label>
                      <Input name="billingPeriod" placeholder={t('placeholderBillingPeriod')} value={formData.billingPeriod} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">{t('dueDate')}</label>
                      <Input name="dueDate" type="date" value={formData.dueDate} onChange={handleInputChange} required />
                    </div>
                  </div>

                  {/* Water Section */}
                  <div className="grid grid-cols-3 gap-4 border-t pt-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">{t('waterLast')}</label>
                      <Input name="waterLastMonth" type="number" placeholder={t('waterLast')} value={formData.waterLastMonth} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">{t('waterThis')}</label>
                      <Input name="waterThisMonth" type="number" placeholder={t('waterThis')} value={formData.waterThisMonth} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">{t('waterRate')} ??</label>
                      <Input name="waterRate" type="number" step="0.01" value={formData.waterRate} onChange={handleInputChange} required />
                    </div>
                  </div>

                  {/* Electricity Section */}
                  <div className="grid grid-cols-3 gap-4 border-t pt-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">{t('electricLast')}</label>
                      <Input name="electricityLastMonth" type="number" placeholder={t('electricLast')} value={formData.electricityLastMonth} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">{t('electricThis')}</label>
                      <Input name="electricityThisMonth" type="number" placeholder={t('electricThis')} value={formData.electricityThisMonth} onChange={handleInputChange} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">{t('electricityRate')}</label>
                      <Input name="electricityRate" type="number" step="0.01" value={formData.electricityRate} onChange={handleInputChange} required />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>{t('cancel')}</Button>
                    <Button type="submit" disabled={isSubmitting}>{t('generateInvoiceBtn')}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Live Ledger Data Table Grid */}
        {filteredInvoices.length === 0 ? (
          <div className="border border-dashed rounded-xl p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 bg-card shadow-sm">
            <FileText className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-base font-medium">{t('noInvoices')}</p>
          </div>
        ) : (
          <Card className="shadow-sm rounded-xl overflow-hidden border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/60 border-b text-muted-foreground font-semibold tracking-wider">
                    <tr>
                      <th className="px-4 py-4 w-10 text-center">
                        <input 
                          type="checkbox"
                          className="rounded border-gray-300 accent-primary cursor-pointer w-4 h-4"
                          checked={invoices.length > 0 && selectedInvoiceIds.length === invoices.length}
                          onChange={handleSelectAllToggle}
                        />
                      </th>
                      <th className="px-6 py-4">{t('thInvoiceId')}</th>
                      <th className="px-6 py-4">{t('thTenant')}</th>
                      <th className="px-6 py-4">{t('thPeriod')}</th>
                      <th className="px-6 py-4">{t('thTotal')}</th>
                      <th className="px-6 py-4">{t('thStatus')}</th>
                      <th className="px-6 py-4 text-right">{t('thActions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-card text-foreground">
                    {filteredInvoices.map((invoice) => {
                      const { grandTotal } = calculateTotals(invoice);
                      const isChecked = selectedInvoiceIds.includes(invoice.id);
                      return (
                        <tr key={invoice.id} className={`hover:bg-muted/10 transition-colors group ${isChecked ? 'bg-primary/5 hover:bg-primary/10' : ''}`}>
                          <td className="px-4 py-4 text-center">
                            <input 
                              type="checkbox"
                              className="rounded border-gray-300 accent-primary cursor-pointer w-4 h-4"
                              checked={isChecked}
                              onChange={() => handleSelectInvoiceToggle(invoice.id)}
                            />
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-xs text-primary">
                            #INV-{String(invoice.id).padStart(5, '0')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold tracking-tight text-sm">{invoice.lease?.tenant?.user?.name || t('unknownTenant')}</div>
                            <div className="text-xs text-muted-foreground font-medium">{t('room')}: {invoice.lease?.room?.roomNumber || t('unassigned')}</div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-medium">{invoice.billingPeriod}</td>
                          <td className="px-6 py-4 font-bold text-foreground text-sm">${grandTotal.toFixed(2)}</td>
                          
                          <td className="px-6 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className={`h-7 px-2.5 text-xs font-semibold rounded-full border capitalize gap-1 ${getStatusBadgeStyle(invoice.status)}`}>
                                  {t(`status_${invoice.status}`)}
                                  <ChevronDown className="w-3 h-3 opacity-60 flex-shrink-0" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-32">
                                <DropdownMenuItem className="text-xs" onClick={() => updateInvoiceStatus(invoice.id, 'pending')}>{t('status_pending')}</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs text-emerald-600" onClick={() => updateInvoiceStatus(invoice.id, 'paid')}>{t('status_paid')}</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs text-rose-600" onClick={() => updateInvoiceStatus(invoice.id, 'overdue')}>{t('status_overdue')}</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>

                          <td className="px-6 py-4 text-right space-x-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openDetailsPanel(invoice)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => triggerBrowserPrintSequence(invoice)}>
                              <Printer className="w-4 h-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                  <Share2 className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => handleShareInvoice(invoice)}>
                                  <Share2 className="w-3.5 h-3.5" /> {t('shareNative') || 'System Share'}
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => handleShareInvoice(invoice, 'whatsapp')}>
                                  <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem className="text-xs gap-2" onClick={() => handleShareInvoice(invoice, 'telegram')}>
                                  <Send className="w-3.5 h-3.5 text-sky-500" /> Telegram
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" onClick={() => setInvoiceToDelete(invoice.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
               <div className="text-sm text-muted-foreground p-4">
              Showing
              <span className="mx-1 font-semibold">
                {filteredInvoices.length}
              </span>
              of
              <span className="mx-1 font-semibold">
                {invoices.length}
              </span>
              invoices
            </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* DETAIL DRAWER SHEET */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedInvoice && (
            <div className="space-y-6 pt-4 font-sans">
              <SheetHeader>
                <div className="flex items-center gap-2 text-xs font-mono text-primary font-bold">
                  <Hash className="w-3.5 h-3.5" /> INV-{String(selectedInvoice.id).padStart(5, '0')}
                </div>
                <SheetTitle className="text-2xl font-black tracking-tight mt-1">{t('drawerTitle')}</SheetTitle>
                <SheetDescription>{t('drawerSubtitle')}</SheetDescription>
              </SheetHeader>

              <div className="p-4 rounded-xl border bg-muted/40 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-medium">{t('thStatus')}</span>
                  <Badge className={`capitalize font-bold text-xs ${getStatusBadgeStyle(selectedInvoice.status)}`}>{t(`status_${selectedInvoice.status}`)}</Badge>
                </div>
                <div className="border-t border-muted pt-3 flex items-start gap-3">
                  <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm">
                    <strong className="block font-bold">{selectedInvoice.lease?.tenant?.user?.name}</strong>
                    <span className="text-xs text-muted-foreground">{t('room')}: {t('roomShort')} {selectedInvoice.lease?.room?.roomNumber}</span>
                  </div>
                </div>
                <div className="border-t border-muted pt-3 flex items-start gap-3">
                  <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm">
                    <span className="block font-medium text-xs text-muted-foreground">{t('cyclePeriodLabel')}: {selectedInvoice.billingPeriod}</span>
                    <span className="block font-bold text-xs text-rose-500 mt-0.5">{t('dueDateLabel')}: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('itemizedBreakdownTitle')}</h3>
                <div className="border rounded-xl p-4 divide-y space-y-3 bg-card shadow-sm text-sm">
                  <div className="flex justify-between items-center pt-1">
                    <div>
                      <span className="font-semibold block">{t('baseRoomRent')}</span>
                      <span className="text-xs text-muted-foreground">{t('baseRoomRentSub')}</span>
                    </div>
                    <span className="font-bold">${activeDetails.rent.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <div>
                      <span className="font-semibold block">{t('waterConsumption')}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({selectedInvoice.waterThisMonth} - {selectedInvoice.waterLastMonth}) × ${selectedInvoice.waterRate}
                      </span>
                    </div>
                    <span className="font-bold">${activeDetails.water.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <div>
                      <span className="font-semibold block">{t('electricityConsumption')}</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({selectedInvoice.electricityThisMonth} - {selectedInvoice.electricityLastMonth}) × ${selectedInvoice.electricityRate}
                      </span>
                    </div>
                    <span className="font-bold">${activeDetails.electricity.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t-2 border-foreground text-base">
                    <span className="font-black">{t('totalBillDue')}</span>
                    <span className="font-black text-primary">${activeDetails.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button className="w-full gap-1.5 font-semibold" onClick={() => { setIsDetailOpen(false); triggerBrowserPrintSequence(selectedInvoice); }}>
                  <Printer className="w-4 h-4" /> {t('printStatementBtn')}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* DELETION DIALOG */}
      <AlertDialog open={invoiceToDelete !== null} onOpenChange={(val) => { if (!val) setInvoiceToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDeleteInvoice}>
              {t('deleteConfirmBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* HIGH-CONTRAST INVOICE PRINT VIEW - Supporting Single and Multi Print maps */}
      {invoicesToPrint.length > 0 && (
        <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:text-black z-50 bg-white text-black font-sans min-h-screen text-xs leading-relaxed">
          {invoicesToPrint.map((invoice, index) => {
            const details = calculateTotals(invoice);
            return (
              <div 
                key={invoice.id} 
                className="p-12 min-h-screen flex flex-col justify-between"
                style={{ breakAfter: index === invoicesToPrint.length - 1 ? 'auto' : 'page' }}
              >
                <div>
                  <div className="flex justify-between items-start border-b-4 border-black pb-8">
                    <div className="space-y-1">
                      <h2 className="text-4xl font-black tracking-tight text-black uppercase">{t('printHeader')}</h2>
                      <p className="text-gray-600 font-mono text-sm tracking-widest">{t('serialId')}: #INV-{String(invoice.id).padStart(5, '0')}</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <strong className="text-base text-black block font-black uppercase tracking-wider">{t('companyName')}</strong>
                      <p className="text-gray-500 font-mono">billing@property-management.local</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-12 my-10 bg-gray-100 p-6 rounded-lg border border-gray-300">
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">{t('printBillTo')}</span>
                      <strong className="text-lg text-black block font-black tracking-tight">{invoice.lease?.tenant?.user?.name}</strong>
                      <p className="text-gray-700 text-xs font-medium">{t('printAssignedRoom')}: <strong className="text-black font-bold">{t('roomShort')} {invoice.lease?.room?.roomNumber}</strong></p>
                    </div>
                    <div className="space-y-1.5 text-right">
                      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">{t('printStatementSummary')}</span>
                      <p className="text-gray-700 text-xs">{t('printTargetCycle')}: <strong>{invoice.billingPeriod}</strong></p>
                      <p className="text-gray-700 text-xs">{t('thStatus')}: <strong>{t(`status_${invoice.status}`).toUpperCase()}</strong></p>
                      <p className="text-black font-black text-xs border-t border-gray-300 pt-1 mt-1 inline-block">{t('printDeadline')}: {new Date(invoice.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <table className="w-full my-8 text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-black text-[10px] uppercase text-black font-black tracking-wider">
                        <th className="py-2.5">{t('printThItems')}</th>
                        <th className="py-2.5 text-right">{t('printThMeter')}</th>
                        <th className="py-2.5 text-right">{t('printThConsumed')}</th>
                        <th className="py-2.5 text-right">{t('printThRate')}</th>
                        <th className="py-2.5 text-right">{t('printThSubtotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-300 text-gray-900 text-xs font-medium">
                      <tr>
                        <td className="py-4 font-bold text-black">{t('baseRoomRent')}</td>
                        <td className="py-4 text-right text-gray-400">--</td>
                        <td className="py-4 text-right">{t('printMonthCycle')}</td>
                        <td className="py-4 text-right">${details.rent.toFixed(2)}</td>
                        <td className="py-4 text-right font-bold text-black">${details.rent.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="py-4 font-bold text-black">{t('waterSupplyItem')}</td>
                        <td className="py-4 text-right text-gray-500 font-mono text-[11px]">({invoice.waterLastMonth} ➔ {invoice.waterThisMonth})</td>
                        <td className="py-4 text-right">{Math.max(0, invoice.waterThisMonth - invoice.waterLastMonth)} {t('printUnits')}</td>
                        <td className="py-4 text-right">${parseFloat(invoice.waterRate).toFixed(2)}</td>
                        <td className="py-4 text-right font-bold text-black">${details.water.toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td className="py-4 font-bold text-black">{t('electricityEnergyItem')}</td>
                        <td className="py-4 text-right text-gray-500 font-mono text-[11px]">({invoice.electricityLastMonth} ➔ {invoice.electricityThisMonth})</td>
                        <td className="py-4 text-right">{Math.max(0, invoice.electricityThisMonth - invoice.electricityLastMonth)} kWh</td>
                        <td className="py-4 text-right">${parseFloat(invoice.electricityRate).toFixed(2)}</td>
                        <td className="py-4 text-right font-bold text-black">${details.electricity.toFixed(2)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end mt-12 border-t-4 border-black pt-6">
                  <div className="w-72 space-y-2 text-right">
                    <div className="flex justify-between text-xs text-gray-600 font-semibold">
                      <span>{t('printSubtotal')}:</span>
                      <span>${details.grandTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-black border-t-2 pt-3 border-black text-black">
                      <span>{t('printTotalDue')}:</span>
                      <span>${details.grandTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}