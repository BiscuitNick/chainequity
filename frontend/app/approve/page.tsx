'use client';

/**
 * Wallet Approval Page
 *
 * Manage wallet approvals and revocations for the allowlist
 */

import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useContract } from '@/hooks/useContract';
import { isAddress, type Address } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

export default function ApprovePage() {
  const { isConnected } = useAccount();
  const { address: contractAddress, abi } = useContract();
  const [walletAddress, setWalletAddress] = useState('');
  const [error, setError] = useState('');

  // Write contract hooks
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  // Check if a wallet is approved
  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'isApproved',
    args: walletAddress && isAddress(walletAddress) ? [walletAddress as Address] : undefined,
    query: {
      enabled: walletAddress !== '' && isAddress(walletAddress),
    },
  });

  // Handle approve
  const handleApprove = async () => {
    setError('');

    if (!isAddress(walletAddress)) {
      setError('Invalid Ethereum address');
      return;
    }

    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'approveWallet',
        args: [walletAddress as Address],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve wallet');
    }
  };

  // Handle revoke
  const handleRevoke = async () => {
    setError('');

    if (!isAddress(walletAddress)) {
      setError('Invalid Ethereum address');
      return;
    }

    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'revokeWallet',
        args: [walletAddress as Address],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke wallet');
    }
  };

  // Refetch approval status when transaction succeeds
  if (isSuccess) {
    refetchApproval();
  }

  if (!isConnected) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-16">
          <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
          <p className="text-muted-foreground">
            Please connect your wallet to manage approvals
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div>
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Wallet Approval Management</h2>
          <p className="text-muted-foreground">
            Approve or revoke wallet addresses for token transfers
          </p>
        </div>

        <div className="max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Manage Wallet</CardTitle>
              <CardDescription>Approve or revoke wallet addresses for token transfers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wallet">Wallet Address</Label>
                <Input
                  id="wallet"
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="0x..."
                />
                {walletAddress && isAddress(walletAddress) && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-sm">Status:</span>
                    <Badge variant={isApproved ? 'default' : 'secondary'}>
                      {isApproved ? '✅ Approved' : '❌ Not Approved'}
                    </Badge>
                  </div>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {isSuccess && (
                <Alert>
                  <AlertDescription>
                    <p className="font-semibold">Transaction confirmed!</p>
                    <p className="text-xs font-mono mt-1 break-all">{hash}</p>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button
                  onClick={handleApprove}
                  disabled={!walletAddress || !isAddress(walletAddress) || isPending || isConfirming}
                  className="flex-1"
                >
                  {isPending || isConfirming ? 'Processing...' : 'Approve Wallet'}
                </Button>
                <Button
                  onClick={handleRevoke}
                  disabled={!walletAddress || !isAddress(walletAddress) || isPending || isConfirming}
                  variant="destructive"
                  className="flex-1"
                >
                  {isPending || isConfirming ? 'Processing...' : 'Revoke Wallet'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Alert className="mt-6">
            <AlertDescription>
              <h4 className="font-semibold mb-2">ℹ️ About Wallet Approvals</h4>
              <ul className="text-sm space-y-1">
                <li>• Only approved wallets can send and receive tokens</li>
                <li>• Only the contract owner can approve or revoke wallets</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </DashboardLayout>
  );
}
