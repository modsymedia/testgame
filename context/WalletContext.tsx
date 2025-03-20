"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getProvider, getWalletData, saveWalletData, calculateMultiplier } from '@/utils/wallet';

interface WalletContextType {
  isConnected: boolean;
  publicKey: string | null;
  walletData: any;
  connect: () => Promise<boolean>;
  disconnect: () => void;
  updatePoints: (points: number) => void;
  burnPoints: () => number;
  error: string | null;
}

const defaultContext: WalletContextType = {
  isConnected: false,
  publicKey: null,
  walletData: null,
  connect: async () => false,
  disconnect: () => {},
  updatePoints: () => {},
  burnPoints: () => 0,
  error: null
};

const WalletContext = createContext<WalletContextType>(defaultContext);

export function useWallet() {
  return useContext(WalletContext);
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if wallet was previously connected
    const checkConnection = async () => {
      const provider = getProvider();
      if (provider?.isConnected && provider.publicKey) {
        setIsConnected(true);
        const key = provider.publicKey.toString();
        setPublicKey(key);
        const data = getWalletData(key);
        setWalletData(data);
      }
    };

    checkConnection();
    
    // Set up event listeners for wallet connection changes
    const handleConnect = () => {
      const provider = getProvider();
      if (provider?.publicKey) {
        setIsConnected(true);
        const key = provider.publicKey.toString();
        setPublicKey(key);
        const data = getWalletData(key);
        setWalletData(data);
      }
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
      setPublicKey(null);
      setWalletData(null);
    };
    
    // Add event listeners
    const provider = getProvider();
    if (provider) {
      provider.on('connect', handleConnect);
      provider.on('disconnect', handleDisconnect);
    }
    
    // No cleanup for now since we can't reliably remove listeners
    return () => {
      // Skip cleanup to avoid errors - the component will be unmounted anyway
      // This is a workaround since Phantom's API doesn't have a clean way to remove listeners
    };
  }, []);
  
  const connect = async (): Promise<boolean> => {
    try {
      const provider = getProvider();
      if (!provider) {
        setError('Phantom wallet not found. Please install it to continue.');
        return false;
      }
      
      const { publicKey } = await provider.connect();
      const key = publicKey.toString();
      setPublicKey(key);
      setIsConnected(true);
      
      // Get or initialize wallet data
      const data = getWalletData(key);
      setWalletData(data);
      
      // Update login time
      data.lastLogin = Date.now();
      saveWalletData(key, data);
      
      return true;
    } catch (error: any) {
      setError(error?.message || 'Failed to connect wallet');
      return false;
    }
  };
  
  const disconnect = () => {
    try {
      const provider = getProvider();
      if (provider) {
        provider.disconnect();
        setIsConnected(false);
        setPublicKey(null);
        setWalletData(null);
      }
    } catch (error: any) {
      setError(error?.message || 'Failed to disconnect wallet');
    }
  };
  
  const updatePoints = (points: number) => {
    if (!publicKey || !walletData) return;
    
    const updatedData = { ...walletData };
    updatedData.points += points * (walletData.multiplier || 1);
    setWalletData(updatedData);
    saveWalletData(publicKey, updatedData);
  };
  
  const burnPoints = (): number => {
    if (!publicKey || !walletData) return 0;
    
    const updatedData = { ...walletData };
    const burnAmount = Math.floor(updatedData.points * 0.5);
    updatedData.points -= burnAmount;
    setWalletData(updatedData);
    saveWalletData(publicKey, updatedData);
    
    return updatedData.points;
  };
  
  const value = {
    isConnected,
    publicKey,
    walletData,
    connect,
    disconnect,
    updatePoints,
    burnPoints,
    error
  };
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
} 