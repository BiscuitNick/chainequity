'use client';

/**
 * Header Component
 *
 * Main navigation header with branding, hamburger menu, and wallet connection
 */

import { WalletConnect } from '@/components/wallet/WalletConnect';
import { HamburgerMenu } from './HamburgerMenu';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          <HamburgerMenu />
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">ChainEquity</h1>
            <span className="text-sm text-muted-foreground">Dashboard</span>
          </div>
        </div>
        <WalletConnect />
      </div>
    </header>
  );
}
