'use client';

import { useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DashboardSection } from '@/components/sections/DashboardSection';
import { ApproveSection } from '@/components/sections/ApproveSection';
import { MintSection } from '@/components/sections/MintSection';
import CapTablePage from './captable/page';
import CorporatePage from './corporate/page';
import EventsPage from './events/page';

function SectionWrapper({
  id,
  title,
  description,
  children
}: {
  id: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 py-12 border-b border-border last:border-b-0">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex justify-center">
          <div className="w-full">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const hasScrolledRef = useRef(false);

  useEffect(() => {
    // Only scroll on initial load or hash change, not on search param change
    if (hasScrolledRef.current) return;

    const hash = window.location.hash;
    if (hash) {
      hasScrolledRef.current = true;
      const sectionId = hash.replace('#', '');
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  // Reset scroll flag when hash changes (but not search params)
  useEffect(() => {
    const handleHashChange = () => {
      hasScrolledRef.current = false;
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-0">
        <SectionWrapper
          id="dashboard"
          title="Welcome to ChainEquity"
          description="Token management dashboard for tokenized securities on Polygon Amoy testnet"
        >
          <DashboardSection />
        </SectionWrapper>

        <SectionWrapper
          id="approve"
          title="Wallet Approval Management"
          description="Approve or revoke wallet addresses for token transfers"
        >
          <ApproveSection />
        </SectionWrapper>

        <SectionWrapper
          id="mint"
          title="Mint Tokens"
          description="Create new tokens and send them to approved addresses"
        >
          <MintSection />
        </SectionWrapper>

        <SectionWrapper
          id="captable"
          title="Capitalization Table"
          description="Token holder distribution and ownership percentages"
        >
          <CapTablePage />
        </SectionWrapper>

        <SectionWrapper
          id="corporate"
          title="Corporate Actions"
          description="Execute stock splits and update token symbol"
        >
          <CorporatePage />
        </SectionWrapper>

        <SectionWrapper
          id="events"
          title="Blockchain Events"
          description="All events related to this token on the blockchain"
        >
          <EventsPage />
        </SectionWrapper>
      </div>
    </DashboardLayout>
  );
}
