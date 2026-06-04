'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Badge } from '@/src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/src/components/ui/dropdown-menu";
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
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Loader2, ChevronDown, Printer, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface DBPayment {
  id: number;
  leaseId: number;
  amount: string;
  paymentDate: string | null;
  dueDate: string;
  status: 'completed' | 'pending' | 'overdue';
  paymentMethod: string | null;
  lease?: {
    room: { roomNumber: string };
    tenant: { user: { name: string } };
  };
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<DBPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentForPrint, setSelectedPaymentForPrint] = useState<DBPayment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);

  // Synchronizes full dataset ledger array from operational backend loops
  const syncPaymentsLedger = async () => {
    try {
      const res = await fetch('/api/payments');
      if (!res.ok) throw new Error('Network response fault occurred');
      const data = await res.json();
      setPayments(data);
    } catch (err) {
      console.error("Initialization pipeline connection error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    syncPaymentsLedger();
  }, []);

  const updatePaymentStatus = async (id: number, nextStatus: 'completed' | 'pending' | 'overdue') => {
  try {
    // Standardize 'completed' tracking string to match our database's 'paid' enum requirement
    const targetDbStatus = nextStatus === 'completed' ? 'paid' : nextStatus;

    const response = await fetch(`/api/payments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: targetDbStatus }),
    });
    
    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      console.error("PAYMENT_SERVER_CRASH_INFO:", errorPayload);
      throw new Error(errorPayload.error || 'Patch mutation failure occurred on data sheet.');
    }

    const updatedRecord = await response.json();
    
    // Synchronize your local array list to make counters re-render instantly 
    setPayments(prev => prev.map(p => p.id === id ? { 
      ...p, 
      status: nextStatus, // Keeps 'completed' layout working safely for UI tabs matching rules
      paymentDate: updatedRecord.paymentDate 
    } : p));

  } catch (err) {
    console.error("FRONTEND_MUTATION_CATCH:", err);
  }
};

  // Safely drops a row out of relational asset databases
  const deletePaymentRecord = async () => {
    if (!paymentToDelete) return;
    try {
      const res = await fetch(`/api/payments/${paymentToDelete}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Deletion endpoint execution fail');
      setPayments(prev => prev.filter(p => p.id !== paymentToDelete));
      setPaymentToDelete(null);
    } catch (err) {
      console.error(err);
    }
  };

  const triggerBrowserPrintSequence = (payment: DBPayment) => {
    setSelectedPaymentForPrint(payment);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Aggregates computed summaries on real structural inputs
  const calculatedStats = payments.reduce((acc, current) => {
    const val = parseFloat(current.amount || '0');
    if (current.status === 'completed') acc.collected += val;
    if (current.status === 'pending') acc.pending += val;
    if (current.status === 'overdue') acc.overdue += val;
    return acc;
  }, { collected: 0, pending: 0, overdue: 0 });

  const stats = [
    { label: 'Total Collected', value: `$${calculatedStats.collected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-green-600' },
    { label: 'Pending Payments', value: `$${calculatedStats.pending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: AlertCircle, color: 'text-yellow-600' },
    { label: 'Overdue Payments', value: `$${calculatedStats.overdue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-red-600' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30';
      case 'overdue': return 'bg-rose-500/15 text-rose-600 border-rose-500/30';
      default: return 'bg-amber-500/15 text-amber-600 border-amber-500/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'overdue': return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default: return <AlertCircle className="w-4 h-4 text-amber-600" />;
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="owner">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">Fetching real live database tables matrices...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Shared reusable helper table renderer to clean code complexity
  const renderPaymentsTable = (dataset: DBPayment[], includeOverdueColumn = false) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground font-semibold">
            <th className="text-left py-3 px-4">Tenant Name</th>
            <th className="text-left py-3 px-4">Room Unit</th>
            <th className="text-left py-3 px-4">Amount Balance</th>
            <th className="text-left py-3 px-4">Due Date</th>
            {!includeOverdueColumn ? <th className="text-left py-3 px-4">Paid Date</th> : <th className="text-left py-3 px-4">Overdue Duration</th>}
            <th className="text-left py-3 px-4">Status Tag</th>
            <th className="text-right py-3 px-4">Operations Actions</th>
          </tr>
        </thead>
        <tbody>
          {dataset.map((payment) => {
            const daysOverdue = Math.max(0, Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
            return (
              <tr key={payment.id} className="border-b hover:bg-muted/40 transition-colors">
                <td className="py-3 px-4 font-bold tracking-tight">{payment.lease?.tenant?.user?.name || 'Unknown Entity Record'}</td>
                <td className="py-3 px-4 font-medium text-muted-foreground">Room {payment.lease?.room?.roomNumber || 'N/A'}</td>
                <td className="py-3 px-4 font-bold text-foreground">${parseFloat(payment.amount).toFixed(2)}</td>
                <td className="py-3 px-4 text-muted-foreground">{format(new Date(payment.dueDate), 'MMM dd, yyyy')}</td>
                {!includeOverdueColumn ? (
                  <td className="py-3 px-4">{payment.paymentDate ? format(new Date(payment.paymentDate), 'MMM dd, yyyy') : '-'}</td>
                ) : (
                  <td className="py-3 px-4 text-rose-600 font-bold">{daysOverdue} days late</td>
                )}
                
                {/* INLINE LIFE CYCLE DROPDOWN SWITCHER MATRIX */}
                <td className="py-3 px-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className={`h-7 px-2.5 text-xs font-bold rounded-full border capitalize gap-1 ${getStatusColor(payment.status)}`}>
                        {getStatusIcon(payment.status)}
                        {payment.status}
                        <ChevronDown className="w-3 h-3 opacity-60" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-32">
                      <DropdownMenuItem className="text-xs text-amber-600 font-semibold" onClick={() => updatePaymentStatus(payment.id, 'pending')}>Pending</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs text-emerald-600 font-semibold" onClick={() => updatePaymentStatus(payment.id, 'completed')}>Completed</DropdownMenuItem>
                      <DropdownMenuItem className="text-xs text-rose-600 font-semibold" onClick={() => updatePaymentStatus(payment.id, 'overdue')}>Overdue</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>

                <td className="py-3 px-4 text-right space-x-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => triggerBrowserPrintSequence(payment)}>
                    <Printer className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setPaymentToDelete(payment.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return (
    <DashboardLayout userRole="owner">
      {/* 💡 CRITICAL TAILWIND FIX: Add print:hidden to keep this out of the print rendering queue */}
      <div className="space-y-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments Ledger</h1>
          <p className="text-muted-foreground mt-1">Track and manage relational real-time property metrics</p>
        </div>

        {/* Stats Grid Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="shadow-sm border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-black tracking-tight mt-2">{stat.value}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted">
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Payment History Filtering Section */}
        <Card className="shadow-sm border">
          <CardHeader><CardTitle>Operational Billing Records Matrix</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList>
                <TabsTrigger value="all">All Logs ({payments.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({payments.filter(p => p.status === 'completed').length})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({payments.filter(p => p.status === 'pending').length})</TabsTrigger>
                <TabsTrigger value="overdue">Overdue ({payments.filter(p => p.status === 'overdue').length})</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">{renderPaymentsTable(payments)}</TabsContent>
              <TabsContent value="completed" className="mt-6">{renderPaymentsTable(payments.filter(p => p.status === 'completed'))}</TabsContent>
              <TabsContent value="pending" className="mt-6">{renderPaymentsTable(payments.filter(p => p.status === 'pending'))}</TabsContent>
              <TabsContent value="overdue" className="mt-6">{renderPaymentsTable(payments.filter(p => p.status === 'overdue'), true)}</TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* PROFESSIONAL HIGH-CONTRAST INVOICE PRINT VIEW LAYOUT                       */}
      {/* ========================================================================= */}
      {/* 💡 FIXED PRINT WRAPPER: Avoids blank displays with print:block print:absolute */}
      {selectedPaymentForPrint && (
        <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:text-black p-12 bg-white text-black font-sans min-h-screen text-xs leading-relaxed z-50">
          <div className="flex justify-between items-start border-b-4 border-black pb-8">
            <div className="space-y-1">
              <h2 className="text-4xl font-black tracking-tight uppercase">RECEIPT / STATEMENT</h2>
              <p className="text-gray-600 font-mono text-sm tracking-widest">TRANSACTION REFERENCE: #PAY-{String(selectedPaymentForPrint.id).padStart(5, '0')}</p>
            </div>
            <div className="text-right space-y-0.5">
              <strong className="text-base block font-black uppercase tracking-wider">ESTATE FINANCE OPERATIONS</strong>
              <p className="text-gray-500 font-mono">system-wireline@property-mgmt.local</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 my-10 bg-gray-100 p-6 rounded-lg border border-gray-300">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Account Associated Tenant</span>
              <strong className="text-lg block font-black tracking-tight">{selectedPaymentForPrint.lease?.tenant?.user?.name || 'N/A'}</strong>
              <p className="text-gray-700 text-xs font-medium">Assigned Real Estate Asset Location: <strong className="text-black font-bold">Room {selectedPaymentForPrint.lease?.room?.roomNumber || 'N/A'}</strong></p>
            </div>
            <div className="space-y-1.5 text-right">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">Ledger Verification Metadata</span>
              <p className="text-gray-700 text-xs">Contract Deadline: <strong>{format(new Date(selectedPaymentForPrint.dueDate), 'MMMM dd, yyyy')}</strong></p>
              <p className="text-gray-700 text-xs">Current Verification Status: <strong className="uppercase">{selectedPaymentForPrint.status}</strong></p>
              {selectedPaymentForPrint.paymentDate && <p className="text-black font-black text-xs border-t border-gray-300 pt-1 mt-1 inline-block">Payment Finalized On: {format(new Date(selectedPaymentForPrint.paymentDate), 'MMMM dd, yyyy')}</p>}
            </div>
          </div>

          <table className="w-full my-8 text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-[10px] uppercase font-black tracking-wider">
                <th className="py-2.5">Statement Charge Allocation Line-Item Description</th>
                <th className="py-2.5 text-right">Method Type Used</th>
                <th className="py-2.5 text-right">Line Total Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 font-medium text-xs">
              <tr>
                <td className="py-4 font-bold">Contractual Real Estate Base Rental Charge Obligation</td>
                <td className="py-4 text-right font-mono">{selectedPaymentForPrint.paymentMethod || 'Electronic/Standard Processing'}</td>
                <td className="py-4 text-right font-black text-base">${parseFloat(selectedPaymentForPrint.amount).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end mt-12 border-t-4 border-black pt-6">
            <div className="w-72 space-y-2 text-right">
              <div className="flex justify-between text-xl font-black text-black">
                <span>TOTAL REMITTED DUE:</span>
                <span>${parseFloat(selectedPaymentForPrint.amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Safe confirmation handling alert panels framework */}
      <AlertDialog open={paymentToDelete !== null} onOpenChange={(val) => !val && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>This permanent operation drops this transaction row entry record out of structural database tables. It cannot be reversed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={deletePaymentRecord}>Delete Permanently</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}