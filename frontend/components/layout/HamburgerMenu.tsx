'use client';

/**
 * Hamburger Menu Component
 *
 * Popover navigation menu with hash-based links
 */

import { useState } from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const navItems = [
  { href: '#dashboard', label: 'Dashboard', icon: '📊' },
  { href: '#approve', label: 'Wallet Approval', icon: '✅' },
  { href: '#mint', label: 'Mint Tokens', icon: '🪙' },
  { href: '#captable', label: 'Cap Table', icon: '📈' },
  { href: '#corporate', label: 'Corporate Actions', icon: '⚙️' },
  { href: '#events', label: 'Events', icon: '⛓️' },
];

export function HamburgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

  const handleLinkClick = (href: string) => {
    // Close menu
    setIsOpen(false);

    // Update hash without reload
    window.location.hash = href;

    // Smooth scroll to section
    const sectionId = href.replace('#', '');
    setTimeout(() => {
      const element = document.getElementById(sectionId);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <nav>
          <div className="space-y-1">
            {navItems.map((item) => (
              <button
                key={item.href}
                onClick={() => handleLinkClick(item.href)}
                className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors hover:bg-accent text-foreground w-full text-left"
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      </PopoverContent>
    </Popover>
  );
}
