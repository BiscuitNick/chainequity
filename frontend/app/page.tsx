'use client';

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { useAccount } from 'wagmi';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';

export default function Home() {
  const { name, symbol, formattedTotalSupply, splitMultiplier, owner } = useTokenInfo();
  const { address, isConnected } = useAccount();

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome to ChainEquity</h2>
          <p className="text-muted-foreground">
            Token management dashboard for tokenized securities on Polygon Amoy testnet
          </p>
        </div>

        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-border rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
            <p className="text-muted-foreground mb-6">
              Please connect your wallet to access the dashboard
            </p>
          </div>
        ) : (
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
                <p className="text-2xl font-bold">{(Number(splitMultiplier) / 10000).toFixed(1)}x</p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <CardDescription>Contract Owner</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-mono break-all">{owner}</p>
              </CardContent>
            </Card>
            {address && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardHeader className="pb-3">
                  <CardDescription>Your Address</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm font-mono break-all">{address}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
