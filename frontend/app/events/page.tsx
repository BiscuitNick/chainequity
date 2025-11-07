'use client';

/**
 * Events Page
 *
 * View all blockchain events related to the token
 */

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SimplePagination } from '@/components/ui/pagination';
import { Filter, ChevronDown, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatUnits } from 'viem';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface Event {
  id: number;
  block_number: number;
  transaction_hash: string;
  event_type: 'Transfer' | 'Mint' | 'WalletApproved' | 'WalletRevoked' | 'StockSplit' | 'SymbolChanged' | 'NameChanged' | 'TransferBlocked';
  from_address: string | null;
  to_address: string | null;
  amount: string | null;
  data: string | null;
  gas_used: string | null;
  gas_price: string | null;
  timestamp: number;
}

export default function EventsPage() {
  const { isConnected } = useAccount();
  const { symbol, decimals, splitMultiplier } = useTokenInfo();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventType, setEventType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [expandedEventId, setExpandedEventId] = useState<number | null>(null);

  // Fetch events
  useEffect(() => {
    if (!isConnected) return;

    const fetchEvents = async () => {
      try {
        setLoading(true);
        const offset = (page - 1) * limit;

        // Build query params
        let typeParam = '';
        if (eventType !== 'all') {
          typeParam = `&eventType=${eventType}`;
        }

        const response = await fetch(`${API_URL}/api/events?limit=${limit}&offset=${offset}${typeParam}`);
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();

        // Backend now properly classifies Mint events, so we can use them directly
        setEvents(data.events || []);
        setError('');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch events');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [isConnected, page, limit, eventType]);

  // Determine actual event type (distinguish Mint from Transfer)
  const getActualEventType = (event: Event): Event['event_type'] => {
    if (event.event_type === 'Transfer' && event.from_address === '0x0000000000000000000000000000000000000000') {
      return 'Mint';
    }
    return event.event_type;
  };

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Format amount (apply split multiplier to raw amount)
  const formatAmount = (amount: string | null) => {
    if (!amount) return 'N/A';
    try {
      // The amount from the API is RAW (without split multiplier)
      // Apply the split multiplier for display
      const rawValue = parseFloat(formatUnits(BigInt(amount), decimals));
      const multiplier = Number(splitMultiplier) / 10000; // Convert from basis points (10000 = 1.0x)
      const adjustedValue = rawValue * multiplier;
      return adjustedValue.toFixed(2);
    } catch {
      return 'N/A';
    }
  };

  // Format gas
  const formatGas = (gasUsed: string | null) => {
    if (!gasUsed) return 'N/A';
    try {
      const gas = parseInt(gasUsed);
      return gas.toLocaleString();
    } catch {
      return 'N/A';
    }
  };

  // Format event type
  const formatEventType = (type: string) => {
    switch (type) {
      case 'Mint':
        return 'Mint';
      case 'WalletApproved':
        return 'Wallet Approved';
      case 'WalletRevoked':
        return 'Wallet Revoked';
      case 'StockSplit':
        return 'Stock Split';
      case 'SymbolChanged':
        return 'Symbol Changed';
      case 'NameChanged':
        return 'Name Changed';
      case 'TransferBlocked':
        return 'Transfer Blocked';
      default:
        return type;
    }
  };

  // Get event icon/color
  const getEventBadge = (type: string) => {
    switch (type) {
      case 'Mint':
        return 'bg-emerald-500/10 text-emerald-500';
      case 'Transfer':
        return 'bg-blue-500/10 text-blue-500';
      case 'WalletApproved':
        return 'bg-green-500/10 text-green-500';
      case 'WalletRevoked':
        return 'bg-red-500/10 text-red-500';
      case 'StockSplit':
        return 'bg-purple-500/10 text-purple-500';
      case 'SymbolChanged':
      case 'NameChanged':
        return 'bg-orange-500/10 text-orange-500';
      case 'TransferBlocked':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-gray-500/10 text-gray-500';
    }
  };

  // Format event details
  const formatEventDetails = (event: Event) => {
    const actualType = getActualEventType(event);
    switch (actualType) {
      case 'Mint':
        const mintTo = event.to_address || '0x0000...0000';
        return `Minted ${formatAmount(event.amount)} ${symbol} to ${mintTo.slice(0, 6)}...${mintTo.slice(-4)}`;
      case 'Transfer':
        const from = event.from_address || '0x0000...0000';
        const to = event.to_address || '0x0000...0000';
        return `${from.slice(0, 6)}...${from.slice(-4)} → ${to.slice(0, 6)}...${to.slice(-4)} (${formatAmount(event.amount)} ${symbol})`;
      case 'WalletApproved':
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          const wallet = data.wallet || event.to_address;
          if (!wallet) return 'Wallet approved';
          return `Wallet ${wallet.slice(0, 6)}...${wallet.slice(-4)} approved`;
        } catch {
          const wallet = event.to_address;
          if (!wallet) return 'Wallet approved';
          return `Wallet ${wallet.slice(0, 6)}...${wallet.slice(-4)} approved`;
        }
      case 'WalletRevoked':
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          const wallet = data.wallet || event.to_address;
          if (!wallet) return 'Wallet revoked';
          return `Wallet ${wallet.slice(0, 6)}...${wallet.slice(-4)} revoked`;
        } catch {
          const wallet = event.to_address;
          if (!wallet) return 'Wallet revoked';
          return `Wallet ${wallet.slice(0, 6)}...${wallet.slice(-4)} revoked`;
        }
      case 'StockSplit':
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          const multiplier = parseInt(data.multiplier || '0');
          if (multiplier) {
            // Divide by 10000 base to get the actual split ratio
            const ratio = multiplier / 10000;
            return `${ratio}:1 Stock Split`;
          }
          return 'Stock Split';
        } catch {
          return 'Stock Split';
        }
      case 'SymbolChanged':
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          const oldSymbol = data.oldSymbol || '?';
          const newSymbol = data.newSymbol || '?';
          return `Symbol changed from ${oldSymbol} to ${newSymbol}`;
        } catch {
          return 'Symbol changed';
        }
      case 'NameChanged':
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          const oldName = data.oldName || '?';
          const newName = data.newName || '?';
          return `Name changed from "${oldName}" to "${newName}"`;
        } catch {
          return 'Name changed';
        }
      case 'TransferBlocked':
        const blockedFrom = event.from_address || '0x0000...0000';
        const blockedTo = event.to_address || '0x0000...0000';
        return `Transfer blocked: ${blockedFrom.slice(0, 6)}...${blockedFrom.slice(-4)} → ${blockedTo.slice(0, 6)}...${blockedTo.slice(-4)}`;
      default:
        return 'N/A';
    }
  };

  // Handle row expansion
  const toggleRowExpansion = (eventId: number) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  // Handle page navigation
  const handleNextPage = () => {
    setPage(page + 1);
  };

  const handlePreviousPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground">
          Please connect your wallet to view events
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter by type:</span>
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="Mint">Mints</SelectItem>
              <SelectItem value="Transfer">Transfers</SelectItem>
              <SelectItem value="WalletApproved">Wallet Approvals</SelectItem>
              <SelectItem value="WalletRevoked">Wallet Revocations</SelectItem>
              <SelectItem value="StockSplit">Stock Splits</SelectItem>
              <SelectItem value="SymbolChanged">Symbol Changes</SelectItem>
              <SelectItem value="NameChanged">Name Changes</SelectItem>
              <SelectItem value="TransferBlocked">Blocked Transfers</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Event History</CardTitle>
          <CardDescription>
            Recent blockchain events (showing last {limit} events). Click on any row to view raw JSON data.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Loading events...</p>
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">No events found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Block
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Event Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Gas
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {events.map((event) => {
                      const actualType = getActualEventType(event);
                      const isExpanded = expandedEventId === event.id;
                      return (
                        <React.Fragment key={event.id}>
                          <tr
                            className="hover:bg-muted/50 cursor-pointer"
                            onClick={() => toggleRowExpansion(event.id)}
                          >
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              <div className="flex items-center gap-2">
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                {event.block_number}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {formatTimestamp(event.timestamp)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventBadge(actualType)}`}>
                                {formatEventType(actualType)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm max-w-md truncate">
                              {formatEventDetails(event)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                              {formatGas(event.gas_used)}
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-muted/30">
                              <td colSpan={5} className="px-6 py-4">
                                <div className="space-y-2">
                                  <h4 className="text-sm font-semibold">Raw Event Data</h4>
                                  <pre className="bg-background p-4 rounded-md overflow-x-auto text-xs">
                                    {JSON.stringify(event, null, 2)}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 border-t border-border">
                <SimplePagination
                  currentPage={page}
                  onNext={handleNextPage}
                  onPrevious={handlePreviousPage}
                  hasPrevious={page > 1}
                  hasNext={events.length === limit}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Alert className="mt-6">
        <AlertDescription>
          <h4 className="font-semibold mb-2">About Blockchain Events</h4>
          <ul className="text-sm space-y-1">
            <li>• All events are recorded on the blockchain and cannot be modified</li>
            <li>• Events include transfers, mints, corporate actions, and wallet management</li>
            <li>• Use the filter to view specific event types</li>
            <li>• Events are displayed in reverse chronological order (newest first)</li>
          </ul>
        </AlertDescription>
      </Alert>
    </div>
  );
}
