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

// Add a fallback storage mechanism for when the database is read-only
const inMemoryStorage = new Map<string, any>();

// Save wallet data to the server
export async function saveWalletData(publicKey: string, data: any): Promise<boolean> {
  try {
    console.log(`Saving wallet data for: ${publicKey.substring(0, 8)}...`);
    
    const response = await fetch('/api/wallet', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: publicKey,
        score: data.petStats?.points || 0,
        petState: {
          health: data.petStats?.health || 30,
          happiness: data.petStats?.happiness || 40,
          hunger: data.petStats?.food || 50,
          cleanliness: data.petStats?.cleanliness || 40,
          energy: data.petStats?.energy || 30,
          qualityScore: data.petStats?.qualityScore || 0,
          isDead: data.petStats?.isDead || false,
          lastStateUpdate: new Date()
        }
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      return false;
    }
    
    const result = await response.json();
    
    // Handle temporary storage fallback from server
    if (result.warning && result.warning.includes('temporary storage')) {
      console.log('Using temporary storage due to server filesystem permissions');
      // Store data in memory as fallback
      inMemoryStorage.set(publicKey, {
        ...data,
        lastSaved: new Date().toISOString(),
        isTempStorage: true
      });
      
      return true;
    }
    
    console.log(`Wallet data saved successfully: ${result.message}`);
    return true;
  } catch (error) {
    console.error('Failed to save wallet data:', error);
    
    // Fall back to in-memory storage
    inMemoryStorage.set(publicKey, {
      ...data,
      lastSaved: new Date().toISOString(),
      isTempStorage: true
    });
    
    console.log('Saved data to temporary storage');
    return false;
  }
}

// Load wallet data from the server
export async function loadWalletData(publicKey: string): Promise<any> {
  try {
    // Check if we have temporary stored data first
    if (inMemoryStorage.has(publicKey)) {
      console.log('Retrieved data from temporary storage');
      return inMemoryStorage.get(publicKey);
    }
    
    const response = await fetch(`/api/wallet?walletAddress=${encodeURIComponent(publicKey)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      return null;
    }
    
    const { success, data } = await response.json();
    
    if (!success || !data) {
      console.error('Failed to load wallet data: Invalid response format');
      return null;
    }
    
    // Format data for client use
    return {
      petName: data.username || `Pet_${publicKey.substring(0, 4)}`,
      points: data.points || 0,
      multiplier: data.multiplier || 1.0,
      lastLogin: data.lastUpdated ? new Date(data.lastUpdated).getTime() : Date.now(),
      daysActive: data.daysActive || 0,
      consecutiveDays: data.consecutiveDays || 0,
      petStats: {
        food: data.petState?.hunger || 50,
        happiness: data.petState?.happiness || 40,
        cleanliness: data.petState?.cleanliness || 40,
        energy: data.petState?.energy || 30,
        health: data.petState?.health || 30,
        isDead: data.petState?.isDead || false,
        points: data.points || 0
      }
    };
  } catch (error) {
    console.error('Failed to load wallet data:', error);
    return null;
  }
}

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