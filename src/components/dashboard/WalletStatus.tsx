'use client';

import { useWallet } from '@/hooks/useWallet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wallet, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function WalletStatus() {
  const { 
    isConnected, 
    address, 
    isSepolia, 
    isConnecting, 
    error, 
    connect, 
    switchToSepolia,
    isMetaMaskInstalled 
  } = useWallet();

  if (!isMetaMaskInstalled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1.5">
              <XCircle className="h-3 w-3 text-muted-foreground" />
              <span>MetaMask Not Installed</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Install MetaMask extension to connect your wallet</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isConnecting) {
    return (
      <Badge variant="outline" className="gap-1.5">
        <Wallet className="h-3 w-3 animate-pulse" />
        <span>Connecting...</span>
      </Badge>
    );
  }

  if (!isConnected) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={connect}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        <span>Connect Wallet</span>
      </Button>
    );
  }

  if (!isSepolia) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="outline" 
              size="sm"
              onClick={switchToSepolia}
              className="gap-2"
            >
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span>Switch to Sepolia</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to switch MetaMask to Sepolia network</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="default" className="gap-1.5 bg-green-600 hover:bg-green-700">
            <CheckCircle2 className="h-3 w-3" />
            <span className="font-mono text-xs">
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold">Wallet Connected</p>
            <p className="text-xs font-mono">{address}</p>
            <p className="text-xs text-muted-foreground">Network: Sepolia</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

