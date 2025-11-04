'use client';

/**
 * Dashboard Layout Component
 *
 * Main layout for dashboard pages with header and navigation
 */

import { Header } from './Header';
import { Navigation } from './Navigation';
import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
