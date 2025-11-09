'use client';

/**
 * Token Transfer Page
 *
 * Transfer tokens between approved addresses
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export default function TransferPage() {
  const { isConnected, address: userAddress } = useAccount();
  const { address: contractAddress, abi } = useContract();
  const { decimals, symbol, splitMultiplier, isSplitMultiplierLoading } = useTokenInfo();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');
  const [approvalWarning, setApprovalWarning] = useState('');

  // Write contract hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Check wallet approval status
  const checkApprovalStatus = async (address: string) => {
    try {
      const response = await fetch(`${API_URL}/api/issuer/status/${address}`);
      if (!response.ok) return false;
      const data = await response.json();
      return data.data?.isApproved || false;
    } catch (err) {
      console.error('Failed to check approval status:', err);
      return false;
    }
  };

  // Handle transfer
  const handleTransfer = async () => {
    setError('');
    setApprovalWarning('');

    if (!isAddress(recipient)) {
      setError('Invalid recipient address');
      return;
    }

    if (recipient === userAddress) {
      setError('Cannot transfer to yourself');
      return;
    }

    if (recipient === '0x0000000000000000000000000000000000000000') {
      setError('Cannot transfer to zero address');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Invalid amount');
      return;
    }

    // Validate splitMultiplier is loaded
    if (!splitMultiplier || splitMultiplier === 0n) {
      setError('Contract data still loading. Please wait...');
      return;
    }

    // Check approval status of both parties
    const [senderApproved, recipientApproved] = await Promise.all([
      checkApprovalStatus(userAddress as string),
      checkApprovalStatus(recipient),
    ]);

    if (!senderApproved) {
      setError('Your wallet is not approved for transfers. Please contact the issuer.');
      return;
    }

    if (!recipientApproved) {
      setApprovalWarning(
        `Warning: Recipient ${recipient.slice(0, 6)}...${recipient.slice(-4)} is not approved. The transaction may fail.`
      );
    }

    try {
      // Convert displayed amount to actual amount accounting for split multiplier
      // actualAmount = displayedAmount * BASIS_POINTS / splitMultiplier
      const BASIS_POINTS = 10000;
      const displayedAmountWei = parseUnits(amount, decimals);
      const actualAmountWei = (displayedAmountWei * BigInt(BASIS_POINTS)) / splitMultiplier;

      // Debug logging
      console.log('Transfer Debug:', {
        sender: userAddress,
        recipient,
        amount,
        decimals,
        splitMultiplier: splitMultiplier.toString(),
        displayedAmountWei: displayedAmountWei.toString(),
        actualAmountWei: actualAmountWei.toString(),
        contractAddress,
      });

      // Additional safety check
      if (actualAmountWei === 0n) {
        setError('Calculated amount is too small');
        return;
      }

      writeContract({
        address: contractAddress,
        abi,
        functionName: 'transfer',
        args: [recipient as Address, actualAmountWei],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer tokens');
    }
  };

  // Clear form on success
  if (isSuccess) {
    setTimeout(() => {
      setRecipient('');
      setAmount('');
      setApprovalWarning('');
    }, 2000);
  }

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your wallet to transfer tokens
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Transfer Tokens</h2>
          <p className="text-muted-foreground">
            Send {symbol} tokens to other approved addresses
          </p>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Transfer Tokens</CardTitle>
              <CardDescription>Send {symbol} tokens to another approved wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  type="text"
                  value={recipient}
                  onChange={(e) => {
                    setRecipient(e.target.value);
                    setApprovalWarning('');
                  }}
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

              {approvalWarning && (
                <Alert>
                  <AlertDescription>{approvalWarning}</AlertDescription>
                </Alert>
              )}

              {isSuccess && (
                <Alert>
                  <AlertDescription>
                    Transfer successful! Transaction hash: {hash?.slice(0, 10)}...
                  </AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleTransfer}
                disabled={
                  !recipient ||
                  !amount ||
                  !isAddress(recipient) ||
                  isPending ||
                  isConfirming ||
                  isSplitMultiplierLoading
                }
                className="w-full"
              >
                {isPending
                  ? 'Confirming...'
                  : isConfirming
                  ? 'Processing...'
                  : 'Transfer Tokens'}
              </Button>
            </CardContent>
          </Card>

          <Alert className="mt-6">
            <AlertDescription>
              <h4 className="font-semibold mb-2">Transfer Requirements</h4>
              <ul className="text-sm space-y-1">
                <li>• Both sender and recipient must be approved wallets</li>
                <li>• You must have sufficient balance for the transfer</li>
                <li>• Gas fees will be deducted from your wallet</li>
                <li>• Transfers are instant and recorded on the blockchain</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </DashboardLayout>
  );
}
