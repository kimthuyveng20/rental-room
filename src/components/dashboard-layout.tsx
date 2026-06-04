'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Building,
  DoorOpen,
  Users,
  FileText,
  Wrench,
  DollarSign,
  Menu,
  X,
  LogOut,
  Receipt,
} from 'lucide-react';
import { Button } from '@/src/components/ui/button';
import { useTranslations, useLocale } from 'next-intl'; // Import useLocale
import { LanguageSwitcher } from './language-switcher';

interface DashboardLayoutProps {
  children: React.ReactNode;
  userRole?: string;
}

const navigationItems = [
  {
    labelKey: 'dashboard', // Changed to mapping key
    href: '/dashboard',
    icon: Building,
    roles: ['owner', 'admin', 'tenant'],
  },
  {
    labelKey: 'properties',
    href: '/dashboard/properties',
    icon: Building,
    roles: ['owner', 'admin'],
  },
  {
    labelKey: 'rooms',
    href: '/dashboard/rooms',
    icon: DoorOpen,
    roles: ['owner', 'admin'],
  },
  {
    labelKey: 'tenants',
    href: '/dashboard/tenants',
    icon: Users,
    roles: ['owner', 'admin'],
  },
  {
    labelKey: 'leases',
    href: '/dashboard/leases',
    icon: FileText,
    roles: ['owner', 'admin', 'tenant'],
  },
  {
    labelKey: 'payments',
    href: '/dashboard/payments',
    icon: DollarSign,
    roles: ['owner', 'admin', 'tenant'],
  },
  {
    labelKey: 'maintenance',
    href: '/dashboard/maintenance',
    icon: Wrench,
    roles: ['owner', 'admin', 'tenant'],
  },
  {
    labelKey: 'invoices',
    href: '/dashboard/invoices',
    icon: Receipt,
    roles: ['owner', 'admin', 'tenant'],
  },
];

export function DashboardLayout({
  children,
  userRole = 'admin',
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // 1. Hook to get the active locale (e.g., 'en' or 'km')
  const locale = useLocale(); 
  
  // 2. Hook to handle translation namespaces
  const t = useTranslations('Navigation');
  const commonT = useTranslations('Common');

  const filteredNavigation = navigationItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-200 ease-in-out transform md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b space-y-4 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-primary">RoomFlow</h1>
              <p className="text-sm text-muted-foreground">
                {commonT('propertyManagement')}
              </p>
            </div>
            
            {/* Language Switcher placement inside the sidebar header */}
            <div className="mb-5">
              <LanguageSwitcher currentLocale={locale} />
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              {filteredNavigation.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors"
                    >
                      <Icon className="w-5 h-5" />
                      {/* Translate the label dynamically using the translation file keys */}
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => {
                // TODO: Implement logout
              }}
            >
              <LogOut className="w-4 h-4" />
              {commonT('logout')}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card border-b px-6 py-4 flex items-center justify-between md:justify-end">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </Button>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto bg-background">
          <div className="p-6">{children}</div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}