'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { useContract } from '@/hooks/useContract';
import { isAddress, type Address } from 'viem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export function ApproveSection() {
  const { isConnected } = useAccount();
  const { address: contractAddress, abi } = useContract();
  const [walletAddress, setWalletAddress] = useState('');
  const [lastAction, setLastAction] = useState<'approve' | 'revoke' | null>(null);

  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, error: txError } = useWaitForTransactionReceipt({ hash });

  const { data: isApproved, refetch: refetchApproval } = useReadContract({
    address: contractAddress,
    abi,
    functionName: 'isApproved',
    args: walletAddress && isAddress(walletAddress) ? [walletAddress as Address] : undefined,
    query: {
      enabled: walletAddress !== '' && isAddress(walletAddress),
    },
  });

  // Handle transaction success
  useEffect(() => {
    if (isSuccess && hash) {
      refetchApproval();
      const actionText = lastAction === 'approve' ? 'approved' : 'revoked';
      toast.success(`Wallet ${actionText} successfully!`, {
        description: `Transaction: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });
      setLastAction(null);
    }
  }, [isSuccess, hash, lastAction, refetchApproval]);

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

  const handleApprove = async () => {
    if (!isAddress(walletAddress)) {
      toast.error('Invalid Ethereum address');
      return;
    }

    try {
      setLastAction('approve');
      toast.loading('Approving wallet...', { id: 'approve-tx' });
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'approveWallet',
        args: [walletAddress as Address],
      });
    } catch (err) {
      toast.error('Failed to approve wallet', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      toast.dismiss('approve-tx');
    }
  };

  const handleRevoke = async () => {
    if (!isAddress(walletAddress)) {
      toast.error('Invalid Ethereum address');
      return;
    }

    try {
      setLastAction('revoke');
      toast.loading('Revoking wallet...', { id: 'revoke-tx' });
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'revokeWallet',
        args: [walletAddress as Address],
      });
    } catch (err) {
      toast.error('Failed to revoke wallet', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      toast.dismiss('revoke-tx');
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground">
          Please connect your wallet to manage approvals
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
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
  );
}
