'use client';

import { ReactNode, useState, useEffect } from 'react';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  // Initialize to empty string to ensure Server and Client match on first load
  const [currentYear, setCurrentYear] = useState<string | number>('');

  useEffect(() => {
    // This runs strictly on the client after mounting, updating the date safely
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <div className="relative  bg-background flex flex-col justify-between overflow-hidden">
      {/* Subtle Background Decorative Gradients & Grid */}
      <div 
        className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" 
        aria-hidden="true"
      />
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primary/5 blur-[80px] rounded-full pointer-events-none" 
        aria-hidden="true"
      />

      {/* Header Section */}
      <header className="pt-12 pb-4 px-4 text-center z-10 animate-in fade-in slide-in-from-top-4 duration-500">
        <div className="flex flex-col items-center justify-center gap-3 mb-2">
          {/* Logo Wrapper Container */}
          <div className="relative drop-shadow-sm transition-transform hover:scale-105 duration-300">
            <Image
              src="/rental-logo.svg"
              alt="Rental Room Logo"
              width={64}
              height={64}
              priority
              className="object-contain"
            />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground bg-clip-text">
            Rental Room
          </h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-xs mx-auto font-medium">
          Professional Property Management System
        </p>
      </header>

      {/* Main Form Content */}
      <main className="flex-1 flex items-center justify-center p-4 z-10 animate-in fade-in zoom-in-95 duration-500">
        <div className="w-full max-w-md transition-all duration-300">
          {children}
        </div>
      </main>

      {/* Footer Section */}
      <footer className="py-6 px-4 text-center border-t bg-muted/20 backdrop-blur-sm z-10">
        <p className="text-xs text-muted-foreground/80 tracking-wide font-medium">
          &copy; {currentYear} Rental Room. All rights reserved.
        </p>
      </footer>
    </div>
  );
}