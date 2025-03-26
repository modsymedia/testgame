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
    try {
      console.log('Checking for Phantom provider...');
      
      // Check if window.solana exists first
      if (!(window as any)['solana']) {
        console.warn('window.solana is undefined - Phantom extension may not be installed');
        return undefined;
      }
      
      const provider = (window as any)?.solana;
      
      // Log some debug info about the provider
      console.log('Provider found:', provider ? 'Yes' : 'No');
      if (provider) {
        console.log('isPhantom:', provider.isPhantom ? 'Yes' : 'No');
        console.log('isConnected:', provider.isConnected ? 'Yes' : 'No');
        console.log('publicKey:', provider.publicKey ? 'Available' : 'Not available');
      }
      
      // Make sure provider and isPhantom property both exist
      if (provider && provider?.isPhantom) {
        return provider as PhantomProvider;
      }
      
      // If no provider found yet, give a warning
      if (!provider) {
        console.warn('No Solana provider found. Phantom wallet may not be installed or is disabled.');
      } else if (!provider.isPhantom) {
        console.warn('Solana provider found but it is not Phantom.');
      }
    } catch (e) {
      console.error('Error checking Phantom provider:', e);
    }
  }
  
  return undefined;
};

// Generate a unique ID from the wallet address
export const generateWalletId = (publicKey: string): string => {
  return publicKey.substring(0, 8);
};

// Get wallet data from database via API
export const getWalletData = async (publicKey: string) => {
  try {
    const response = await fetch(`/api/wallet?publicKey=${publicKey}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success && result.data) {
      return result.data;
    }
    
    // Default data if fetch fails
    return {
      petName: `Pet_${publicKey.substring(0, 4)}`,
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
  } catch (error) {
    console.error('Error fetching wallet data:', error);
    
    // Default data if fetch fails
    return {
      petName: `Pet_${publicKey.substring(0, 4)}`,
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
};

// Save wallet data to database via API
export const saveWalletData = async (publicKey: string, data: any) => {
  try {
    console.log('Saving wallet data for:', publicKey.substring(0, 8) + '...');
    
    const payload = {
      publicKey,
      data
    };
    
    // Debug: log the payload size
    const payloadSize = JSON.stringify(payload).length;
    console.log(`Payload size: ${payloadSize} bytes`);
    
    // Attempt the API call
    const response = await fetch('/api/wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    // Check if response is OK (status in 200-299 range)
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      return false;
    }
    
    // Parse the JSON response
    const result = await response.json();
    
    if (!result.success) {
      console.error('Failed to save wallet data:', result.error || 'Unknown error', 
                   result.details ? `Details: ${result.details}` : '');
      return false;
    }
    
    console.log('Wallet data saved successfully');
    return result.success;
  } catch (error) {
    console.error('Error saving wallet data:', error);
    return false;
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
export const burnPoints = async (publicKey: string): Promise<number> => {
  try {
    const response = await fetch('/api/wallet', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        publicKey,
        action: 'burnPoints'
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.remainingPoints !== undefined) {
      return result.remainingPoints;
    }
    
    console.error('Failed to burn points:', result.error || 'Unknown error');
    return 0;
  } catch (error) {
    console.error('Error burning points:', error);
    return 0;
  }
};

// Update points in database
export const updatePoints = async (publicKey: string, amount: number): Promise<boolean> => {
  try {
    const response = await fetch('/api/wallet', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        publicKey,
        action: 'updatePoints',
        amount
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      return true;
    }
    
    console.error('Failed to update points:', result.error || 'Unknown error');
    return false;
  } catch (error) {
    console.error('Error updating points:', error);
    return false;
  }
}; 