'use client';

/**
 * Cap Table Page
 *
 * View token holder distribution and ownership percentages
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, ChevronDown, ChevronRight, ChevronLeft, Copy, History, X } from 'lucide-react';
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
  balanceChangeRaw: string;
  newBalance: string;
  newBalanceRaw?: string;
  direction: 'in' | 'out' | 'neutral';
  transactionType: 'Mint' | 'Transfer Received' | 'Transfer Sent' | 'Self Transfer';
  eventType: string;
  transactionHash: string;
  gasUsed?: string;
  gasPrice?: string;
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

  // Block selector state
  const [blockNumber, setBlockNumber] = useState<string>('');
  const [blockInput, setBlockInput] = useState<string>('');
  const [isHistorical, setIsHistorical] = useState(false);
  const [latestBlock, setLatestBlock] = useState<number | null>(null);


  // Fetch cap table data
  useEffect(() => {
    if (!isConnected) return;

    const fetchCapTable = async () => {
      try {
        setLoading(true);

        // Build URL with optional block parameter
        const url = blockNumber
          ? `${API_URL}/api/captable?block=${blockNumber}`
          : `${API_URL}/api/captable`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error('Failed to fetch cap table');
        }
        const data = await response.json();

        setCapTable(data.holders || []);
        setTotalHolders(data.holderCount || 0);
        setIsHistorical(data.isHistorical || false);

        // Store latest block when viewing current state
        if (!blockNumber && data.blockNumber) {
          setLatestBlock(data.blockNumber);
          setBlockInput(String(data.blockNumber));
        }

        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch cap table');
      } finally {
        setLoading(false);
      }
    };

    fetchCapTable();
  }, [isConnected, blockNumber]);

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

      // Debug: Log the balance history to see what we're getting
      console.log('Balance History for', address, data.balanceHistory);

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

  // Handle block number submission
  const handleViewSnapshot = () => {
    const block = blockInput.trim();
    const blockNum = Number(block);

    if (!block || isNaN(blockNum) || blockNum < 1) {
      setError('Please enter a valid block number (minimum 1)');
      return;
    }

    if (latestBlock && blockNum > latestBlock) {
      setError(`Block number cannot exceed the latest block (${latestBlock})`);
      return;
    }

    setBlockNumber(block);
    setError('');
  };

  // Handle viewing current state
  const handleViewCurrent = () => {
    setBlockNumber('');
    // Keep the input showing the latest block when viewing current state
    if (latestBlock) {
      setBlockInput(String(latestBlock));
    }
    setIsHistorical(false);
  };

  // Handle previous block
  const handlePreviousBlock = () => {
    // If viewing current state, go to latest block - 1
    if (!blockNumber && latestBlock && latestBlock > 1) {
      const newBlock = String(latestBlock - 1);
      setBlockNumber(newBlock);
      setBlockInput(newBlock);
      return;
    }

    // Otherwise navigate to previous block
    const currentBlock = Number(blockNumber);
    if (currentBlock > 1) {
      const newBlock = String(currentBlock - 1);
      setBlockNumber(newBlock);
      setBlockInput(newBlock);
    }
  };

  // Handle next block
  const handleNextBlock = () => {
    const currentBlock = Number(blockNumber);
    const newBlock = String(currentBlock + 1);
    setBlockNumber(newBlock);
    setBlockInput(newBlock);
  };

  // Export to CSV
  const handleExportCSV = async () => {
    try {
      const url = blockNumber
        ? `${API_URL}/api/captable/export?format=csv&block=${blockNumber}`
        : `${API_URL}/api/captable/export?format=csv`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to export cap table');
      }
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const filename = blockNumber
        ? `captable-block-${blockNumber}-${Date.now()}.csv`
        : `captable-${Date.now()}.csv`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export cap table');
    }
  };

  // Format balance for display (apply split multiplier to raw balance)
  const formatBalance = (balance: string) => {
    try {
      // The balance from the API is RAW (without split multiplier)
      // Apply the split multiplier for display
      const rawValue = parseFloat(formatUnits(BigInt(balance), decimals));
      const multiplier = Number(splitMultiplier) / 10000; // Convert from basis points (10000 = 1.0x)
      const adjustedValue = rawValue * multiplier;
      return adjustedValue.toFixed(2);
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
      <div className="flex flex-col items-center justify-center py-16">
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground">
          Please connect your wallet to view the cap table
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex justify-end">
        <Button onClick={handleExportCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
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
                                        <th className="px-4 py-2 text-left">New Balance</th>
                                        <th className="px-4 py-2 text-left">Gas</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                      {holderDetails.get(holder.address)?.balanceHistory.map((history, idx, array) => {
                                        const isPositive = history.direction === 'in';
                                        const isNegative = history.direction === 'out';
                                        const changeColor = isPositive
                                          ? 'text-green-600 dark:text-green-400'
                                          : isNegative
                                          ? 'text-red-600 dark:text-red-400'
                                          : 'text-muted-foreground';
                                        const prefix = isPositive ? '+' : isNegative ? '-' : '';

                                        // Safe gas cost calculation
                                        let gasCost: string | null = null;
                                        try {
                                          if (history.gasUsed && history.gasPrice) {
                                            const cost = (BigInt(history.gasUsed) * BigInt(history.gasPrice)) / BigInt('1000000000000000000');
                                            gasCost = cost.toString();
                                          }
                                        } catch (e) {
                                          gasCost = null;
                                        }

                                        // Apply split multiplier to balance change
                                        // Transfer events store raw amounts, so we need to apply the multiplier
                                        const multiplier = Number(splitMultiplier) / 10000; // Convert from basis points (10000 = 1.0x)
                                        const rawBalanceChange = parseFloat(history.balanceChange) || 0;
                                        const adjustedBalanceChange = Math.abs(rawBalanceChange * multiplier);
                                        const balanceChange = adjustedBalanceChange.toFixed(2);

                                        // Calculate cumulative balance
                                        // Sum up all balance changes from the beginning up to and including this transaction
                                        let cumulativeBalance = 0;
                                        for (let i = 0; i <= idx; i++) {
                                          const change = parseFloat(array[i].balanceChange) || 0;
                                          cumulativeBalance += change;
                                        }
                                        const newBalance = (cumulativeBalance * multiplier).toFixed(2);

                                        return (
                                          <tr key={idx}>
                                            <td className="px-4 py-2">{history.blockNumber}</td>
                                            <td className="px-4 py-2">{formatTimestamp(history.timestamp || 0)}</td>
                                            <td className="px-4 py-2">
                                              <span className="text-xs font-medium">{history.eventType || history.transactionType}</span>
                                            </td>
                                            <td className={`px-4 py-2 font-mono font-semibold ${changeColor}`}>
                                              {prefix}{balanceChange}
                                            </td>
                                            <td className="px-4 py-2 font-mono">
                                              {newBalance}
                                            </td>
                                            <td className="px-4 py-2 text-xs text-muted-foreground">
                                              {history.gasUsed ? (
                                                <span title={`Gas Price: ${history.gasPrice ? (Number(history.gasPrice) / 1e9).toFixed(2) : 'N/A'} Gwei`}>
                                                  {Number(history.gasUsed).toLocaleString()} gas
                                                  {gasCost && parseFloat(gasCost) > 0 && (
                                                    <span className="block">(~{parseFloat(gasCost).toFixed(8)} MATIC)</span>
                                                  )}
                                                </span>
                                              ) : (
                                                'N/A'
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
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
              {isHistorical && blockNumber && (
                <div className="px-6 py-2 bg-blue-50 dark:bg-blue-950/30 border-t border-blue-200 dark:border-blue-900">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Historical snapshot at block {blockNumber}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical Block Widget */}
      <Card className="mt-6">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Left: Description */}
            <div className="md:justify-self-start">
              <p className="text-sm font-medium mb-1">
                Historical Snapshot {latestBlock ? `(${latestBlock} blocks)` : ''}
              </p>
              <p className="text-xs text-muted-foreground">
                {isHistorical && blockNumber && latestBlock
                  ? `Viewing cap table state at block ${blockNumber} of ${latestBlock}`
                  : latestBlock
                  ? `Navigate to any block to view historical state (Latest: ${latestBlock})`
                  : 'Navigate to any block to view historical state'
                }
              </p>
            </div>

            {/* Center: Controls */}
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePreviousBlock}
                disabled={
                  loading ||
                  (blockNumber ? Number(blockNumber) <= 1 : !latestBlock || latestBlock <= 1)
                }
                className="h-9 w-9 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-col items-center gap-1">
                <Input
                  type="number"
                  placeholder="Block #"
                  value={blockInput}
                  min={1}
                  max={latestBlock || undefined}
                  onChange={(e) => setBlockInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleViewSnapshot();
                    }
                  }}
                  className="w-28 h-9 text-center"
                  disabled={loading}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewSnapshot}
                  disabled={!blockInput || loading}
                  className="h-7 w-28 text-xs"
                >
                  Go
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextBlock}
                disabled={
                  !blockNumber || // Disabled when viewing current state (not historical)
                  loading ||
                  (latestBlock !== null && Number(blockNumber) >= latestBlock) // Disabled when at or beyond latest block
                }
                className="h-9 w-9 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Right: Action Button (or empty space to maintain grid) */}
            <div className="md:justify-self-end">
              {isHistorical && latestBlock && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewCurrent}
                  disabled={loading}
                  className="h-9 px-4"
                >
                  Latest Block ({latestBlock})
                </Button>
              )}
            </div>
          </div>
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
  );
}
