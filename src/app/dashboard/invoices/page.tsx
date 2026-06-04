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
import { Plus, FileText, Printer, Loader2, ChevronDown, Eye, Trash2, Calendar, User, Hash } from 'lucide-react';

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
  const [invoices, setInvoices] = useState<DBInvoice[]>([]);
  const [activeLeases, setActiveLeases] = useState<ActiveLease[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Detail and Deletion UI state variables
  const [selectedInvoice, setSelectedInvoice] = useState<DBInvoice | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<number | null>(null);

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
      if (!invRes.ok || !leaseRes.ok) throw new Error('Data sync failure');
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
    if (!formData.leaseId) return alert("Select a target lease context.");
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
    
    // 💡 Read the custom error message returned from the backend 500 block
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("SERVER_ERROR_DETAILS:", errorData);
      throw new Error(errorData.error || 'Failed to modify data table status metadata');
    }
    
    // If successful, update local states
    setInvoices(prev => 
      prev.map(inv => inv.id === invoiceId ? { ...inv, status: targetStatus } : inv)
    );
    if (selectedInvoice?.id === invoiceId) {
      setSelectedInvoice(prev => prev ? { ...prev, status: targetStatus } : null);
    }
  } catch (error) {
    console.error("FRONTEND_CATCH:", error);
  }
};

  // DELETE execution method talking directly down to the database row
  const handleDeleteInvoice = async () => {
    if (!invoiceToDelete) return;
    try {
      const response = await fetch(`/api/invoices/${invoiceToDelete}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to drop invoice log row entry');
      
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceToDelete));
      setInvoiceToDelete(null);
    } catch (error) {
      console.error(error);
      alert("Error dropping the asset row entry from the data table system.");
    }
  };

  const triggerBrowserPrintSequence = (invoice: DBInvoice) => {
    setSelectedInvoice(invoice);
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

  // Cost Aggregations Calculation Utility
  const calculateTotals = (invoice: DBInvoice | null) => {
    if (!invoice) return { rent: 0, water: 0, electricity: 0, grandTotal: 0 };
    const rent = parseFloat(invoice.lease?.monthlyRent || '0');
    const waterUnits = Math.max(0, invoice.waterThisMonth - invoice.waterLastMonth);
    const water = waterUnits * parseFloat(invoice.waterRate);
    const electUnits = Math.max(0, invoice.electricityThisMonth - invoice.electricityLastMonth);
    const electricity = electUnits * parseFloat(invoice.electricityRate);
    return { rent, water, electricity, grandTotal: rent + water + electricity };
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">Compiling system billing architecture ledger matrices...</p>
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
            <h1 className="text-3xl font-bold tracking-tight">Invoices Log</h1>
            <p className="text-muted-foreground mt-0.5">Manage, print, inspect, and drop utility bills</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="font-semibold"><Plus className="w-4 h-4 mr-1.5 stroke-[2.5]" />Create Invoice</Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
              {/* [Form content here - completely identical to original configuration] */}
              <DialogHeader><DialogTitle>Issue New Invoice from Active Leases</DialogTitle></DialogHeader>
              <form onSubmit={handleCreateInvoice} className="space-y-4 pt-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground">Select Target Tenant & Lease Context</label>
                  <select name="leaseId" value={formData.leaseId} onChange={handleInputChange} className="w-full h-10 px-3 py-2 border rounded-md bg-background focus:outline-none text-sm" required>
                    <option value="">-- Choose Tenant (Room) --</option>
                    {activeLeases.map((lease) => (
                      <option key={lease.id} value={lease.id}>{lease.tenant?.user?.name || 'Unknown Tenant'} (Room {lease.room?.roomNumber})</option>
                    ))}
                  </select>
                </div>
                {selectedLeaseDetails && (
                  <div className="bg-muted/40 p-3 rounded-lg text-sm grid grid-cols-2 gap-2 border">
                    <div><span className="text-muted-foreground">Tenant:</span> <strong className="block">{selectedLeaseDetails.tenant?.user?.name}</strong></div>
                    <div><span className="text-muted-foreground">Room:</span> <strong className="block">Room {selectedLeaseDetails.room?.roomNumber}</strong></div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 border-t pt-3">
                  <Input name="billingPeriod" placeholder="July 2026" value={formData.billingPeriod} onChange={handleInputChange} required />
                  <Input name="dueDate" type="date" value={formData.dueDate} onChange={handleInputChange} required />
                </div>
                <div className="grid grid-cols-3 gap-4 border-t pt-3">
                  <Input name="waterLastMonth" type="number" placeholder="Water Last" value={formData.waterLastMonth} onChange={handleInputChange} required />
                  <Input name="waterThisMonth" type="number" placeholder="Water This" value={formData.waterThisMonth} onChange={handleInputChange} required />
                  <Input name="waterRate" type="number" step="0.01" value={formData.waterRate} onChange={handleInputChange} required />
                </div>
                <div className="grid grid-cols-3 gap-4 border-t pt-3">
                  <Input name="electricityLastMonth" type="number" placeholder="Electric Last" value={formData.electricityLastMonth} onChange={handleInputChange} required />
                  <Input name="electricityThisMonth" type="number" placeholder="Electric This" value={formData.electricityThisMonth} onChange={handleInputChange} required />
                  <Input name="electricityRate" type="number" step="0.01" value={formData.electricityRate} onChange={handleInputChange} required />
                </div>
                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>Generate Invoice</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Live Ledger Data Table Grid */}
        {invoices.length === 0 ? (
          <div className="border border-dashed rounded-xl p-16 text-center text-muted-foreground flex flex-col items-center justify-center gap-2 bg-card shadow-sm">
            <FileText className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-base font-medium">No tracking billing configurations exist currently inside database files.</p>
          </div>
        ) : (
          <Card className="shadow-sm rounded-xl overflow-hidden border">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/60 border-b text-muted-foreground font-semibold tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Invoice ID</th>
                      <th className="px-6 py-4">Tenant Assignment</th>
                      <th className="px-6 py-4">Billing Period</th>
                      <th className="px-6 py-4">Total Balance</th>
                      <th className="px-6 py-4">Lifecycle Status</th>
                      <th className="px-6 py-4 text-right">Actions Operations</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y bg-card text-foreground">
                    {invoices.map((invoice) => {
                      const { grandTotal } = calculateTotals(invoice);
                      return (
                        <tr key={invoice.id} className="hover:bg-muted/10 transition-colors group">
                          <td className="px-6 py-4 font-mono font-bold text-xs text-primary">
                            #INV-{String(invoice.id).padStart(5, '0')}
                          </td>
                          <td className="px-6 py-4">
                            <div className="font-semibold tracking-tight text-sm">{invoice.lease?.tenant?.user?.name || 'Unknown Entity Profile'}</div>
                            <div className="text-xs text-muted-foreground font-medium">Room Unit: {invoice.lease?.room?.roomNumber || 'Unassigned'}</div>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground font-medium">{invoice.billingPeriod}</td>
                          <td className="px-6 py-4 font-bold text-foreground text-sm">${grandTotal.toFixed(2)}</td>
                          
                          {/* DYNAMIC DROPDOWN STATUS INTERACTION MATRIX */}
                          <td className="px-6 py-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className={`h-7 px-2.5 text-xs font-semibold rounded-full border capitalize gap-1 ${getStatusBadgeStyle(invoice.status)}`}>
                                  {invoice.status}
                                  <ChevronDown className="w-3 h-3 opacity-60 flex-shrink-0" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-32">
                                <DropdownMenuItem className="text-xs" onClick={() => updateInvoiceStatus(invoice.id, 'pending')}>Pending</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs text-emerald-600" onClick={() => updateInvoiceStatus(invoice.id, 'paid')}>Paid</DropdownMenuItem>
                                <DropdownMenuItem className="text-xs text-rose-600" onClick={() => updateInvoiceStatus(invoice.id, 'overdue')}>Overdue</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>

                          {/* ACTION PANEL MATRIX BUTTON CORES */}
                          <td className="px-6 py-4 text-right space-x-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openDetailsPanel(invoice)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => triggerBrowserPrintSequence(invoice)}>
                              <Printer className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" onClick={() => setInvoiceToDelete(invoice.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SLIDE-OUT DETAIL DRAWER (SHEET)                                          */}
      {/* ========================================================================= */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedInvoice && (
            <div className="space-y-6 pt-4 font-sans">
              <SheetHeader>
                <div className="flex items-center gap-2 text-xs font-mono text-primary font-bold">
                  <Hash className="w-3.5 h-3.5" /> INV-{String(selectedInvoice.id).padStart(5, '0')}
                </div>
                <SheetTitle className="text-2xl font-black tracking-tight mt-1">Invoice Details</SheetTitle>
                <SheetDescription>Detailed structural utility & rental billing summaries.</SheetDescription>
              </SheetHeader>

              {/* Status & Profile Section */}
              <div className="p-4 rounded-xl border bg-muted/40 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground font-medium">Lifecycle Status</span>
                  <Badge className={`capitalize font-bold text-xs ${getStatusBadgeStyle(selectedInvoice.status)}`}>{selectedInvoice.status}</Badge>
                </div>
                <div className="border-t border-muted pt-3 flex items-start gap-3">
                  <User className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm">
                    <strong className="block font-bold">{selectedInvoice.lease?.tenant?.user?.name}</strong>
                    <span className="text-xs text-muted-foreground">Room Unit: Room {selectedInvoice.lease?.room?.roomNumber}</span>
                  </div>
                </div>
                <div className="border-t border-muted pt-3 flex items-start gap-3">
                  <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <div className="text-sm">
                    <span className="block font-medium text-xs text-muted-foreground">Cycle period: {selectedInvoice.billingPeriod}</span>
                    <span className="block font-bold text-xs text-rose-500 mt-0.5">Due Date: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Line-Items Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Itemized Statement Breakdown</h3>
                <div className="border rounded-xl p-4 divide-y space-y-3 bg-card shadow-sm text-sm">
                  {/* Rent */}
                  <div className="flex justify-between items-center pt-1">
                    <div>
                      <span className="font-semibold block">Base Room Rental Fee</span>
                      <span className="text-xs text-muted-foreground">Standard Contractual flat-rate</span>
                    </div>
                    <span className="font-bold">${activeDetails.rent.toFixed(2)}</span>
                  </div>
                  {/* Water */}
                  <div className="flex justify-between items-center pt-3">
                    <div>
                      <span className="font-semibold block">Water Consumption</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({selectedInvoice.waterThisMonth} - {selectedInvoice.waterLastMonth}) × ${selectedInvoice.waterRate}
                      </span>
                    </div>
                    <span className="font-bold">${activeDetails.water.toFixed(2)}</span>
                  </div>
                  {/* Electric */}
                  <div className="flex justify-between items-center pt-3">
                    <div>
                      <span className="font-semibold block">Electricity Grid Use</span>
                      <span className="text-xs text-muted-foreground font-mono">
                        ({selectedInvoice.electricityThisMonth} - {selectedInvoice.electricityLastMonth}) × ${selectedInvoice.electricityRate}
                      </span>
                    </div>
                    <span className="font-bold">${activeDetails.electricity.toFixed(2)}</span>
                  </div>
                  {/* Grand total */}
                  <div className="flex justify-between items-center pt-4 border-t-2 border-foreground text-base">
                    <span className="font-black">Total Bill Due</span>
                    <span className="font-black text-primary">${activeDetails.grandTotal.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                <Button className="w-full gap-1.5 font-semibold" onClick={() => { setIsDetailOpen(false); triggerBrowserPrintSequence(selectedInvoice); }}>
                  <Printer className="w-4 h-4" /> Print Document Statement
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ========================================================================= */}
      {/* DELETION CONFIRMATION DIALOG (ALERT DIALOG)                               */}
      {/* ========================================================================= */}
        <AlertDialog
        open={invoiceToDelete !== null}
        onOpenChange={(val) => {
            if (!val) {
            setInvoiceToDelete(null);
            }
        }}
        >
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>
                Are you absolutely certain?
            </AlertDialogTitle>
            <AlertDialogDescription>
                This permanent action removes this specific billing invoice row
                tracking matrix from database tables. It cannot be undone.
            </AlertDialogDescription>
            </AlertDialogHeader>

            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={handleDeleteInvoice}
            >
                Delete Permanently
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
        </AlertDialog>
      {/* ========================================================================= */}
      {/* HIGH-CONTRAST INVOICE PRINT VIEW LAYOUT                                   */}
      {/* ========================================================================= */}
      {selectedInvoice && (
        <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:text-black  z-50  p-12 bg-white text-black font-sans min-h-screen text-xs leading-relaxed">
          <div className="flex justify-between items-start border-b-4 border-black pb-8">
            <div className="space-y-1">
              <h2 className="text-4xl font-black tracking-tight text-black uppercase">RENTAL INVOICE</h2>
              <p className="text-gray-600 font-mono text-sm tracking-widest">SERIAL ID: #INV-{String(selectedInvoice.id).padStart(5, '0')}</p>
            </div>
            <div className="text-right space-y-0.5">
              <strong className="text-base text-black block font-black uppercase tracking-wider">ESTATE OPERATIONS HQ</strong>
              <p className="text-gray-500 font-mono">billing@property-management.local</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 my-10 bg-gray-100 p-6 rounded-lg border border-gray-300">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Bill To Recipient</span>
              <strong className="text-lg text-black block font-black tracking-tight">{selectedInvoice.lease?.tenant?.user?.name}</strong>
              <p className="text-gray-700 text-xs font-medium">Assigned Room Unit: <strong className="text-black font-bold">Room {selectedInvoice.lease?.room?.roomNumber}</strong></p>
            </div>
            <div className="space-y-1.5 text-right">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Statement Summary</span>
              <p className="text-gray-700 text-xs">Target Cycle: <strong>{selectedInvoice.billingPeriod}</strong></p>
              <p className="text-gray-700 text-xs">Status: <strong>{selectedInvoice.status.toUpperCase()}</strong></p>
              <p className="text-black font-black text-xs border-t border-gray-300 pt-1 mt-1 inline-block">Payment Deadline Target: {new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          <table className="w-full my-8 text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-[10px] uppercase text-black font-black tracking-wider">
                <th className="py-2.5">Operational Item Matrix Lines</th>
                <th className="py-2.5 text-right">Meter Reading Indices</th>
                <th className="py-2.5 text-right">Consumed Volume</th>
                <th className="py-2.5 text-right">Unit Scalar Rate</th>
                <th className="py-2.5 text-right">Line Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 text-gray-900 text-xs font-medium">
              <tr>
                <td className="py-4 font-bold text-black">Contractual Base Room Rental Fees</td>
                <td className="py-4 text-right text-gray-400">--</td>
                <td className="py-4 text-right">1 Month cycle</td>
                <td className="py-4 text-right">${activeDetails.rent.toFixed(2)}</td>
                <td className="py-4 text-right font-bold text-black">${activeDetails.rent.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-4 font-bold text-black">Water Utility Supply</td>
                <td className="py-4 text-right text-gray-500 font-mono text-[11px]">({selectedInvoice.waterLastMonth} ➔ {selectedInvoice.waterThisMonth})</td>
                <td className="py-4 text-right">{Math.max(0, selectedInvoice.waterThisMonth - selectedInvoice.waterLastMonth)} units</td>
                <td className="py-4 text-right">${parseFloat(selectedInvoice.waterRate).toFixed(2)}</td>
                <td className="py-4 text-right font-bold text-black">${activeDetails.water.toFixed(2)}</td>
              </tr>
              <tr>
                <td className="py-4 font-bold text-black">Electrical Energy Consumption</td>
                <td className="py-4 text-right text-gray-500 font-mono text-[11px]">({selectedInvoice.electricityLastMonth} ➔ {selectedInvoice.electricityThisMonth})</td>
                <td className="py-4 text-right">{Math.max(0, selectedInvoice.electricityThisMonth - selectedInvoice.electricityLastMonth)} kWh</td>
                <td className="py-4 text-right">${parseFloat(selectedInvoice.electricityRate).toFixed(2)}</td>
                <td className="py-4 text-right font-bold text-black">${activeDetails.electricity.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end mt-12 border-t-4 border-black pt-6">
            <div className="w-72 space-y-2 text-right">
              <div className="flex justify-between text-xs text-gray-600 font-semibold">
                <span>Calculated Net Subtotal:</span>
                <span>${activeDetails.grandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-black border-t-2 pt-3 border-black text-black">
                <span>TOTAL BALANCE DUE:</span>
                <span>${activeDetails.grandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}