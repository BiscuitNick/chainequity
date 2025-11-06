'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useContract } from '@/hooks/useContract';
import { useTokenInfo } from '@/hooks/useTokenInfo';
import { isAddress, parseUnits, type Address } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

export function MintSection() {
  const { isConnected } = useAccount();
  const { address: contractAddress, abi } = useContract();
  const { decimals, symbol, owner, splitMultiplier, isSplitMultiplierLoading } = useTokenInfo();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: txError } = useWaitForTransactionReceipt({ hash });

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      toast.success(`Minted ${amount} ${symbol} successfully!`, {
        description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });
      setRecipient('');
      setAmount('');
    }
  }, [isSuccess, hash, amount, symbol]);

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

  const handleMint = async () => {
    if (!isAddress(recipient)) {
      toast.error('Invalid recipient address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Invalid amount');
      return;
    }

    if (!splitMultiplier || splitMultiplier === 0n) {
      toast.error('Contract data still loading. Please wait...');
      return;
    }

    try {
      const BASIS_POINTS = 10000;
      const displayedAmountWei = parseUnits(amount, decimals);
      const actualAmountWei = (displayedAmountWei * BigInt(BASIS_POINTS)) / splitMultiplier;

      if (actualAmountWei === 0n) {
        toast.error('Calculated amount is too small');
        return;
      }

      toast.loading('Minting tokens...', { id: 'mint-tx' });
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'mint',
        args: [recipient as Address, actualAmountWei],
      });
    } catch (err) {
      toast.error('Failed to mint tokens', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      toast.dismiss('mint-tx');
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground">
          Please connect your wallet to mint tokens
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
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

          <Button
            onClick={handleMint}
            disabled={
              !recipient ||
              !amount ||
              !isAddress(recipient) ||
              parseFloat(amount) <= 0 ||
              isPending ||
              isConfirming ||
              isSplitMultiplierLoading
            }
            className="w-full"
          >
            {isSplitMultiplierLoading
              ? 'Loading contract data...'
              : isPending || isConfirming
              ? 'Minting...'
              : `Mint ${amount || '0'} ${symbol}`}
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
  );
}
