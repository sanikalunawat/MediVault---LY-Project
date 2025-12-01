'use client';

import { useState, useEffect, useCallback } from 'react';
import { SEPOLIA_NETWORK } from '@/lib/contract';

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      selectedAddress?: string;
      chainId?: string;
    };
  }
}

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: string | null;
  isSepolia: boolean;
  error: string | null;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    isSepolia: false,
    error: null,
  });

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && !!window.ethereum?.isMetaMask;

  // Check connection status on mount
  useEffect(() => {
    if (!isMetaMaskInstalled) return;

    checkConnection();
    setupEventListeners();

    return () => {
      removeEventListeners();
    };
  }, [isMetaMaskInstalled]);

  const checkConnection = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const chainId = window.ethereum.chainId || await window.ethereum.request({ method: 'eth_chainId' });

      if (accounts.length > 0) {
        const isSepolia = chainId === '0xaa36a7' || chainId === '0x' + parseInt(SEPOLIA_NETWORK.chainId, 16).toString(16);
        setState({
          address: accounts[0],
          isConnected: true,
          isConnecting: false,
          chainId: chainId || null,
          isSepolia,
          error: null,
        });
      }
    } catch (error) {
      console.error('Error checking connection:', error);
    }
  };

  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled) {
      setState((prev) => ({
        ...prev,
        error: 'MetaMask is not installed. Please install MetaMask extension.',
      }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request account access
      const accounts = await window.ethereum!.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Get chain ID
      const chainId = window.ethereum!.chainId || await window.ethereum!.request({ method: 'eth_chainId' });
      const isSepolia = chainId === '0xaa36a7' || chainId === '0x' + parseInt(SEPOLIA_NETWORK.chainId, 16).toString(16);

      setState({
        address: accounts[0],
        isConnected: true,
        isConnecting: false,
        chainId: chainId || null,
        isSepolia,
        error: null,
      });
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: error.message || 'Failed to connect wallet',
      }));
    }
  }, [isMetaMaskInstalled]);

  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
      isSepolia: false,
      error: null,
    });
  }, []);

  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: SEPOLIA_NETWORK.chainId }],
      });
    } catch (switchError: any) {
      // If chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [SEPOLIA_NETWORK],
          });
        } catch (addError) {
          setState((prev) => ({
            ...prev,
            error: 'Failed to add Sepolia network',
          }));
        }
      } else {
        setState((prev) => ({
          ...prev,
          error: 'Failed to switch network',
        }));
      }
    }
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnect();
    } else {
      setState((prev) => ({
        ...prev,
        address: accounts[0],
      }));
    }
  };

  const handleChainChanged = (chainId: string) => {
    const isSepolia = chainId === '0xaa36a7' || chainId === '0x' + parseInt(SEPOLIA_NETWORK.chainId, 16).toString(16);
    setState((prev) => ({
      ...prev,
      chainId,
      isSepolia,
    }));
  };

  const setupEventListeners = () => {
    if (!window.ethereum) return;

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
  };

  const removeEventListeners = () => {
    if (!window.ethereum) return;

    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', handleChainChanged);
  };

  return {
    ...state,
    isMetaMaskInstalled,
    connect,
    disconnect,
    switchToSepolia,
    refresh: checkConnection,
  };
}

