'use client';

/**
 * Events Page
 *
 * View all blockchain events related to the token
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SimplePagination } from '@/components/ui/pagination';
import { Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { formatUnits } from 'viem';

interface Event {
  id: number;
  block_number: number;
  transaction_hash: string;
  event_type: 'Transfer' | 'WalletApproved' | 'WalletRevoked' | 'StockSplit' | 'SymbolChanged' | 'NameChanged' | 'TransferBlocked';
  from_address: string | null;
  to_address: string | null;
  amount: string | null;
  data: string | null;
  timestamp: number;
}

export default function EventsPage() {
  const { isConnected } = useAccount();
  const { symbol, decimals } = useTokenInfo();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventType, setEventType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  // Fetch events
  useEffect(() => {
    if (!isConnected) return;

    const fetchEvents = async () => {
      try {
        setLoading(true);
        const offset = (page - 1) * limit;
        const typeParam = eventType !== 'all' ? `&eventType=${eventType}` : '';
        const response = await fetch(`http://localhost:3000/api/events?limit=${limit}&offset=${offset}${typeParam}`);
        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }
        const data = await response.json();
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

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Format amount
  const formatAmount = (amount: string | null) => {
    if (!amount) return 'N/A';
    try {
      return parseFloat(formatUnits(BigInt(amount), decimals)).toFixed(2);
    } catch {
      return 'N/A';
    }
  };

  // Format event type
  const formatEventType = (type: string) => {
    switch (type) {
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
    switch (event.event_type) {
      case 'Transfer':
        const from = event.from_address || '0x0000...0000';
        const to = event.to_address || '0x0000...0000';
        return `${from.slice(0, 6)}...${from.slice(-4)} → ${to.slice(0, 6)}...${to.slice(-4)} (${formatAmount(event.amount)} ${symbol})`;
      case 'WalletApproved':
        return `Wallet ${event.to_address?.slice(0, 6)}...${event.to_address?.slice(-4)} approved`;
      case 'WalletRevoked':
        return `Wallet ${event.to_address?.slice(0, 6)}...${event.to_address?.slice(-4)} revoked`;
      case 'StockSplit':
      case 'SymbolChanged':
      case 'NameChanged':
        try {
          const data = event.data ? JSON.parse(event.data) : {};
          return JSON.stringify(data);
        } catch {
          return event.data || 'N/A';
        }
      case 'TransferBlocked':
        return `Transfer blocked: ${event.from_address?.slice(0, 6)}...${event.from_address?.slice(-4)} → ${event.to_address?.slice(0, 6)}...${event.to_address?.slice(-4)}`;
      default:
        return 'N/A';
    }
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
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your wallet to view events
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Blockchain Events</h2>
          <p className="text-muted-foreground">
            All events related to this token on the blockchain
          </p>
        </div>

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
              Recent blockchain events (showing last {limit} events)
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
                          Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Event Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Details
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Block
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {events.map((event) => (
                        <tr key={event.id} className="hover:bg-muted/50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {formatTimestamp(event.timestamp)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventBadge(event.event_type)}`}>
                              {formatEventType(event.event_type)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-mono max-w-md truncate">
                            {formatEventDetails(event)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                            {event.block_number}
                          </td>
                        </tr>
                      ))}
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
    </DashboardLayout>
  );
}
