'use client';

/**
 * Corporate Actions Page
 *
 * Execute stock splits and symbol changes
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useContract } from '@/hooks/useContract';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { SimplePagination } from '@/components/ui/pagination';

interface CorporateAction {
  id: number;
  action_type: 'StockSplit' | 'SymbolChange' | 'NameChange';
  block_number: number;
  transaction_hash: string;
  old_value: string | null;
  new_value: string | null;
  timestamp: number;
}

export default function CorporatePage() {
  const { isConnected } = useAccount();
  const { address: contractAddress, abi } = useContract();
  const { symbol, splitMultiplier, owner } = useTokenInfo();
  const [splitRatio, setSplitRatio] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [error, setError] = useState('');
  const [activeAction, setActiveAction] = useState<'split' | 'symbol' | null>(null);

  // Corporate action history state
  const [history, setHistory] = useState<CorporateAction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);

  // Write contract hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Fetch corporate action history
  useEffect(() => {
    if (!isConnected) return;

    const fetchHistory = async () => {
      try {
        setHistoryLoading(true);
        const response = await fetch(`http://localhost:3000/api/corporate/history?limit=${historyLimit}`);
        if (!response.ok) {
          throw new Error('Failed to fetch corporate action history');
        }
        const data = await response.json();
        setHistory(data.actions || []);
      } catch (err) {
        console.error('Failed to fetch history:', err);
      } finally {
        setHistoryLoading(false);
      }
    };

    fetchHistory();
  }, [isConnected, historyLimit, isSuccess]); // Refetch when action succeeds

  // Format timestamp
  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  // Format action type
  const formatActionType = (actionType: string) => {
    switch (actionType) {
      case 'StockSplit':
        return 'Stock Split';
      case 'SymbolChange':
        return 'Symbol Change';
      case 'NameChange':
        return 'Name Change';
      default:
        return actionType;
    }
  };

  // Format action details
  const formatActionDetails = (action: CorporateAction) => {
    switch (action.action_type) {
      case 'StockSplit':
        const oldMultiplier = action.old_value ? (parseFloat(action.old_value) / 10000).toFixed(1) : '1.0';
        const newMultiplier = action.new_value ? (parseFloat(action.new_value) / 10000).toFixed(1) : '1.0';
        return `${oldMultiplier}x → ${newMultiplier}x`;
      case 'SymbolChange':
        return `${action.old_value || 'N/A'} → ${action.new_value || 'N/A'}`;
      case 'NameChange':
        return `${action.old_value || 'N/A'} → ${action.new_value || 'N/A'}`;
      default:
        return 'N/A';
    }
  };

  // Handle stock split
  const handleSplit = async () => {
    setError('');
    setActiveAction('split');

    const ratio = parseFloat(splitRatio);
    if (isNaN(ratio) || ratio <= 1) {
      setError('Split ratio must be greater than 1');
      return;
    }

    try {
      // Convert ratio to basis points (e.g., 2.5 → 25000)
      const BASIS_POINTS = 10000;
      const multiplierBasisPoints = Math.floor(ratio * BASIS_POINTS);

      writeContract({
        address: contractAddress,
        abi,
        functionName: 'executeSplit',
        args: [BigInt(multiplierBasisPoints)],
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
                <Label htmlFor="splitRatio">Split Ratio (e.g., 2.5 for 2.5-for-1 split)</Label>
                <Input
                  id="splitRatio"
                  type="number"
                  value={splitRatio}
                  onChange={(e) => setSplitRatio(e.target.value)}
                  placeholder="2"
                  min="1.01"
                  step="0.1"
                />
                <p className="text-sm text-muted-foreground">
                  Current Multiplier: {(Number(splitMultiplier) / 10000).toFixed(1)}x
                </p>
                {splitRatio && parseFloat(splitRatio) > 1 && (
                  <p className="text-sm">
                    After split: {((Number(splitMultiplier) / 10000) * parseFloat(splitRatio)).toFixed(1)}x total multiplier
                  </p>
                )}
              </div>

              <Button
                onClick={handleSplit}
                disabled={
                  !splitRatio ||
                  parseFloat(splitRatio) <= 1 ||
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
                  A 2.5-for-1 split means each token holder will see their balance multiplied by 2.5,
                  while maintaining their proportional ownership. Decimals are supported.
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

        {/* Corporate Action History */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Corporate Action History</CardTitle>
            <CardDescription>Recent corporate actions executed on this token</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {historyLoading ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Loading history...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">No corporate actions have been executed yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Action Type
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
                    {history.map((action) => (
                      <tr key={action.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatTimestamp(action.timestamp)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatActionType(action.action_type)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono">
                          {formatActionDetails(action)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                          {action.block_number}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

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
