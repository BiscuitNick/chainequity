'use client';

import { useState, useEffect } from 'react';
import { Copy, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface ApprovedWallet {
  address: string;
  timestamp?: string;
  blockNumber?: number;
}

export function ApprovedWalletsTable() {
  const [wallets, setWallets] = useState<ApprovedWallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchApprovedWallets = async () => {
    setIsRefreshing(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/issuer/approved`);
      const data = await response.json();

      if (data.success && data.data) {
        // Transform wallet addresses into objects if they're strings
        const walletList = data.data.wallets.map((wallet: string | ApprovedWallet) => {
          if (typeof wallet === 'string') {
            return { address: wallet };
          }
          return wallet;
        });
        setWallets(walletList);
      } else {
        throw new Error('Failed to fetch approved wallets');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch approved wallets');
      toast.error('Failed to fetch approved wallets', {
        description: err.message || 'Unable to load wallet list',
      });
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchApprovedWallets();
  }, []);

  const handleCopyAddress = async (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      toast.success('Address copied to clipboard');

      // Reset copied status after 2 seconds
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      toast.error('Failed to copy address');
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Approved Wallets
            </CardTitle>
            <CardDescription>
              Wallets authorized to receive tokens
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApprovedWallets}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Loading approved wallets...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="flex items-center justify-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </div>
        ) : wallets.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No approved wallets found</p>
          </div>
        ) : (
          <div className={`overflow-x-auto transition-opacity duration-200 ${isRefreshing ? 'opacity-50' : 'opacity-100'}`}>
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">
                    #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Wallet Address
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {wallets.map((wallet, index) => (
                  <tr key={wallet.address} className="hover:bg-muted/50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm">
                          <span className="hidden sm:inline">{wallet.address}</span>
                          <span className="sm:hidden">{formatAddress(wallet.address)}</span>
                        </span>
                        {index === 0 && (
                          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                            Latest
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2"
                        onClick={(e) => handleCopyAddress(wallet.address, e)}
                        title="Copy address"
                      >
                        {copiedAddress === wallet.address ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />
                            <span className="text-green-500">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-1" />
                            Copy
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}