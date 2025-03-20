import { PublicKey } from '@solana/web3.js';

// Types for Phantom wallet
interface PhantomEvent {
  type: string;
  data: unknown;
}

interface PhantomRequestMethod {
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: unknown) => Promise<unknown>;
  signAllTransactions: (transactions: unknown[]) => Promise<unknown[]>;
}

interface PhantomProvider {
  publicKey?: PublicKey;
  isConnected?: boolean;
  signTransaction: (transaction: unknown) => Promise<unknown>;
  signAllTransactions: (transactions: unknown[]) => Promise<unknown[]>;
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: string, handler: (args: PhantomEvent) => void) => void;
  request: (method: PhantomRequestMethod) => Promise<unknown>;
}

interface WalletContextState {
  isConnected: boolean;
  wallet: PhantomProvider | null;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  error: string | null;
}

// Check if Phantom is available
export const getProvider = (): PhantomProvider | undefined => {
  if (typeof window !== 'undefined') {
    const provider = (window as any)?.solana;
    
    if (provider?.isPhantom) {
      return provider as PhantomProvider;
    }
  }
  
  return undefined;
};

// Generate a unique ID from the wallet address
export const generateWalletId = (publicKey: string): string => {
  return publicKey.substring(0, 8);
};

// Get wallet data from local storage
export const getWalletData = (publicKey: string) => {
  if (typeof window !== 'undefined') {
    const walletId = generateWalletId(publicKey);
    const dataString = localStorage.getItem(`wallet_${walletId}`);
    
    if (dataString) {
      try {
        return JSON.parse(dataString);
      } catch (err) {
        console.error('Error parsing wallet data:', err);
      }
    }
    
    // Default data if none exists
    return {
      petName: `Pet_${walletId.substring(0, 4)}`,
      points: 0,
      multiplier: 1.0,
      lastLogin: Date.now(),
      petStats: {
        food: 50,
        happiness: 40,
        cleanliness: 40,
        energy: 30,
        health: 30,
        isDead: false,
        points: 0
      }
    };
  }
  
  return null;
};

// Save wallet data to local storage
export const saveWalletData = (publicKey: string, data: any) => {
  if (typeof window !== 'undefined') {
    const walletId = generateWalletId(publicKey);
    localStorage.setItem(`wallet_${walletId}`, JSON.stringify(data));
  }
};

// Calculate point multiplier based on token holdings
export const calculateMultiplier = (tokenBalance: number): number => {
  // Simple multiplier logic based on token holdings
  if (tokenBalance > 1000) return 2.0;
  if (tokenBalance > 500) return 1.5;
  if (tokenBalance > 100) return 1.2;
  return 1.0;
};

// Burn 50% of wallet points
export const burnPoints = (publicKey: string): number => {
  const data = getWalletData(publicKey);
  if (data) {
    const remainingPoints = Math.floor(data.points * 0.5);
    data.points = remainingPoints;
    saveWalletData(publicKey, data);
    return remainingPoints;
  }
  return 0;
}; 