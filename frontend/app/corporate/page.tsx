'use client';

/**
 * Corporate Actions Page
 *
 * Execute stock splits and symbol changes
 */

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useContract } from '@/hooks/useContract';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export default function CorporatePage() {
  const { isConnected } = useAccount();
  const { address: contractAddress, abi } = useContract();
  const { symbol, splitMultiplier, owner } = useTokenInfo();
  const [splitRatio, setSplitRatio] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [activeAction, setActiveAction] = useState<'split' | 'symbol' | null>(null);

  // Write contract hooks
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: txError } = useWaitForTransactionReceipt({ hash });

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      const actionText = activeAction === 'split' ? 'Stock split executed' : 'Symbol updated';
      toast.success(`${actionText} successfully!`, {
        description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });
      setSplitRatio('');
      setNewSymbol('');
      setActiveAction(null);
    }
  }, [isSuccess, hash, activeAction]);

  // Handle transaction errors
  useEffect(() => {
    if (writeError) {
      toast.error('Transaction failed', {
        description: writeError.message,
      });
    }
    if (txError) {
      toast.error('Transaction failed', {
        description: txError.message,
      });
    }
  }, [writeError, txError]);

  // Handle stock split
  const handleSplit = async () => {
    setActiveAction('split');

    const ratio = parseFloat(splitRatio);
    if (isNaN(ratio) || ratio < 0.01) {
      toast.error('Invalid split ratio', {
        description: 'Split ratio must be at least 0.01 (100:1 reverse split)',
      });
      return;
    }

    try {
      // Convert ratio to basis points (e.g., 2.5 → 25000)
      const BASIS_POINTS = 10000;
      const multiplierBasisPoints = Math.floor(ratio * BASIS_POINTS);

      toast.loading('Executing stock split...', { id: 'split-tx' });
      writeContract({
      address: contractAddress,
      abi,
      functionName: 'executeSplit',
      args: [BigInt(multiplierBasisPoints)],
      });
    } catch (err) {
      toast.error('Failed to execute split', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      toast.dismiss('split-tx');
    }
  };

  // Handle symbol change
  const handleSymbolChange = async () => {
    setActiveAction('symbol');

    if (!newSymbol || newSymbol.length < 2 || newSymbol.length > 10) {
      toast.error('Invalid symbol', {
        description: 'Symbol must be between 2 and 10 characters',
      });
      return;
    }

    try {
      toast.loading('Updating symbol...', { id: 'symbol-tx' });
      writeContract({
      address: contractAddress,
      abi,
      functionName: 'updateSymbol',
      args: [newSymbol.toUpperCase()],
      });
    } catch (err) {
      toast.error('Failed to update symbol', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      toast.dismiss('symbol-tx');
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
      <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
      <p className="text-muted-foreground">
        Please connect your wallet to manage corporate actions
      </p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Stock Split Card */}
        <Card>
          <CardHeader>
            <CardTitle>📊 Stock Split</CardTitle>
            <CardDescription>Execute a virtual stock split</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="splitRatio">Split Ratio (e.g., 2.5 for 2.5:1 split, 0.5 for 1:2 reverse split)</Label>
              <Input
                id="splitRatio"
                type="number"
                value={splitRatio}
                onChange={(e) => setSplitRatio(e.target.value)}
                placeholder="2"
                min="0.01"
                step="0.01"
              />
              <p className="text-sm text-muted-foreground">
                Current Multiplier: {(Number(splitMultiplier) / 10000).toFixed(1)}x
              </p>
              {splitRatio && parseFloat(splitRatio) >= 0.01 && (
                <p className="text-sm">
                  After split: {((Number(splitMultiplier) / 10000) * parseFloat(splitRatio)).toFixed(2)}x total multiplier
                  {parseFloat(splitRatio) < 1 && <span className="text-amber-500 ml-1">(Reverse Split)</span>}
                </p>
              )}
            </div>

            <Button
              onClick={handleSplit}
              disabled={
                !splitRatio ||
                parseFloat(splitRatio) < 0.01 ||
                isPending ||
                isConfirming
              }
              className="w-full"
            >
              {isPending && activeAction === 'split' || isConfirming && activeAction === 'split'
                ? 'Executing...'
                : parseFloat(splitRatio) < 1 && splitRatio
                ? `Execute ${(1 / parseFloat(splitRatio)).toFixed(0)}:1 Reverse Split`
                : `Execute ${splitRatio || 'N'}:1 Split`}
            </Button>

            <Alert>
              <AlertDescription className="text-xs">
                Forward splits (e.g., 2.5:1) multiply balances, increasing token count.
                Reverse splits (e.g., 0.5 = 1:2) reduce balances, decreasing token count.
                All holders maintain their proportional ownership. Minimum ratio: 0.01 (100:1 reverse split).
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
  );
}
