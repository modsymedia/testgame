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
      
      // Check if the provider is responsive
      let isProviderResponsive = false;
      try {
        // Attempt to check if the extension is responsive
        if ((provider as any)['isPhantom']) {
          isProviderResponsive = true;
        }
      } catch (error) {
        console.warn('Phantom provider is not responsive:', error);
        setError('Could not establish connection with Phantom wallet. Please refresh the page or restart your browser.');
        return false;
      }
      
      if (!isProviderResponsive) {
        setError('Could not establish connection with Phantom wallet. Please refresh the page or restart your browser.');
        return false;
      }
      
      // First try to disconnect
      try {
        if (provider.isConnected) {
          await provider.disconnect();
          
          // Increased delay to ensure the UI updates and extension has time to process
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (e) {
        console.warn('Error during pre-connect disconnect:', e);
        // Continue anyway, but with a brief pause
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Now try to connect with the wallet
      try {
        // This will prompt the user to approve the connection
        const resp = await provider.connect();
        const key = resp.publicKey.toString();
        
        // Wait a moment before updating state
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setPublicKey(key);
        setIsConnected(true);
        
        // Get or initialize wallet data
        const data = getWalletData(key);
        setWalletData(data);
        
        // Update login time
        data.lastLogin = Date.now();
        saveWalletData(key, data);
        
        return true;
      } catch (connError) {
        console.error('Connection error:', connError);
        setError('Failed to connect wallet. Please try again or refresh the page.');
        return false;
      }
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      setError(error?.message || 'Failed to connect wallet');
      return false;
    }
  };
  
  const disconnect = () => {
    try {
      const provider = getProvider();
      if (provider) {
        provider.disconnect();
        
        // Reset all state values
        setIsConnected(false);
        setPublicKey(null);
        setWalletData(null);
        
        // Clear any stored session data
        if (typeof window !== 'undefined') {
          // Remove the auto-connect session flag if it exists
          sessionStorage.removeItem('phantom_connected');
          localStorage.removeItem('phantom_last_connected');
          
          // Don't try to modify read-only solana property
          // Just clear our own connection state
        }
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