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

// Add a flag to track if we're in the middle of a save operation
let isSaving = false;

// Save wallet data to the server
export async function saveWalletData(publicKey: string, data: any): Promise<boolean> {
  // If we're already saving, return early to prevent infinite loops
  if (isSaving) {
    console.log("Save operation already in progress, skipping...");
    return false;
  }
  
  try {
    isSaving = true;
    console.log(`Saving wallet data for: ${publicKey.substring(0, 8)}...`);
    
    // Try to save to server directly
    try {
      const response = await fetch('/api/wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey,
          score: data.petStats?.points || 0,
          username: data.username,
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
      
      isSaving = false;
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error (${response.status}): ${errorText}`);
        // Track the failure but don't use localStorage
        inMemoryStorage.set(publicKey, {
          ...data,
          lastSaved: new Date().toISOString(),
          pendingSave: true // Mark as pending to retry later
        });
        return false;
      }
      
      const result = await response.json();
      
      // If there's a warning about temporary storage, log it
      if (result.warning) {
        console.warn(result.warning);
      }
      
      console.log(`Wallet data saved successfully to server: ${result.message}`);
      return true;
    } catch (serverError) {
      console.error('Failed to save wallet data to server:', serverError);
      // Track the failure but don't fallback to localStorage
      inMemoryStorage.set(publicKey, {
        ...data,
        lastSaved: new Date().toISOString(),
        pendingSave: true // Mark as pending to retry later
      });
      return false;
    }
  } catch (error) {
    isSaving = false;
    console.error('Failed to save wallet data:', error);
    return false;
  } finally {
    isSaving = false;
  }
}

// Load wallet data from the server only - no localStorage fallbacks
export async function loadWalletData(publicKey: string): Promise<any> {
  try {
    console.log('Attempting to load wallet data from server for:', publicKey);
    
    // Only attempt to load from server
    try {
      const response = await fetch(`/api/wallet?walletAddress=${encodeURIComponent(publicKey)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Add cache: 'no-store' to prevent browser caching
        cache: 'no-store'
      });
      
      if (!response.ok) {
        console.error(`API error (${response.status})`);
        throw new Error(`API error (${response.status})`);
      }
      
      const { success, data } = await response.json();
      
      if (!success || !data) {
        console.error('Invalid response format or no data found');
        throw new Error('Invalid response format or no data found');
      }
      
      // Format data for client use
      const formattedData = {
        username: data.username || `User_${publicKey.substring(0, 4)}`,
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
      
      console.log('📊 Retrieved data from server:', publicKey);
      return formattedData;
    } catch (fetchError) {
      console.error('❌ Server connection error:', fetchError);
      
      // Create new default data - don't try to load from local storage
      const defaultData = createDefaultWalletData(publicKey);
      
      // Only store in memory, don't save to localStorage
      inMemoryStorage.set(publicKey, defaultData);
      
      console.log('Created default wallet data for new user:', publicKey);
      return defaultData;
    }
  } catch (error) {
    console.error('General error loading wallet data:', error);
    return createDefaultWalletData(publicKey);
  }
}

// Helper function to create default wallet data
function createDefaultWalletData(publicKey: string) {
  return {
    username: `User_${publicKey.substring(0, 4)}`,
    points: 0,
    multiplier: 1.0,
    lastLogin: Date.now(),
    daysActive: 0,
    consecutiveDays: 0,
    petStats: {
      food: 50,
      happiness: 40,
      cleanliness: 40,
      energy: 30,
      health: 30,
      isDead: false,
      points: 0
    },
    isOfflineMode: true
  };
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
    
    if (!success) {
      console.error('Failed to burn points');
      return 0;
    }
    
    return remainingPoints;
  } catch (error) {
    console.error('Error burning points:', error);
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
        data.petStats.points = amount;
        inMemoryStorage.set(publicKey, data);
      }
      
      return amount;
    }
    
    const { success, points } = await response.json();
    
    if (!success) {
      console.error('Failed to update points');
      return amount;
    }
    
    return points;
  } catch (error) {
    console.error('Error updating points:', error);
    return amount;
  }
}

// Get wallet provider (for Solana)
export function getProvider(walletName?: string) {
  if (typeof window === 'undefined') return null;
  
  // If a specific wallet is requested
  if (walletName) {
    if (walletName === 'phantom') {
      //
      const provider = window.phantom?.solana;
      if (provider?.isPhantom) {
        return provider;
      }
    } else if (walletName === 'solflare') {
      //
      const provider = window.solflare;
      if (provider?.isSolflare) {
        return provider;
      }
    }
    return null;
  }
  
  // If no specific wallet is requested, try to find any available wallet
  // First try Phantom
  //
  const phantomProvider = window.phantom?.solana;
  if (phantomProvider?.isPhantom) {
    return phantomProvider;
  }
  
  // Then try Solflare
  //
  const solflareProvider = window.solflare;
  if (solflareProvider?.isSolflare) {
    return solflareProvider;
  }
  
  // Fallback for other Solana wallets
  //
  return window.solana;
}

// Detect available wallet providers
export function getAvailableWallets() {
  if (typeof window === 'undefined') return [];
  
  const wallets = [];
  
  // Check for Phantom
  //
  if (window.phantom?.solana?.isPhantom) {
    wallets.push({
      name: 'phantom',
      label: 'Phantom',
      icon: 'https://187760183-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2F-MVOiF6Zqit57q_hxJYp%2Fuploads%2FHEjleywo9QOnfYebBPCZ%2FPhantom_SVG_Icon.svg?alt=media&token=71b80a0a-def7-4f98-ae70-5e0843fdaaec',
    });
  }
  
  // Check for Solflare
  //
  if (window.solflare?.isSolflare) {
    wallets.push({
      name: 'solflare',
      label: 'Solflare',
      icon: 'https://www.solflare.com/wp-content/uploads/2024/11/App-Icon.svg',
    });
  }
  
  return wallets;
}

// Generate a unique ID from the wallet address
export const generateWalletId = (publicKey: string): string => {
  return publicKey.substring(0, 8);
}; 