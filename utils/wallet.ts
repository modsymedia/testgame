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

// Add a fallback storage mechanism for when the database is unavailable
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
          hunger: data.petStats?.food || 50,
          happiness: data.petStats?.happiness || 40,
          energy: data.petStats?.energy || 30,
          lastFed: data.petStats?.lastFed,
          lastPlayed: data.petStats?.lastPlayed,
          lastSlept: data.petStats?.lastSlept,
          state: data.petStats?.isDead ? 'dead' : 'idle'
        }
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      
      // Store data in memory as fallback
      inMemoryStorage.set(publicKey, {
        ...data,
        lastSaved: new Date().toISOString(),
        isTempStorage: true
      });
      
      return false;
    }
    
    const result = await response.json();
    
    // If there's a warning about temporary storage, log it
    if (result.warning) {
      console.warn(result.warning);
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
      
      // Return default data
      return {
        petName: `Pet_${publicKey.substring(0, 4)}`,
        points: 0,
        lastLogin: Date.now(),
        daysActive: 0,
        consecutiveDays: 0,
        petStats: {
          food: 50,
          happiness: 40,
          energy: 30,
          isDead: false,
          points: 0,
          lastFed: null,
          lastPlayed: null,
          lastSlept: null
        }
      };
    }
    
    const { success, data } = await response.json();
    
    if (!success || !data) {
      console.error('Failed to load wallet data: Invalid response format');
      
      // Return default data
      return {
        petName: `Pet_${publicKey.substring(0, 4)}`,
        points: 0,
        lastLogin: Date.now(),
        daysActive: 0,
        consecutiveDays: 0,
        petStats: {
          food: 50,
          happiness: 40,
          energy: 30,
          isDead: false,
          points: 0,
          lastFed: null,
          lastPlayed: null,
          lastSlept: null
        }
      };
    }
    
    // Format data for client use
    return {
      petName: data.name || `Pet_${publicKey.substring(0, 4)}`,
      points: data.points || 0,
      lastLogin: data.lastUpdated ? new Date(data.lastUpdated).getTime() : Date.now(),
      daysActive: data.daysActive || 0,
      consecutiveDays: data.consecutiveDays || 0,
      petStats: {
        food: data.petState?.hunger || 50,
        happiness: data.petState?.happiness || 40,
        energy: data.petState?.energy || 30,
        isDead: data.petState?.state === 'dead',
        points: data.points || 0,
        lastFed: data.petState?.lastFed ? new Date(data.petState.lastFed) : null,
        lastPlayed: data.petState?.lastPlayed ? new Date(data.petState.lastPlayed) : null,
        lastSlept: data.petState?.lastSlept ? new Date(data.petState.lastSlept) : null
      }
    };
  } catch (error) {
    console.error('Failed to load wallet data:', error);
    
    // Return default data on error
    return {
      petName: `Pet_${publicKey.substring(0, 4)}`,
      points: 0,
      lastLogin: Date.now(),
      daysActive: 0,
      consecutiveDays: 0,
      petStats: {
        food: 50,
        happiness: 40,
        energy: 30,
        isDead: false,
        points: 0,
        lastFed: null,
        lastPlayed: null,
        lastSlept: null
      }
    };
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

// Burn points (for pet resurrection)
export async function burnPoints(publicKey: string): Promise<number> {
  try {
    const response = await fetch('/api/wallet', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: publicKey,
        action: 'burnPoints'
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      
      // Get current points from memory storage if available
      if (inMemoryStorage.has(publicKey)) {
        const data = inMemoryStorage.get(publicKey);
        const currentPoints = data.petStats?.points || 0;
        const remainingPoints = Math.floor(currentPoints * 0.5);
        
        // Update in-memory storage
        data.petStats.points = remainingPoints;
        inMemoryStorage.set(publicKey, data);
        
        return remainingPoints;
      }
      
      return 0;
    }
    
    const { success, remainingPoints } = await response.json();
    
    if (!success || remainingPoints === undefined) {
      console.error('Failed to burn points: Invalid response format');
      return 0;
    }
    
    return remainingPoints;
  } catch (error) {
    console.error('Failed to burn points:', error);
    return 0;
  }
}

// Update points directly
export async function updatePoints(publicKey: string, amount: number): Promise<number> {
  try {
    const response = await fetch('/api/wallet', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: publicKey,
        action: 'updatePoints',
        amount
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API error (${response.status}): ${errorText}`);
      
      // Update points in memory storage if available
      if (inMemoryStorage.has(publicKey)) {
        const data = inMemoryStorage.get(publicKey);
        const currentPoints = data.petStats?.points || 0;
        const newPoints = Math.max(0, currentPoints + amount);
        
        // Update in-memory storage
        data.petStats.points = newPoints;
        inMemoryStorage.set(publicKey, data);
        
        return newPoints;
      }
      
      return 0;
    }
    
    const { success, newPoints } = await response.json();
    
    if (!success || newPoints === undefined) {
      console.error('Failed to update points: Invalid response format');
      return 0;
    }
    
    return newPoints;
  } catch (error) {
    console.error('Failed to update points:', error);
    return 0;
  }
}

// Get wallet provider
export function getProvider() {
  if (typeof window !== 'undefined') {
    // @ts-ignore
    const provider = window.phantom?.solana;
    if (provider?.isPhantom) {
      return provider;
    }
  }
  return null;
}

// Generate a shorter wallet ID for display
export const generateWalletId = (publicKey: string): string => {
  if (!publicKey) return 'No Wallet';
  const start = publicKey.substring(0, 4);
  const end = publicKey.substring(publicKey.length - 4);
  return `${start}...${end}`;
}; 