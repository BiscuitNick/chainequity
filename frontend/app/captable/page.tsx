'use client';

/**
 * Cap Table Page
 *
 * View token holder distribution and ownership percentages
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAccount } from 'wagmi';
import { useTokenInfo } from '@/hooks/useTokenInfo';

export default function CapTablePage() {
  const { isConnected } = useAccount();
  const { symbol, formattedTotalSupply } = useTokenInfo();

  // TODO: Implement cap table data fetching from backend API or events
  // For now, we'll show a placeholder

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your wallet to view the cap table
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Capitalization Table</h2>
          <p className="text-muted-foreground">
            Token holder distribution and ownership percentages
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="p-4 border border-border rounded-lg bg-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Supply</h3>
            <p className="text-2xl font-bold">{formattedTotalSupply} {symbol}</p>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Holders</h3>
            <p className="text-2xl font-bold">-</p>
          </div>
          <div className="p-4 border border-border rounded-lg bg-card">
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Approved Wallets</h3>
            <p className="text-2xl font-bold">-</p>
          </div>
        </div>

        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/50">
            <h3 className="font-semibold">Token Holders</h3>
          </div>

          <div className="p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-6xl mb-4">📊</div>
              <h4 className="text-lg font-semibold mb-2">Cap Table Coming Soon</h4>
              <p className="text-muted-foreground mb-4">
                The cap table will display real-time token holder information fetched from the blockchain.
              </p>
              <p className="text-sm text-muted-foreground">
                This feature requires the backend indexer service to be running to fetch and aggregate token holder data from Transfer events.
              </p>
            </div>
          </div>

          {/* Placeholder table structure for reference */}
          <div className="hidden">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Ownership %
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {/* Table rows will go here */}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 p-4 border border-border rounded-lg bg-muted/50">
          <h4 className="font-semibold mb-2 text-sm">ℹ️ About Cap Tables</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Shows real-time token distribution across all holders</li>
            <li>• Calculated from on-chain Transfer events</li>
            <li>• Accounts for stock splits via splitMultiplier</li>
            <li>• Export functionality available (CSV/JSON)</li>
          </ul>
        </div>
      </div>
    </DashboardLayout>
  );
}
