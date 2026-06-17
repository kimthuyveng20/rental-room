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
      
      if (!response.ok) throw new Error('Patch mutation failure');
      const updatedRecord = await response.json();
      
      setPayments(prev => prev.map(p => p.id === id ? { 
        ...p, 
        status: nextStatus, 
        paymentDate: updatedRecord.paymentDate 
      } : p));
    } catch (err) {
      console.error(err);
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
    setTimeout(() => { window.print(); }, 100);
  };

  const calculatedStats = payments.reduce((acc, current) => {
    const val = parseFloat(current.amount || '0');
    if (current.status === 'completed' || current.status === 'paid' as any) acc.collected += val;
    if (current.status === 'pending') acc.pending += val;
    if (current.status === 'overdue') acc.overdue += val;
    return acc;
  }, { collected: 0, pending: 0, overdue: 0 });

  const stats = [
    { label: t('stats.collected'), value: `$${calculatedStats.collected.toFixed(2)}`, icon: DollarSign, color: 'text-green-600' },
    { label: t('stats.pending'), value: `$${calculatedStats.pending.toFixed(2)}`, icon: AlertCircle, color: 'text-yellow-600' },
    { label: t('stats.overdue'), value: `$${calculatedStats.overdue.toFixed(2)}`, icon: TrendingUp, color: 'text-red-600' },
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

  const getTextStatus = (status: string) => status === 'paid' ? "completed" : status;

  if (loading) {
    return (
      <DashboardLayout userRole="owner">
        <div className="flex h-[50vh] flex-col items-center justify-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const renderPaymentsTable = (dataset: DBPayment[], tabKey: string, includeOverdueColumn = false) => {
    const currentTabActivePage = pageStates[tabKey] || 1;
    const totalPages = Math.max(1, Math.ceil(dataset.length / itemsPerPage));
    const pagedDataset = dataset.slice((currentTabActivePage - 1) * itemsPerPage, currentTabActivePage * itemsPerPage);

    const handlePageChange = (targetPage: number) => setPageStates(prev => ({ ...prev, [tabKey]: targetPage }));

    return (
      <div className="space-y-4">
        {/* Mobile View */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {pagedDataset.map((payment) => (
            <div key={payment.id} className="p-4 border rounded-xl bg-card shadow-sm space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{payment.lease?.tenant?.user?.name || 'N/A'}</p>
                  <p className="text-xs text-muted-foreground">{t('table.roomFormat', { roomNumber: payment.lease?.room?.roomNumber || 'N/A' })}</p>
                </div>
                <Badge className={cn("capitalize text-[10px]", getStatusColor(payment.status))}>{t(`status.${getTextStatus(payment.status)}`)}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground font-medium">Amount</span>
                <span className="font-bold">${parseFloat(payment.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t mt-2">
                <Button variant="ghost" size="sm" onClick={() => triggerBrowserPrintSequence(payment)}><Printer className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setPaymentToDelete(payment.id)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="border-b text-muted-foreground font-semibold">
                <th className="text-left py-3 px-4">Tenant</th>
                <th className="text-left py-3 px-4">Room</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Due Date</th>
                <th className="text-left py-3 px-4">Status</th>
                {/* <th className="text-right py-3 px-4">Actions</th> */}
              </tr>
            </thead>
            <tbody>
              {pagedDataset.map((payment) => (
                <tr key={payment.id} className="border-b hover:bg-muted/40">
                  <td className="py-3 px-4 font-bold">{payment.lease?.tenant?.user?.name || 'N/A'}</td>
                  <td className="py-3 px-4 text-muted-foreground">{payment.lease?.room?.roomNumber || 'N/A'}</td>
                  <td className="py-3 px-4 font-bold">${parseFloat(payment.amount).toFixed(2)}</td>
                  <td className="py-3 px-4 text-muted-foreground">{format(new Date(payment.dueDate), 'MMM dd, yyyy')}</td>
                  <td className="py-3 px-4">
                    <Badge className={cn("capitalize", getStatusColor(payment.status))}>{t(`status.${getTextStatus(payment.status)}`)}</Badge>
                  </td>
                  {/* <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="icon" onClick={() => triggerBrowserPrintSequence(payment)}><Printer className="w-4 h-4" /></Button>
                  </td> */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {dataset.length > itemsPerPage && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => handlePageChange(Math.max(currentTabActivePage - 1, 1))} />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNumber) => (
                <PaginationItem key={pageNumber}>
                  <PaginationLink isActive={pageNumber === currentTabActivePage} onClick={() => handlePageChange(pageNumber)}>
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext onClick={() => handlePageChange(Math.min(currentTabActivePage + 1, totalPages))} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout userRole="owner">
      <div className="space-y-6 print:hidden">
        <div>
          <h1 className="text-3xl font-bold py-2 tracking-tight">{t('title')}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-black mt-2">{stat.value}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted"><Icon className={`w-6 h-6 ${stat.color}`} /></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card>
          <CardHeader><CardTitle>{t('matrixTitle')}</CardTitle></CardHeader>
          <CardContent>
            <div className="w-full overflow-x-auto pb-2">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full justify-start">
                  <TabsTrigger value="all">{t('tabs.all', { count: payments.length })}</TabsTrigger>
                  <TabsTrigger value="completed">{t('tabs.completed', { count: payments.filter(p => p.status === 'completed').length })}</TabsTrigger>
                  <TabsTrigger value="pending">{t('tabs.pending', { count: payments.filter(p => p.status === 'pending').length })}</TabsTrigger>
                <TabsTrigger value="overdue">{t('tabs.overdue', { count: payments.filter(p => p.status === 'overdue').length })}</TabsTrigger>
                </TabsList>
                <TabsContent value="all">{renderPaymentsTable(payments, 'all')}</TabsContent>
                <TabsContent value="completed">{renderPaymentsTable(payments.filter(p => p.status === 'completed'), 'completed')}</TabsContent>
                <TabsContent value="pending">{renderPaymentsTable(payments.filter(p => p.status === 'pending'), 'pending')}</TabsContent>
                <TabsContent value="overdue">{renderPaymentsTable(payments.filter(p => p.status === 'overdue'), 'overdue', true)}</TabsContent>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={paymentToDelete !== null} onOpenChange={(val) => !val && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={deletePaymentRecord}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}