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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type Operation = 'mint' | 'transfer';

export function MintSection() {
  const { isConnected, address: userAddress } = useAccount();
  const { address: contractAddress, abi } = useContract();
  const { decimals, symbol, owner, splitMultiplier, isSplitMultiplierLoading } = useTokenInfo();

  // Form state
  const [operation, setOperation] = useState<Operation>('mint');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');

  // Mint transaction hooks
  const { writeContract: writeMint, data: mintHash, isPending: isMintPending, error: mintWriteError } = useWriteContract();
  const { isLoading: isMintConfirming, isSuccess: isMintSuccess, error: mintTxError } = useWaitForTransactionReceipt({ hash: mintHash });

  // Transfer transaction hooks
  const { writeContract: writeTransfer, data: transferHash, isPending: isTransferPending, error: transferWriteError } = useWriteContract();
  const { isLoading: isTransferConfirming, isSuccess: isTransferSuccess, error: transferTxError } = useWaitForTransactionReceipt({ hash: transferHash });

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

  // Handle mint success
  useEffect(() => {
    if (isMintSuccess && mintHash) {
      toast.success(`Minted ${amount} ${symbol} successfully!`, {
        description: `Transaction: ${mintHash.slice(0, 10)}...${mintHash.slice(-8)}`,
      });
      setRecipient('');
      setAmount('');
    }
  }, [isMintSuccess, mintHash, amount, symbol]);

  // Handle transfer success
  useEffect(() => {
    if (isTransferSuccess && transferHash) {
      toast.success(`Transferred ${amount} ${symbol} successfully!`, {
        description: `Transaction: ${transferHash.slice(0, 10)}...${transferHash.slice(-8)}`,
      });
      setRecipient('');
      setAmount('');
    }
  }, [isTransferSuccess, transferHash, amount, symbol]);

  // Handle errors
  useEffect(() => {
    if (mintWriteError) {
      toast.error('Mint transaction failed', {
        description: mintWriteError.message,
      });
    }
    if (mintTxError) {
      toast.error('Mint transaction failed', {
        description: mintTxError.message,
      });
    }
    if (transferWriteError) {
      toast.error('Transfer transaction failed', {
        description: transferWriteError.message,
      });
    }
    if (transferTxError) {
      toast.error('Transfer transaction failed', {
        description: transferTxError.message,
      });
    }
  }, [mintWriteError, mintTxError, transferWriteError, transferTxError]);

  // Clear form when switching operations
  useEffect(() => {
    setRecipient('');
    setAmount('');
  }, [operation]);

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
      writeMint({
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

  const handleTransfer = async () => {
    if (!isAddress(recipient)) {
      toast.error('Invalid recipient address');
      return;
    }

    if (recipient === userAddress) {
      toast.error('Cannot transfer to yourself');
      return;
    }

    if (recipient === '0x0000000000000000000000000000000000000000') {
      toast.error('Cannot transfer to zero address');
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

    // Check approval status of both parties
    const [senderApproved, recipientApproved] = await Promise.all([
      checkApprovalStatus(userAddress as string),
      checkApprovalStatus(recipient),
    ]);

    if (!senderApproved) {
      toast.error('Your wallet is not approved for transfers');
      return;
    }

    if (!recipientApproved) {
      toast.warning(`Recipient may not be approved. Transaction might fail.`);
    }

    try {
      const BASIS_POINTS = 10000;
      const displayedAmountWei = parseUnits(amount, decimals);
      const actualAmountWei = (displayedAmountWei * BigInt(BASIS_POINTS)) / splitMultiplier;

      if (actualAmountWei === 0n) {
        toast.error('Calculated amount is too small');
        return;
      }

      toast.loading('Transferring tokens...', { id: 'transfer-tx' });
      writeTransfer({
        address: contractAddress,
        abi,
        functionName: 'transfer',
        args: [recipient as Address, actualAmountWei],
      });
    } catch (err) {
      toast.error('Failed to transfer tokens', {
        description: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      toast.dismiss('transfer-tx');
    }
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground">
          Please connect your wallet to {operation} tokens
        </p>
      </div>
    );
  }

  const isPending = operation === 'mint' ? isMintPending : isTransferPending;
  const isConfirming = operation === 'mint' ? isMintConfirming : isTransferConfirming;

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <CardTitle>{operation === 'mint' ? 'Mint New Tokens' : 'Transfer Tokens'}</CardTitle>
              <CardDescription>
                {operation === 'mint'
                  ? `Create new ${symbol} tokens and send them to approved addresses`
                  : `Send ${symbol} tokens to other approved addresses`}
              </CardDescription>
            </div>
            <Select value={operation} onValueChange={(value: Operation) => setOperation(value)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mint">Mint Tokens</SelectItem>
                <SelectItem value="transfer">Transfer Tokens</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
            onClick={operation === 'mint' ? handleMint : handleTransfer}
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
              ? operation === 'mint' ? 'Minting...' : 'Transferring...'
              : operation === 'mint'
              ? `Mint ${amount || '0'} ${symbol}`
              : `Transfer ${amount || '0'} ${symbol}`}
          </Button>
        </CardContent>
      </Card>

      <Alert className="mt-6">
        <AlertDescription>
          <h4 className="font-semibold mb-2">
            ℹ️ {operation === 'mint' ? 'Minting' : 'Transfer'} Requirements
          </h4>
          {operation === 'mint' ? (
            <ul className="text-sm space-y-1">
              <li>• Only the contract owner ({owner ? `${owner.slice(0, 6)}...${owner.slice(-4)}` : '...'}) can mint tokens</li>
              <li>• Recipient must be an approved wallet</li>
              <li>• Amount entered is the displayed balance that will be added (split multiplier is automatically accounted for)</li>
              <li>• All minting activity is recorded on-chain</li>
            </ul>
          ) : (
            <ul className="text-sm space-y-1">
              <li>• Both sender and recipient must be approved wallets</li>
              <li>• You must have sufficient balance for the transfer</li>
              <li>• Gas fees will be deducted from your wallet</li>
              <li>• Transfers are instant and recorded on the blockchain</li>
            </ul>
          )}
        </AlertDescription>
      </Alert>
    </div>
  );
}
