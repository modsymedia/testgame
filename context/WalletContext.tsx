"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  getProvider, 
  saveWalletData, 
  getAvailableWallets
} from '@/utils/wallet';
import { fetchUserRank } from '@/utils/leaderboard';

interface WalletContextType {
  isConnected: boolean;
  publicKey: string | null;
  walletData: any;
  connect: (walletName?: string) => Promise<boolean>;
  disconnect: () => void;
  updatePoints: (points: number) => Promise<number | undefined>;
  burnPoints: () => Promise<number | undefined>;
  error: string | null;
  isNewUser: boolean;
  showPetNamePrompt: boolean;
  setUsername: (username: string) => Promise<boolean>;
  availableWallets: Array<{name: string, label: string, icon: string}>;
  currentWalletName: string | null;
}

const defaultContext: WalletContextType = {
  isConnected: false,
  publicKey: null,
  walletData: null,
  connect: async () => false,
  disconnect: () => {},
  updatePoints: async () => undefined,
  burnPoints: async () => undefined,
  error: null,
  isNewUser: false,
  showPetNamePrompt: false,
  setUsername: async () => false,
  availableWallets: [],
  currentWalletName: null
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
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showPetNamePrompt, setShowPetNamePrompt] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<Array<{name: string, label: string, icon: string}>>([]);
  const [currentWalletName, setCurrentWalletName] = useState<string | null>(null);

  // Check for global trigger to show pet name prompt (for testing)
  useEffect(() => {
    // Check every second for the global trigger
    const intervalId = setInterval(() => {
      //  - check for global trigger
      if (typeof window !== 'undefined' && (window as any).__forceShowPetNamePrompt) {
        console.log('Detected global trigger to show pet name prompt');
        setShowPetNamePrompt(true);
        //  - reset the trigger
        (window as any).__forceShowPetNamePrompt = false;
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Safe connect wrapper
  const safeConnect = async (provider: any): Promise<any> => {
    if (!provider) return null;
    
    console.log('Attempting to connect with provider:', 
      provider.isPhantom ? 'Phantom' : 
      provider.isSolflare ? 'Solflare' : 
      'Unknown wallet');
    
    // Make sure provider.connect exists and is a function
    if (typeof provider.connect !== 'function') {
      console.error('Provider.connect is not a function');
      throw new Error('Wallet provider is missing connect method');
    }
    
    try {
      // Call connect and handle both promise and non-promise returns
      const response = await provider.connect();
      console.log('Wallet connect response:', response);
      
      // Some wallets may update the provider object itself rather than return data
      if (!response || typeof response !== 'object') {
        console.log('No direct response object, checking if provider was updated');
        // Return the provider itself, which might have been updated with the public key
        return provider.publicKey ? { publicKey: provider.publicKey } : null;
      }
      
      return response;
    } catch (error) {
      console.error('Error in safeConnect:', error);
      throw error; // Re-throw the error for the caller to handle
    }
  };

  // Safe disconnect wrapper
  const safeDisconnect = async (provider: any): Promise<void> => {
    if (!provider) return;
    
    // Make sure provider.disconnect exists and is a function
    if (typeof provider.disconnect !== 'function') {
      console.error('Provider.disconnect is not a function');
      return; // Just return instead of throwing
    }
    
    try {
      await provider.disconnect();
    } catch (error) {
      console.error('Error in safeDisconnect:', error);
      // Swallow the error but log it
    }
  };

  useEffect(() => {
    // Check for available wallets
    if (typeof window !== 'undefined') {
      const wallets = getAvailableWallets();
      setAvailableWallets(wallets);
    }

    // Check if wallet was previously connected
    const checkConnection = async () => {
      try {
        const provider = getProvider();
        if (provider && provider.isConnected && provider.publicKey) {
          setIsConnected(true);
          const key = provider.publicKey.toString();
          setPublicKey(key);
          
          // Set the current wallet name
          if ((provider as any).isPhantom) {
            setCurrentWalletName('phantom');
          } else if ((provider as any).isSolflare) {
            setCurrentWalletName('solflare');
          }
          
          try {
            // Only fetch data from server, not local storage
            try {
              const serverData = await fetchUserRank(key);
              if (serverData.success && serverData.userData) {
                console.log('Loaded wallet data from server:', serverData.userData);
                console.log('👤 Username from server data:', serverData.userData.username);
                
                // Use server data exclusively
                const userData = {
                  username: serverData.userData.username || `User_${key.substring(0, 4)}`,
                  points: serverData.userData.points || 0,
                  multiplier: serverData.userData.multiplier || 1.0,
                  lastLogin: Date.now(),
                  daysActive: serverData.userData.daysActive || 0,
                  consecutiveDays: serverData.userData.consecutiveDays || 0,
                  petStats: {
                    ...(serverData.userData.petState ? {
                      food: serverData.userData.petState.hunger || 50,
                      happiness: serverData.userData.petState.happiness || 40,
                      cleanliness: serverData.userData.petState.cleanliness || 40,
                      energy: serverData.userData.petState.energy || 30,
                      health: serverData.userData.petState.health || 30,
                      isDead: serverData.userData.petState.isDead || false,
                      points: serverData.userData.points || 0
                    } : {
                      food: 50,
                      happiness: 40,
                      cleanliness: 40,
                      energy: 30,
                      health: 30,
                      isDead: false,
                      points: 0
                    })
                  }
                };
                
                setWalletData(userData);
              } else {
                // If no server data, initialize with default data
                const defaultData = {
                  username: `User_${key.substring(0, 4)}`,
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
                  }
                };
                
                // Save default data to server
                await saveWalletData(key, defaultData);
                
                setWalletData(defaultData);
              }
            } catch (serverErr) {
              console.error('Error fetching server data:', serverErr);
              
              // Use minimal default data if server fails
              const defaultData = {
                username: `User_${key.substring(0, 4)}`,
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
                }
              };
              
              setWalletData(defaultData);
            }
          } catch (err) {
            console.error('Error loading wallet data:', err);
            // Continue with connection even if data load fails
          }

          // Always show the pet name prompt on any wallet connection
          setShowPetNamePrompt(true);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkConnection();
    
    // Set up event listeners for wallet connection changes
    const handleConnect = async () => {
      try {
        const provider = getProvider();
        if (provider && provider.publicKey) {
          setIsConnected(true);
          const key = provider.publicKey.toString();
          setPublicKey(key);
          
          // Set the current wallet name
          if ((provider as any).isPhantom) {
            setCurrentWalletName('phantom');
          } else if ((provider as any).isSolflare) {
            setCurrentWalletName('solflare');
          }
          
          try {
            // Only fetch data from server, not local storage
            try {
              const serverData = await fetchUserRank(key);
              if (serverData.success && serverData.userData) {
                console.log('Loaded wallet data from server on connect event:', serverData.userData);
                
                // Use server data exclusively
                const userData = {
                  username: serverData.userData.username || `User_${key.substring(0, 4)}`,
                  points: serverData.userData.points || 0,
                  multiplier: serverData.userData.multiplier || 1.0,
                  lastLogin: Date.now(),
                  daysActive: serverData.userData.daysActive || 0,
                  consecutiveDays: serverData.userData.consecutiveDays || 0,
                  petStats: {
                    ...(serverData.userData.petState ? {
                      food: serverData.userData.petState.hunger || 50,
                      happiness: serverData.userData.petState.happiness || 40,
                      cleanliness: serverData.userData.petState.cleanliness || 40,
                      energy: serverData.userData.petState.energy || 30,
                      health: serverData.userData.petState.health || 30,
                      isDead: serverData.userData.petState.isDead || false,
                      points: serverData.userData.points || 0
                    } : {
                      food: 50,
                      happiness: 40,
                      cleanliness: 40,
                      energy: 30,
                      health: 30,
                      isDead: false,
                      points: 0
                    })
                  }
                };
                
                setWalletData(userData);
              } else {
                // Initialize with default data if no server data
                const defaultData = {
                  username: `User_${key.substring(0, 4)}`,
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
                  }
                };
                
                // Save default data to server
                await saveWalletData(key, defaultData);
                
                setWalletData(defaultData);
              }
            } catch (serverErr) {
              console.error('Error fetching server data on connect event:', serverErr);
              
              // Use minimal default data if server fails
              const defaultData = {
                username: `User_${key.substring(0, 4)}`,
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
                }
              };
              
              setWalletData(defaultData);
            }
          } catch (dataErr) {
            console.error('Error loading wallet data after connect:', dataErr);
            // Continue with default data if needed
          }

          // Always show the pet name prompt on connect event
          setShowPetNamePrompt(true);
        }
      } catch (error) {
        console.error('Error in connect handler:', error);
      }
    };
    
    const handleDisconnect = () => {
      try {
        setIsConnected(false);
        setPublicKey(null);
        setWalletData(null);
        setCurrentWalletName(null);
      } catch (error) {
        console.error('Error in disconnect handler:', error);
      }
    };
    
    // Add event listeners
    try {
      const provider = getProvider();
      if (provider) {
        provider.on('connect', handleConnect);
        provider.on('disconnect', handleDisconnect);
      }
    } catch (error) {
      console.error('Error setting up wallet event listeners:', error);
    }
    
    // No cleanup for now since we can't reliably remove listeners
    return () => {
      // Skip cleanup to avoid errors - the component will be unmounted anyway
      // This is a workaround since Phantom's API doesn't have a clean way to remove listeners
    };
  }, []);
  
  const connect = async (walletName?: string): Promise<boolean> => {
    setError(null); // Clear previous errors
    
    try {
      console.log(`Attempting to connect wallet: ${walletName || 'default'}`);
      const provider = getProvider(walletName);
      if (!provider) {
        const walletLabel = walletName 
          ? (walletName === 'phantom' ? 'Phantom' : 'Solflare') 
          : 'Solana';
        console.error(`${walletLabel} wallet provider not found`);
        setError(`${walletLabel} wallet not found. Please install it to continue.`);
        return false;
      }
      
      console.log('Provider found:', provider.isPhantom ? 'Phantom' : provider.isSolflare ? 'Solflare' : 'Unknown');
      
      // Check if the provider is responsive
      let isProviderResponsive = false;
      try {
        // Attempt to check if the extension is responsive
        if ((provider as any)['isPhantom'] || (provider as any)['isSolflare']) {
          isProviderResponsive = true;
        }
      } catch (error) {
        console.warn('Wallet provider is not responsive:', error);
        setError('Could not establish connection with wallet. Please refresh the page or restart your browser.');
        return false;
      }
      
      if (!isProviderResponsive) {
        setError('Could not establish connection with wallet. Please refresh the page or restart your browser.');
        return false;
      }
      
      // Save the wallet name we're connecting with
      if (walletName) {
        setCurrentWalletName(walletName);
      } else if ((provider as any).isPhantom) {
        setCurrentWalletName('phantom');
      } else if ((provider as any).isSolflare) {
        setCurrentWalletName('solflare');
      }
      
      // First try to disconnect safely
      try {
        if (provider.isConnected) {
          await safeDisconnect(provider);
          
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
        let resp;
        try {
          resp = await safeConnect(provider);
          if (!resp) {
            setError('Connection attempt returned null response');
            return false;
          }
        } catch (connectError: any) {
          console.error('Detailed connection error:', connectError);
          
          // Try to provide a more helpful error message
          if (connectError.message && connectError.message.includes('User rejected')) {
            setError('Connection rejected by user. Please try again.');
          } else {
            setError(`Wallet connection failed: ${connectError.message || 'Unknown error'}`);
          }
          return false;
        }
        
        // Different wallets return different response structures
        // For Solflare, the publicKey might be directly on the provider after connect
        let publicKeyValue;
        
        if (resp.publicKey) {
          // Phantom style response
          publicKeyValue = resp.publicKey;
        } else if (provider.publicKey) {
          // Solflare might update the provider directly
          publicKeyValue = provider.publicKey;
        }
        
        // Make sure we have a public key one way or another
        if (!publicKeyValue) {
          console.error('No public key found in response:', resp);
          console.error('Provider state after connect:', provider);
          setError('Connected but no public key was returned');
          return false;
        }
        
        const key = publicKeyValue.toString();
        
        // Wait a moment before updating state
        await new Promise(resolve => setTimeout(resolve, 300));
        
        setPublicKey(key);
        setIsConnected(true);
        
        // Once connected, load wallet data
        setIsLoading(true);
        
        try {
          // Only fetch data from server, not local storage
          try {
            const serverData = await fetchUserRank(key);
            if (serverData.success && serverData.userData) {
              console.log('Loaded wallet data from server after login:', serverData.userData);
              
              // Use server data exclusively, no localStorage
              const userData = {
                username: serverData.userData.username || `User_${key.substring(0, 4)}`,
                points: serverData.userData.points || 0,
                multiplier: serverData.userData.multiplier || 1.0,
                lastLogin: Date.now(),
                daysActive: serverData.userData.daysActive || 0,
                consecutiveDays: serverData.userData.consecutiveDays || 0,
                petStats: {
                  ...(serverData.userData.petState ? {
                    food: serverData.userData.petState.hunger || 50,
                    happiness: serverData.userData.petState.happiness || 40,
                    cleanliness: serverData.userData.petState.cleanliness || 40,
                    energy: serverData.userData.petState.energy || 30,
                    health: serverData.userData.petState.health || 30,
                    isDead: serverData.userData.petState.isDead || false,
                    points: serverData.userData.points || 0
                  } : {
                    food: 50,
                    happiness: 40,
                    cleanliness: 40,
                    energy: 30,
                    health: 30,
                    isDead: false,
                    points: 0
                  })
                }
              };
              
              setWalletData(userData);
              setIsNewUser(false);
            } else {
              console.log('No existing wallet data found, initializing with defaults');
              // Mark as new user so we can show pet name form
              setIsNewUser(true);
              const defaultData = {
                username: `User_${key.substring(0, 4)}`,
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
                }
              };
              
              setWalletData(defaultData);
              
              // Save the default data to the server
              await saveWalletData(key, defaultData);
            }
          } catch (serverError) {
            console.error('Error getting data from server:', serverError);
            // Set default values if server data loading fails
            setWalletData({
              username: `User_${key.substring(0, 4)}`,
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
              }
            });
          }
        } catch (dataError) {
          console.error('Error loading wallet data:', dataError);
          // Set default values if data loading fails
          setWalletData({
            username: `User_${key.substring(0, 4)}`,
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
            }
          });
        } finally {
          setIsLoading(false);
        }
        
        // After successful connection, set showPetNamePrompt to true for every login
        console.log("Connection successful - showing pet name prompt");
        setShowPetNamePrompt(true);
        
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
      const provider = getProvider(currentWalletName || undefined);
      if (provider) {
        safeDisconnect(provider);
        
        // Reset all state values
        setIsConnected(false);
        setPublicKey(null);
        setWalletData(null);
        setCurrentWalletName(null);
        
        // Clear any stored session data
        if (typeof window !== 'undefined') {
          // Remove the auto-connect session flag if it exists
          sessionStorage.removeItem('phantom_connected');
          localStorage.removeItem('phantom_last_connected');
          sessionStorage.removeItem('solflare_connected');
          localStorage.removeItem('solflare_last_connected');
        }
      }
    } catch (error: any) {
      setError(error?.message || 'Failed to disconnect wallet');
    }
  };
  
  const updatePoints = async (points: number) => {
    if (!publicKey || !walletData) return undefined;
    
    const updatedWalletData = {
      ...walletData,
      petStats: {
        ...walletData.petStats,
        points
      }
    };
    
    setWalletData(updatedWalletData);
    
    // Save updated data directly to server
    await saveWalletData(publicKey, updatedWalletData);
    
    return points;
  };
  
  const burnPoints = async () => {
    if (!publicKey || !walletData) return undefined;
    
    // Calculate remaining points (burn 50%)
    const currentPoints = walletData.petStats.points;
    const remainingPoints = Math.floor(currentPoints * 0.5);
    
    const updatedWalletData = {
      ...walletData,
      petStats: {
        ...walletData.petStats,
        points: remainingPoints
      }
    };
    
    setWalletData(updatedWalletData);
    
    // Save updated data
    const saved = await saveWalletData(publicKey, updatedWalletData);
    if (!saved) {
      console.warn('Failed to persist points burn to server, using memory storage');
    }
    
    return remainingPoints;
  };
  
  // Add function to set username for users
  const setUsername = async (username: string): Promise<boolean> => {
    if (!publicKey || !walletData) return false;
    
    console.log('👤 Setting username to:', username);
    
    try {
      // Use PUT endpoint specifically for username update
      const response = await fetch('/api/wallet', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey,
          action: 'setUsername',
          username: username
        }),
      });
      
      if (!response.ok) {
        console.warn('Failed to save username to server');
        return false;
      }
      
      // Update local state
      const updatedWalletData = {
        ...walletData,
        username: username
      };
      
      console.log('👤 Updated wallet data with new username:', updatedWalletData.username);
      setWalletData(updatedWalletData);
      
      // No longer a new user after completing setup
      setIsNewUser(false);
      
      // Dismiss the pet name prompt after successful update
      setShowPetNamePrompt(false);
      
      return true;
    } catch (error) {
      console.error('Error setting username:', error);
      return false;
    }
  };
  
  const value = {
    isConnected,
    publicKey,
    walletData,
    connect,
    disconnect,
    updatePoints,
    burnPoints,
    error,
    isNewUser,
    showPetNamePrompt,
    setUsername,
    availableWallets,
    currentWalletName
  };
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
} 