'use client';

/**
 * Navigation Component
 *
 * Sidebar navigation for the dashboard
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/approve', label: 'Wallet Approval', icon: '✅' },
  { href: '/mint', label: 'Mint Tokens', icon: '🪙' },
  { href: '/captable', label: 'Cap Table', icon: '📈' },
  { href: '/corporate', label: 'Corporate Actions', icon: '⚙️' },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-64 min-h-screen border-r border-border bg-card p-4">
      <div className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
