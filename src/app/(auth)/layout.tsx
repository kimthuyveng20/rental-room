import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <div className="flex-1 flex flex-col">
        <div className="pt-8 px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">RF</span>
            </div>
            <h1 className="text-2xl font-bold text-foreground">RoomFlow</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Professional Property Management System
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          {children}
        </div>
      </div>

      {/* Footer */}
      <div className="py-6 px-4 text-center border-t">
        <p className="text-xs text-muted-foreground">
          © 2024 RoomFlow. All rights reserved.
        </p>
      </div>
    </div>
  );
}
