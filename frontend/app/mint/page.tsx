'use client';

/**
 * Token Minting Page
 *
 * Mint new tokens to approved addresses
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useContract } from '@/hooks/useContract';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { isAddress, parseUnits, type Address } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MintPage() {
  const { isConnected } = useAccount();
  const { address: contractAddress, abi } = useContract();
  const { decimals, symbol, owner, splitMultiplier } = useTokenInfo();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  // Write contract hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Handle mint
  const handleMint = async () => {
    setError('');

    if (!isAddress(recipient)) {
      setError('Invalid recipient address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Invalid amount');
      return;
    }

    try {
      // Convert displayed amount to actual amount accounting for split multiplier
      // actualAmount = displayedAmount * BASIS_POINTS / splitMultiplier
      const BASIS_POINTS = 10000;
      const displayedAmountWei = parseUnits(amount, decimals);
      const actualAmountWei = (displayedAmountWei * BigInt(BASIS_POINTS)) / splitMultiplier;

      writeContract({
        address: contractAddress,
        abi,
        functionName: 'mint',
        args: [recipient as Address, actualAmountWei],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mint tokens');
    }
  };

  // Clear form on success
  if (isSuccess) {
    setTimeout(() => {
      setRecipient('');
      setAmount('');
    }, 2000);
  }

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your wallet to mint tokens
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Mint Tokens</h2>
          <p className="text-muted-foreground">
            Create new {symbol} tokens and send them to approved addresses
          </p>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Mint New Tokens</CardTitle>
              <CardDescription>Create new {symbol} tokens and send them to approved addresses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                />
                {recipient && !isAddress(recipient) && (
                  <p className="text-sm text-destructive">Invalid Ethereum address</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({symbol})</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0"
                  step="0.01"
                  min="0"
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isSuccess && (
                <Alert>
                  <AlertDescription>
                    <p className="font-semibold">✅ Tokens minted successfully!</p>
                    <p className="text-xs font-mono mt-1 break-all">{hash}</p>
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleMint}
                disabled={
                  !recipient ||
                  !amount ||
                  !isAddress(recipient) ||
                  parseFloat(amount) <= 0 ||
                  isPending ||
                  isConfirming
                }
                className="w-full"
              >
                {isPending || isConfirming ? 'Minting...' : `Mint ${amount || '0'} ${symbol}`}
              </Button>
            </CardContent>
          </Card>

          <Alert className="mt-6">
            <AlertDescription>
              <h4 className="font-semibold mb-2">ℹ️ Minting Requirements</h4>
              <ul className="text-sm space-y-1">
                <li>• Only the contract owner ({owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : '...'}) can mint tokens</li>
                <li>• Recipient must be an approved wallet</li>
                <li>• Amount entered is the displayed balance that will be added (split multiplier is automatically accounted for)</li>
                <li>• All minting activity is recorded on-chain</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </DashboardLayout>
  );
}
