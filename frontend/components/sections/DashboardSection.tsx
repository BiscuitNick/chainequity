'use client';

import { useState } from 'react';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';

export function DashboardSection() {
  const { name, symbol, formattedTotalSupply, splitMultiplier, owner } = useTokenInfo();
  const { address, isConnected } = useAccount();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const copyAddress = (addr: string) => {
    navigator.clipboard.writeText(addr);
    setCopiedAddress(addr);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border rounded-lg">
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground mb-6">
          Please connect your wallet to access the dashboard
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Token Name</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{name}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Symbol</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{symbol}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Total Supply</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{formattedTotalSupply}</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Split Multiplier</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold">{(Number(splitMultiplier) / 10000).toFixed(4).replace(/\.?0+$/, '')}x</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-3">
          <CardDescription>Contract Owner</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <p className="text-lg font-mono font-semibold">{owner ? formatAddress(owner) : '...'}</p>
            {owner && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => copyAddress(owner)}
                title="Copy address"
              >
                {copiedAddress === owner ? (
                  <span className="text-green-500 text-xs">✓</span>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {address && (
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Your Address</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-lg font-mono font-semibold">{formatAddress(address)}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => copyAddress(address)}
                title="Copy address"
              >
                {copiedAddress === address ? (
                  <span className="text-green-500 text-xs">✓</span>
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
