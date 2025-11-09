'use client';

/**
 * WalletConnect Component
 *
 * Displays wallet connection button and user info when connected
 */

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useTokenBalance } from '@/hooks/useTokenBalance';
import { useTokenInfo } from '@/hooks/useTokenInfo';

export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { formattedBalance } = useTokenBalance({ address, watch: true });
  const { symbol } = useTokenInfo();

  return (
    <div className="flex items-center gap-4">
      {isConnected && address && (
        <div className="flex flex-col items-end mr-2">
          <div className="text-sm text-muted-foreground">Balance</div>
          <div className="text-lg font-semibold">{formattedBalance} {symbol}</div>
        </div>
      )}
      <ConnectButton
        showBalance={false}
        accountStatus="address"
        chainStatus="icon"
      />
    </div>
  );
}
