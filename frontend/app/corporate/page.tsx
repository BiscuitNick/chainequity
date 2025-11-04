'use client';

/**
 * Corporate Actions Page
 *
 * Execute stock splits and symbol changes
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useContract } from '@/hooks/useContract';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function CorporatePage() {
  const { isConnected } = useAccount();
  const { address: contractAddress, abi } = useContract();
  const { symbol, splitMultiplier, owner } = useTokenInfo();
  const [splitRatio, setSplitRatio] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [error, setError] = useState('');
  const [activeAction, setActiveAction] = useState<'split' | 'symbol' | null>(null);

  // Write contract hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Handle stock split
  const handleSplit = async () => {
    setError('');
    setActiveAction('split');

    const ratio = parseInt(splitRatio);
    if (isNaN(ratio) || ratio <= 1) {
      setError('Split ratio must be greater than 1');
      return;
    }

    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'executeSplit',
        args: [BigInt(ratio)],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to execute split');
    }
  };

  // Handle symbol change
  const handleSymbolChange = async () => {
    setError('');
    setActiveAction('symbol');

    if (!newSymbol || newSymbol.length < 2 || newSymbol.length > 10) {
      setError('Symbol must be between 2 and 10 characters');
      return;
    }

    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'updateSymbol',
        args: [newSymbol.toUpperCase()],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update symbol');
    }
  };

  // Clear form on success
  if (isSuccess) {
    setTimeout(() => {
      setSplitRatio('');
      setNewSymbol('');
      setActiveAction(null);
    }, 3000);
  }

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your wallet to manage corporate actions
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Corporate Actions</h2>
          <p className="text-muted-foreground">
            Execute stock splits and update token symbol
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Stock Split Card */}
          <Card>
            <CardHeader>
              <CardTitle>📊 Stock Split</CardTitle>
              <CardDescription>Execute a virtual stock split</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="splitRatio">Split Ratio (e.g., 7 for 7-for-1 split)</Label>
                <Input
                  id="splitRatio"
                  type="number"
                  value={splitRatio}
                  onChange={(e) => setSplitRatio(e.target.value)}
                  placeholder="7"
                  min="2"
                />
                <p className="text-sm text-muted-foreground">
                  Current Multiplier: {splitMultiplier.toString()}x
                </p>
                {splitRatio && parseInt(splitRatio) > 1 && (
                  <p className="text-sm">
                    After split: {(splitMultiplier * BigInt(splitRatio)).toString()}x total multiplier
                  </p>
                )}
              </div>

              <Button
                onClick={handleSplit}
                disabled={
                  !splitRatio ||
                  parseInt(splitRatio) <= 1 ||
                  isPending ||
                  isConfirming
                }
                className="w-full"
              >
                {isPending && activeAction === 'split' || isConfirming && activeAction === 'split'
                  ? 'Executing...'
                  : `Execute ${splitRatio || 'N'}-for-1 Split`}
              </Button>

              <Alert>
                <AlertDescription className="text-xs">
                  A 7-for-1 split means each token holder will see their balance multiplied by 7,
                  while maintaining their proportional ownership.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Symbol Change Card */}
          <Card>
            <CardHeader>
              <CardTitle>✏️ Update Symbol</CardTitle>
              <CardDescription>Change the token symbol</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newSymbol">New Token Symbol</Label>
                <Input
                  id="newSymbol"
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                  placeholder="CEQX"
                  maxLength={10}
                  className="uppercase"
                />
                <p className="text-sm text-muted-foreground">
                  Current Symbol: {symbol}
                </p>
              </div>

              <Button
                onClick={handleSymbolChange}
                disabled={
                  !newSymbol ||
                  newSymbol.length < 2 ||
                  newSymbol.length > 10 ||
                  isPending ||
                  isConfirming
                }
                className="w-full"
              >
                {isPending && activeAction === 'symbol' || isConfirming && activeAction === 'symbol'
                  ? 'Updating...'
                  : `Update Symbol to ${newSymbol || '...'}`}
              </Button>

              <Alert>
                <AlertDescription className="text-xs">
                  Symbol changes are permanent and will be reflected across all platforms
                  and exchanges. Choose carefully.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <Alert variant="destructive" className="mt-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isSuccess && (
          <Alert className="mt-6">
            <AlertDescription>
              <p className="font-semibold">✅ Corporate action executed successfully!</p>
              <p className="text-xs font-mono mt-1 break-all">{hash}</p>
            </AlertDescription>
          </Alert>
        )}

        {/* Info Box */}
        <Alert className="mt-6">
          <AlertDescription>
            <h4 className="font-semibold mb-2">ℹ️ Corporate Action Requirements</h4>
            <ul className="text-sm space-y-1">
              <li>• Only the contract owner ({owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : '...'}) can execute corporate actions</li>
              <li>• Stock splits are virtual - no new tokens are created</li>
              <li>• All holders maintain their proportional ownership</li>
              <li>• All corporate actions are recorded on-chain</li>
            </ul>
          </AlertDescription>
        </Alert>
      </div>
    </DashboardLayout>
  );
}
