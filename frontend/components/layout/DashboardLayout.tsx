'use client';

/**
 * Dashboard Layout Component
 *
 * Main layout for dashboard pages with header
 */

import { Header } from './Header';
import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        {children}
      </main>
    </div>
  );
}
