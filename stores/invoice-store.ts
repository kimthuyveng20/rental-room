import { create } from 'zustand';

export interface InvoiceItem {
  id: number;
  leaseId: number;
  roomNumber: string;
  tenantName: string;
  waterLastMonth: number;
  waterThisMonth: number;
  waterUsage: number;
  waterRate: string;
  waterTotal: string;
  electricityLastMonth: number;
  electricityThisMonth: number;
  electricityUsage: number;
  electricityRate: string;
  electricityTotal: string;
  roomRent: string;
  grandTotal: string;
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled';
  billingPeriod: string;
  dueDate: string;
  createdAt: Date;
  updatedAt: Date;
}

interface InvoiceStore {
  invoices: InvoiceItem[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setInvoices: (invoices: InvoiceItem[]) => void;
  addInvoice: (invoice: InvoiceItem) => void;
  updateInvoice: (id: number, invoice: Partial<InvoiceItem>) => void;
  deleteInvoice: (id: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Computed
  getInvoiceById: (id: number) => InvoiceItem | undefined;
  getPendingInvoices: () => InvoiceItem[];
  getPaidInvoices: () => InvoiceItem[];
  getTotalRevenue: () => number;
}

export const useInvoiceStore = create<InvoiceStore>((set, get) => ({
  invoices: [],
  loading: false,
  error: null,

  setInvoices: (invoices) => set({ invoices }),
  
  addInvoice: (invoice) => 
    set((state) => ({
      invoices: [...state.invoices, invoice],
    })),
  
  updateInvoice: (id, updates) =>
    set((state) => ({
      invoices: state.invoices.map((inv) =>
        inv.id === id ? { ...inv, ...updates } : inv
      ),
    })),
  
  deleteInvoice: (id) =>
    set((state) => ({
      invoices: state.invoices.filter((inv) => inv.id !== id),
    })),
  
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  getInvoiceById: (id) => get().invoices.find((inv) => inv.id === id),
  
  getPendingInvoices: () => 
    get().invoices.filter((inv) => inv.status === 'pending' || inv.status === 'overdue'),
  
  getPaidInvoices: () =>
    get().invoices.filter((inv) => inv.status === 'paid'),
  
  getTotalRevenue: () =>
    get().invoices.reduce((sum, inv) => sum + parseFloat(inv.grandTotal), 0),
}));
