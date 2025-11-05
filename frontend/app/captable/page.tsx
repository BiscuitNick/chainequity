'use client';

/**
 * Cap Table Page
 *
 * View token holder distribution and ownership percentages
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { formatUnits } from 'viem';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface CapTableHolder {
  address: string;
  balance: string;
  ownershipPercentage: number;
  isApproved?: boolean;
}

interface BalanceHistory {
  blockNumber: number;
  timestamp: number;
  balanceChange: string;
  eventType: string;
  transactionHash: string;
}

interface HolderDetail {
  address: string;
  balance: string;
  ownershipPercentage: number;
  isApproved: boolean;
  balanceHistory: BalanceHistory[];
}

export default function CapTablePage() {
  const { isConnected } = useAccount();
  const { symbol, decimals, splitMultiplier } = useTokenInfo();
  const [capTable, setCapTable] = useState<CapTableHolder[]>([]);
  const [totalHolders, setTotalHolders] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [holderDetails, setHolderDetails] = useState<Map<string, HolderDetail>>(new Map());
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Fetch cap table data
  useEffect(() => {
    if (!isConnected) return;

    const fetchCapTable = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/api/captable`);
        if (!response.ok) {
          throw new Error('Failed to fetch cap table');
        }
        const data = await response.json();
        setCapTable(data.holders || []);
        setTotalHolders(data.holderCount || 0);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch cap table');
      } finally {
        setLoading(false);
      }
    };

    fetchCapTable();
  }, [isConnected]);

  // Fetch holder details when row is expanded
  const fetchHolderDetails = async (address: string) => {
    if (holderDetails.has(address)) return; // Already fetched

    try {
      const response = await fetch(`${API_URL}/api/captable/holder/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch holder details');
      }
      const result = await response.json();
      const data: HolderDetail = result.data || result;
      setHolderDetails(new Map(holderDetails.set(address, data)));
    } catch (err) {
      console.error('Failed to fetch holder details:', err);
    }
  };

  // Toggle row expansion
  const toggleRow = (address: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(address)) {
      newExpanded.delete(address);
    } else {
      newExpanded.add(address);
      fetchHolderDetails(address);
    }
    setExpandedRows(newExpanded);
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      const response = await fetch(`${API_URL}/api/captable/export?format=csv`);
      if (!response.ok) {
        throw new Error('Failed to export cap table');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `captable-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export cap table');
    }
  };

  // Format balance for display
  const formatBalance = (balance: string) => {
    try {
      return parseFloat(formatUnits(BigInt(balance), decimals)).toFixed(2);
    } catch {
      return '0.00';
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Copy address to clipboard
  const copyAddress = (address: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion when clicking copy button
    navigator.clipboard.writeText(address);
    setCopiedAddress(address);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

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
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">Capitalization Table</h2>
            <p className="text-muted-foreground">
              Token holder distribution and ownership percentages
            </p>
          </div>
          <Button onClick={handleExportCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Holders</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalHolders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Split Multiplier</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{(Number(splitMultiplier) / 10000).toFixed(1)}x</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Token Symbol</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{symbol}</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Token Holders</CardTitle>
            <CardDescription>
              Click on a row to view transaction history
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Loading cap table...</p>
              </div>
            ) : capTable.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No token holders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-12">

                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Balance
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Ownership %
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {capTable.map((holder) => (
                      <React.Fragment key={holder.address}>
                        <tr
                          className="hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleRow(holder.address)}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            {expandedRows.has(holder.address) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">
                                {holder.address.slice(0, 6)}...{holder.address.slice(-4)}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={(e) => copyAddress(holder.address, e)}
                                title="Copy address"
                              >
                                {copiedAddress === holder.address ? (
                                  <span className="text-green-500 text-xs">✓</span>
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {formatBalance(holder.balance)} {symbol}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {holder.ownershipPercentage.toFixed(2)}%
                          </td>
                        </tr>
                        {expandedRows.has(holder.address) && holderDetails.get(holder.address) && (
                          <tr>
                            <td colSpan={4} className="px-6 py-4 bg-muted/20">
                              <div className="space-y-2">
                                <h4 className="font-semibold text-sm">Transaction History</h4>
                                {!holderDetails.get(holder.address)?.balanceHistory || holderDetails.get(holder.address)?.balanceHistory.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No transaction history</p>
                                ) : (
                                  <div className="max-h-60 overflow-y-auto">
                                    <table className="w-full text-sm">
                                      <thead className="bg-muted/50 sticky top-0">
                                        <tr>
                                          <th className="px-4 py-2 text-left">Block</th>
                                          <th className="px-4 py-2 text-left">Time</th>
                                          <th className="px-4 py-2 text-left">Event Type</th>
                                          <th className="px-4 py-2 text-left">Balance Change</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-border">
                                        {holderDetails.get(holder.address)?.balanceHistory.map((history, idx) => (
                                          <tr key={idx}>
                                            <td className="px-4 py-2">{history.blockNumber}</td>
                                            <td className="px-4 py-2">{formatTimestamp(history.timestamp)}</td>
                                            <td className="px-4 py-2">{history.eventType}</td>
                                            <td className="px-4 py-2">{history.balanceChange} {symbol}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Alert className="mt-6">
          <AlertDescription>
            <h4 className="font-semibold mb-2">About Cap Tables</h4>
            <ul className="text-sm space-y-1">
              <li>• Shows real-time token distribution across all holders</li>
              <li>• Calculated from on-chain Transfer events</li>
              <li>• Accounts for stock splits via splitMultiplier</li>
              <li>• Click on any row to view transaction history</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}
