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
import { signOut } from 'next-auth/react';
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
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

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
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  // 1. Hook to get the active locale (e.g., 'en' or 'km')
  const locale = useLocale(); 
  
  // 2. Hook to handle translation namespaces
  const t = useTranslations('Navigation');
  const commonT = useTranslations('Common');

  const filteredNavigation = navigationItems.filter((item) =>
    item.roles.includes(userRole)
  );

  const handleLogout = async () => {
  try {
    setLoggingOut(true);

    await signOut({
      callbackUrl: '/',
    });
  } catch (error) {
    console.error('Logout failed:', error);
  } finally {
    setLoggingOut(false);
  }
};
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-200 ease-in-out transform md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex justify-end">
              <LanguageSwitcher currentLocale={locale} />
            </div>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="border-b space-y-4 flex items-center justify-center">
              <div className="flex items-center">
                <Image
                  src="/rental-logo.svg"
                  alt="Rental Room Logo"
                  width={70}
                  height={70}
                  priority
                />
              </div>

            {/* Language Switcher placement inside the sidebar header */}
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
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="w-4 h-4" />
            {commonT('logout')}
          </Button>
            </div>
        </div>
      </aside>
      <AlertDialog
  open={logoutOpen}
  onOpenChange={(val) => !loggingOut && setLogoutOpen(val)}
>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>
        {commonT('logout')}
      </AlertDialogTitle>

      <AlertDialogDescription>
        Are you sure you want to logout from your account?
      </AlertDialogDescription>
    </AlertDialogHeader>

    <AlertDialogFooter>
      <AlertDialogCancel disabled={loggingOut}>
        Cancel
      </AlertDialogCancel>

      <AlertDialogAction
        disabled={loggingOut}
        onClick={(e) => {
          e.preventDefault();
          handleLogout();
        }}
      >
        {loggingOut && (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        )}

        {commonT('logout')}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-card px-6 py-4 flex items-center justify-between md:justify-end">
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