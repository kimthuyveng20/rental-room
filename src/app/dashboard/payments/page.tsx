'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/src/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button, buttonVariants } from '@/src/components/ui/button';
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
import { 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Loader2, 
  ChevronDown, 
  Printer, 
  Trash2,
  ChevronLeftIcon,
  ChevronRightIcon
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

/* ==========================================
   shadcn/ui Pagination Internal Subcomponents
   ========================================== */

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      role="navigation"
      aria-label="pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  )
}

function PaginationContent({
  className,
  ...props
}: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex flex-row items-center gap-1', className)}
      {...props}
    />
  )
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />
}

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
  React.ComponentProps<'a'>

function PaginationLink({
  className,
  isActive,
  size = 'icon',
  ...props
}: PaginationLinkProps) {
  return (
    <a
      aria-current={isActive ? 'page' : undefined}
      data-slot="pagination-link"
      data-active={isActive}
      className={cn(
        buttonVariants({
          variant: isActive ? 'outline' : 'ghost',
          size,
        }),
        className,
      )}
      {...props}
    />
  )
}

function PaginationPrevious({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to previous page"
      size="default"
      className={cn('gap-1 px-2.5 sm:pl-2.5 cursor-pointer', className)}
      {...props}
    >
      <ChevronLeftIcon className="w-4 h-4" />
      <span className="hidden sm:block">Previous</span>
    </PaginationLink>
  )
}

function PaginationNext({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) {
  return (
    <PaginationLink
      aria-label="Go to next page"
      size="default"
      className={cn('gap-1 px-2.5 sm:pr-2.5 cursor-pointer', className)}
      {...props}
    >
      <span className="hidden sm:block">Next</span>
      <ChevronRightIcon className="w-4 h-4" />
    </PaginationLink>
  )
}

/* ==========================================
   Interfaces and Component Core
   ========================================== */

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
  const t = useTranslations('payments');
  const [payments, setPayments] = useState<DBPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaymentForPrint, setSelectedPaymentForPrint] = useState<DBPayment | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<number | null>(null);

  // Pagination states tracked independently per active view matrix
  const [activeTab, setActiveTab] = useState<string>('all');
  const [pageStates, setPageStates] = useState<Record<string, number>>({
    all: 1,
    completed: 1,
    pending: 1,
    overdue: 1,
  });
  const itemsPerPage = 5;

  const syncPaymentsLedger = async () => {
  try {
    const res = await fetch('/api/payments');
    if (!res.ok) throw new Error('Network response fault occurred');
    const data = await res.json();
    
    // Normalize data from the backend ('paid' -> 'completed') right away
    const normalizedData = data.map((p: any) => ({
      ...p,
      status: p.status === 'paid' ? 'completed' : p.status
    }));

    setPayments(normalizedData);
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
      
      setPayments(prev => prev.map(p => p.id === id ? { 
        ...p, 
        status: nextStatus, 
        paymentDate: updatedRecord.paymentDate 
      } : p));

    } catch (err) {
      console.error("FRONTEND_MUTATION_CATCH:", err);
    }
  };

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

  const calculatedStats = payments.reduce((acc, current) => {
    const val = parseFloat(current.amount || '0');
    // Account for both frontend ('completed') and backend ('paid') status variants
    if (current.status === 'completed' || current.status === 'paid' as any) acc.collected += val;
    if (current.status === 'pending') acc.pending += val;
    if (current.status === 'overdue') acc.overdue += val;
    return acc;
  }, { collected: 0, pending: 0, overdue: 0 });

  const stats = [
    { label: t('stats.collected'), value: `$${calculatedStats.collected.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, color: 'text-green-600' },
    { label: t('stats.pending'), value: `$${calculatedStats.pending.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: AlertCircle, color: 'text-yellow-600' },
    { label: t('stats.overdue'), value: `$${calculatedStats.overdue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, color: 'text-red-600' },
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

  const getTextStatus = (status: string) => {
    switch (status) {
      case 'paid': return "completed";
      case 'overdue': return "overdue";
      default: return "pending";
    }
  };

  if (loading) {
    return (
      <DashboardLayout userRole="owner">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm font-medium">{t('loadingText')}</p>
        </div>
      </DashboardLayout>
    );
  }

  const renderPaymentsTable = (dataset: DBPayment[], tabKey: string, includeOverdueColumn = false) => {
    const currentTabActivePage = pageStates[tabKey] || 1;
    const totalPages = Math.max(1, Math.ceil(dataset.length / itemsPerPage));
    
    // Slice raw context to render current chunk
    const pagedDataset = dataset.slice(
      (currentTabActivePage - 1) * itemsPerPage,
      currentTabActivePage * itemsPerPage
    );

    const handlePageChange = (targetPage: number) => {
      setPageStates(prev => ({ ...prev, [tabKey]: targetPage }));
    };

    return (
      <div className="space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground font-semibold">
                <th className="text-left py-3 px-4">{t('table.headers.tenant')}</th>
                <th className="text-left py-3 px-4">{t('table.headers.room')}</th>
                <th className="text-left py-3 px-4">{t('table.headers.amount')}</th>
                <th className="text-left py-3 px-4">{t('table.headers.dueDate')}</th>
                {!includeOverdueColumn ? <th className="text-left py-3 px-4">{t('table.headers.paidDate')}</th> : <th className="text-left py-3 px-4">{t('table.headers.overdueDuration')}</th>}
                <th className="text-left py-3 px-4">{t('table.headers.status')}</th>
                <th className="text-right py-3 px-4">{t('table.headers.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedDataset.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No records found.
                  </td>
                </tr>
              ) : (
                pagedDataset.map((payment) => {
                  const daysOverdue = Math.max(0, Math.floor((new Date().getTime() - new Date(payment.dueDate).getTime()) / (1000 * 60 * 60 * 24)));
                  return (
                    <tr key={payment.id} className="border-b hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-4 font-bold tracking-tight">{payment.lease?.tenant?.user?.name || t('table.unknownEntity')}</td>
                      <td className="py-3 px-4 font-medium text-muted-foreground">{t('table.roomFormat', { roomNumber: payment.lease?.room?.roomNumber || 'N/A' })}</td>
                      <td className="py-3 px-4 font-bold text-foreground">${parseFloat(payment.amount).toFixed(2)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{format(new Date(payment.dueDate), 'MMM dd, yyyy')}</td>
                      {!includeOverdueColumn ? (
                        <td className="py-3 px-4">{payment.paymentDate ? format(new Date(payment.paymentDate), 'MMM dd, yyyy') : '-'}</td>
                      ) : (
                        <td className="py-3 px-4 text-rose-600 font-bold">{t('table.daysLate', { count: daysOverdue })}</td>
                      )}
                      
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className={`h-7 px-2.5 text-xs font-bold rounded-full border capitalize gap-1 ${getStatusColor(payment.status)}`}>
                              {getStatusIcon(payment.status)}
                              {t(`status.${getTextStatus(payment.status)}`)}
                              <ChevronDown className="w-3 h-3 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-32">
                            <DropdownMenuItem className="text-xs text-amber-600 font-semibold" onClick={() => updatePaymentStatus(payment.id, 'pending')}>{t('status.pending')}</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs text-emerald-600 font-semibold" onClick={() => updatePaymentStatus(payment.id, 'completed')}>{t('status.completed')}</DropdownMenuItem>
                            <DropdownMenuItem className="text-xs text-rose-600 font-semibold" onClick={() => updatePaymentStatus(payment.id, 'overdue')}>{t('status.overdue')}</DropdownMenuItem>
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
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Pagination Control Overlay */}
        {dataset.length > itemsPerPage && (
          <div className="pt-2">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => handlePageChange(Math.max(currentTabActivePage - 1, 1))}
                    className={currentTabActivePage === 1 ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
                
                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNumber) => (
                  <PaginationItem key={pageNumber}>
                    <PaginationLink
                      className="cursor-pointer"
                      isActive={pageNumber === currentTabActivePage}
                      onClick={() => handlePageChange(pageNumber)}
                    >
                      {pageNumber}
                    </PaginationLink>
                  </PaginationItem>
                ))}

                <PaginationItem>
                  <PaginationNext 
                    onClick={() => handlePageChange(Math.min(currentTabActivePage + 1, totalPages))}
                    className={currentTabActivePage === totalPages ? "pointer-events-none opacity-50" : ""}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout userRole="owner">
      <div className="space-y-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold py-2 tracking-tight">{t('title')}</h1>
          <p className="text-muted-foreground mt-1">{t('subtitle')}</p>
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
          <CardHeader><CardTitle>{t('matrixTitle')}</CardTitle></CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList>
                <TabsTrigger value="all">{t('tabs.all', { count: payments.length })}</TabsTrigger>
                <TabsTrigger value="completed">{t('tabs.completed', { count: payments.filter(p => p.status === 'completed').length })}</TabsTrigger>
                <TabsTrigger value="pending">{t('tabs.pending', { count: payments.filter(p => p.status === 'pending').length })}</TabsTrigger>
                <TabsTrigger value="overdue">{t('tabs.overdue', { count: payments.filter(p => p.status === 'overdue').length })}</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                {renderPaymentsTable(payments, 'all')}
              </TabsContent>
              <TabsContent value="completed" className="mt-6">
                {renderPaymentsTable(payments.filter(p => p.status === 'completed'), 'completed')}
              </TabsContent>
              <TabsContent value="pending" className="mt-6">
                {renderPaymentsTable(payments.filter(p => p.status === 'pending'), 'pending')}
              </TabsContent>
              <TabsContent value="overdue" className="mt-6">
                {renderPaymentsTable(payments.filter(p => p.status === 'overdue'), 'overdue', true)}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Print View Layout */}
      {selectedPaymentForPrint && (
        <div className="hidden print:block print:absolute print:inset-0 print:bg-white print:text-black p-12 bg-white text-black font-sans min-h-screen text-xs leading-relaxed z-50">
          <div className="flex justify-between items-start border-b-4 border-black pb-8">
            <div className="space-y-1">
              <h2 className="text-4xl font-black tracking-tight uppercase">{t('print.headerTitle')}</h2>
              <p className="text-gray-600 font-mono text-sm tracking-widest">{t('print.reference')}: #PAY-{String(selectedPaymentForPrint.id).padStart(5, '0')}</p>
            </div>
            <div className="text-right space-y-0.5">
              <strong className="text-base block font-black uppercase tracking-wider">{t('print.companyName')}</strong>
              <p className="text-gray-500 font-mono">system-wireline@property-mgmt.local</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 my-10 bg-gray-100 p-6 rounded-lg border border-gray-300">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">{t('print.tenantLabel')}</span>
              <strong className="text-lg block font-black tracking-tight">{selectedPaymentForPrint.lease?.tenant?.user?.name || 'N/A'}</strong>
              <p className="text-gray-700 text-xs font-medium">{t('print.locationLabel')}: <strong className="text-black font-bold">{t('table.roomFormat', { roomNumber: selectedPaymentForPrint.lease?.room?.roomNumber || 'N/A' })}</strong></p>
            </div>
            <div className="space-y-1.5 text-right">
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold block">{t('print.metaLabel')}</span>
              <p className="text-gray-700 text-xs">{t('print.deadline')}: <strong>{format(new Date(selectedPaymentForPrint.dueDate), 'MMMM dd, yyyy')}</strong></p>
              <p className="text-gray-700 text-xs">{t('print.status')}: <strong className="uppercase">{t(`status.${getTextStatus(selectedPaymentForPrint.status)}`)}</strong></p>
              {selectedPaymentForPrint.paymentDate && <p className="text-black font-black text-xs border-t border-gray-300 pt-1 mt-1 inline-block">{t('print.finalizedDate')}: {format(new Date(selectedPaymentForPrint.paymentDate), 'MMMM dd, yyyy')}</p>}
            </div>
          </div>

          <table className="w-full my-8 text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-black text-[10px] uppercase font-black tracking-wider">
                <th className="py-2.5">{t('print.tableHeaders.desc')}</th>
                <th className="py-2.5 text-right">{t('print.tableHeaders.method')}</th>
                <th className="py-2.5 text-right">{t('print.tableHeaders.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300 font-medium text-xs">
              <tr>
                <td className="py-4 font-bold">{t('print.itemDesc')}</td>
                <td className="py-4 text-right font-mono">{selectedPaymentForPrint.paymentMethod || t('print.defaultMethod')}</td>
                <td className="py-4 text-right font-black text-base">${parseFloat(selectedPaymentForPrint.amount).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end mt-12 border-t-4 border-black pt-6">
            <div className="w-72 space-y-2 text-right">
              <div className="flex justify-between text-xl font-black text-black">
                <span>{t('print.totalDue')}:</span>
                <span>${parseFloat(selectedPaymentForPrint.amount).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={paymentToDelete !== null} onOpenChange={(val) => !val && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('dialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={deletePaymentRecord}>{t('dialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}