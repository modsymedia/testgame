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
  isLoading: boolean;
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
  isLoading: false,
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
      setIsLoading(true); // Start loading
      setError(null); // Clear previous errors
      setShowPetNamePrompt(false); // Reset prompt initially
      setIsNewUser(false); // Reset new user flag initially

      try {
        const provider = getProvider();
        if (provider && provider.isConnected && provider.publicKey) {
          const key = provider.publicKey.toString();
          console.log("Checking connection for key:", key);
          
          // Set connection state early
          setIsConnected(true);
          setPublicKey(key);

          // Set the current wallet name based on provider
          if ((provider as any).isPhantom) {
            setCurrentWalletName('phantom');
          } else if ((provider as any).isSolflare) {
            setCurrentWalletName('solflare');
          }

          try {
            // Fetch user data from server
            const serverData = await fetchUserRank(key);
            console.log("Server data fetched in checkConnection:", serverData);

            if (serverData.success && serverData.userData && serverData.userData.username) {
              // User exists and has a username
              console.log('Existing user found with username:', serverData.userData.username);
              const userData = {
                uid: serverData.userData.uid, // Assume backend returns UID
                username: serverData.userData.username,
                points: serverData.userData.points || 0,
                multiplier: serverData.userData.multiplier || 1.0,
                lastLogin: Date.now(),
                daysActive: serverData.userData.daysActive || 0,
                consecutiveDays: serverData.userData.consecutiveDays || 0,
                petStats: { // Map petState to petStats
                    food: serverData.userData.petState?.hunger ?? 50,
                    happiness: serverData.userData.petState?.happiness ?? 40,
                    cleanliness: serverData.userData.petState?.cleanliness ?? 40,
                    energy: serverData.userData.petState?.energy ?? 30,
                    health: serverData.userData.petState?.health ?? 30,
                    isDead: serverData.userData.petState?.isDead ?? false,
                    points: serverData.userData.points || 0 // Reuse main points? Check logic
                }
              };
              setWalletData(userData);
              setIsNewUser(false);
              setShowPetNamePrompt(false);
            } else {
              // New user or user without username
              console.log('New user or user without username detected.');
              setWalletData(null); // Clear any potentially stale data
              setIsNewUser(true);
              setShowPetNamePrompt(true);
              // Do not save default data here, wait for setUsername
            }
          } catch (fetchErr) {
            console.error('Error fetching user data during checkConnection:', fetchErr);
            setError('Failed to load user data. Please try again.');
            // Don't assume new user on fetch error, keep existing state but show error
            // Reset potentially problematic state
             setWalletData(null);
             setIsNewUser(false); // Uncertain state, don't force prompt
             setShowPetNamePrompt(false);
             // Keep isConnected true if provider connection succeeded
          }
        } else {
           console.log("No active provider connection found.");
           // Ensure disconnected state if no provider/key
           setIsConnected(false);
           setPublicKey(null);
           setWalletData(null);
           setCurrentWalletName(null);
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
        setError('An error occurred while checking wallet status.');
         // Reset all state on major error
         setIsConnected(false);
         setPublicKey(null);
         setWalletData(null);
         setCurrentWalletName(null);
         setIsNewUser(false);
         setShowPetNamePrompt(false);
      } finally {
        setIsLoading(false); // Stop loading
      }
    };

    checkConnection();
    
    // Setup event listeners (consider simplifying or moving logic)
    const provider = getProvider();
    let connectHandler: (() => void) | null = null;
    let disconnectHandler: (() => void) | null = null;

    if (provider) {
      connectHandler = () => {
        console.log("Wallet emitted 'connect' event. Re-checking connection state.");
        // Re-run checkConnection to handle state properly after external connect event
        checkConnection();
      };
      
      disconnectHandler = () => {
        console.log("Wallet emitted 'disconnect' event.");
        setError(null); // Clear errors on disconnect
        setIsConnected(false);
        setPublicKey(null);
        setWalletData(null);
        setCurrentWalletName(null);
        setIsNewUser(false);
        setShowPetNamePrompt(false);
        setIsLoading(false);
      };
      
      provider.on('connect', connectHandler);
      provider.on('disconnect', disconnectHandler);

      // Also listen for account changes
      provider.on('accountChanged', (newPublicKey: any) => {
         console.log("Wallet emitted 'accountChanged' event.");
         if (newPublicKey) {
            const key = newPublicKey.toString();
             if (key !== publicKey) {
                 console.log("Account changed to:", key);
                 // Treat account change like a new connection check
                 checkConnection();
             }
         } else {
             // If account changed to null/undefined, treat as disconnect
             if (disconnectHandler) {
                 disconnectHandler();
             }
         }
      });
    }

    return () => {
      if (provider) {
         if (connectHandler) provider.removeListener('connect', connectHandler);
         if (disconnectHandler) provider.removeListener('disconnect', disconnectHandler);
         // Assuming accountChanged listener removal is similar if needed
         // provider.removeListener('accountChanged', accountChangeHandler);
      }
    };
    // Only run on mount
  }, []); // <-- IMPORTANT: Empty dependency array ensures this runs only once
  
  const connect = async (walletName?: string): Promise<boolean> => {
    setError(null);
    setIsLoading(true);
    setShowPetNamePrompt(false); // Reset prompt
    setIsNewUser(false); // Reset flag

    try {
      console.log(`Attempting to connect wallet: ${walletName || 'default'}`);
      const provider = getProvider(walletName);
      if (!provider) {
        const walletLabel = walletName 
          ? (walletName === 'phantom' ? 'Phantom' : 'Solflare') 
          : 'Solana';
        console.error(`${walletLabel} wallet provider not found`);
        setError(`${walletLabel} wallet not found. Please install it to continue.`);
        setIsLoading(false);
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
        setIsLoading(false);
        return false;
      }
      
      if (!isProviderResponsive) {
        setError('Could not establish connection with wallet. Please refresh the page or restart your browser.');
        setIsLoading(false);
        return false;
      }
      
      // Set current wallet name
      if (walletName) {
        setCurrentWalletName(walletName);
      } else if ((provider as any).isPhantom) {
        setCurrentWalletName('phantom');
      } else if ((provider as any).isSolflare) {
        setCurrentWalletName('solflare');
      }
      
      // Attempt safe disconnect first
      try {
        if (provider.isConnected) {
            await safeDisconnect(provider);
            await new Promise(resolve => setTimeout(resolve, 500)); // Give time for disconnect
        }
      } catch (e) {
        console.warn('Error during pre-connect disconnect:', e);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Now try to connect with the wallet
      try {
        const resp = await safeConnect(provider);
        if (!resp) {
          setError('Connection attempt failed or was cancelled.');
          setIsLoading(false);
          return false;
        }

        const publicKeyValue = resp.publicKey || provider.publicKey;

        if (!publicKeyValue) {
          console.error('No public key found after connect attempt.');
          setError('Connected but no public key was returned.');
          setIsLoading(false);
          return false;
        }

        const key = publicKeyValue.toString();
        console.log("Wallet connected successfully with key:", key);

        // Update connection state
        setPublicKey(key);
        setIsConnected(true);

        // Once connected, load or check user data
        try {
          console.log("Fetching user data after successful connect...");
          const serverData = await fetchUserRank(key);
          console.log("Server data fetched in connect:", serverData);

          if (serverData.success && serverData.userData && serverData.userData.username) {
            // User exists and has a username
            console.log('Existing user found:', serverData.userData.username);
             const userData = {
                uid: serverData.userData.uid, // Assume backend returns UID
                username: serverData.userData.username,
                points: serverData.userData.points || 0,
                multiplier: serverData.userData.multiplier || 1.0,
                lastLogin: Date.now(),
                daysActive: serverData.userData.daysActive || 0,
                consecutiveDays: serverData.userData.consecutiveDays || 0,
                 petStats: { // Map petState to petStats
                    food: serverData.userData.petState?.hunger ?? 50,
                    happiness: serverData.userData.petState?.happiness ?? 40,
                    cleanliness: serverData.userData.petState?.cleanliness ?? 40,
                    energy: serverData.userData.petState?.energy ?? 30,
                    health: serverData.userData.petState?.health ?? 30,
                    isDead: serverData.userData.petState?.isDead ?? false,
                    points: serverData.userData.points || 0 // Reuse main points? Check logic
                }
              };
            setWalletData(userData);
            setIsNewUser(false);
            setShowPetNamePrompt(false);
          } else {
            // New user or user without username
            console.log('New user or user without username detected upon connect.');
            setWalletData(null); // Clear data
            setIsNewUser(true);
            setShowPetNamePrompt(true);
             // Do not save default data here
          }
        } catch (dataError) {
          console.error('Error loading wallet data after connect:', dataError);
          setError('Failed to load user data after connection. Please try refreshing.');
          // Don't assume new user on fetch error, keep existing state but show error
          setWalletData(null);
          setIsNewUser(false); // Uncertain state
          setShowPetNamePrompt(false);
          // Keep isConnected true
        }

        setIsLoading(false); // Stop loading after data fetch attempt
        return true; // Connection successful

      } catch (connError: any) {
        console.error('Wallet connection process failed:', connError);
         // Try to provide a more helpful error message
         if (connError.message && connError.message.includes('User rejected')) {
           setError('Connection rejected by user. Please try again.');
         } else {
           setError(`Wallet connection failed: ${connError.message || 'Unknown error'}`);
         }
        setIsConnected(false); // Ensure disconnected state on error
        setPublicKey(null);
        setWalletData(null);
        setCurrentWalletName(null);
        setIsLoading(false);
        return false;
      }
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      setError(error?.message || 'Failed to connect wallet');
      setIsLoading(false);
      return false;
    }
  };
  
  const disconnect = async () => {
    console.log("Disconnect triggered.");
    setError(null); // Clear errors
    const provider = getProvider(currentWalletName || undefined); // Get provider for current wallet
    if (provider) {
      try {
        await safeDisconnect(provider);
         console.log("Wallet disconnected via provider.");
      } catch (e) {
         console.error("Error during safe disconnect:", e);
         // Proceed with state reset even if provider disconnect fails
      }
    }
    // Reset state regardless of provider success/failure
    setIsConnected(false);
    setPublicKey(null);
    setWalletData(null);
    setCurrentWalletName(null);
    setIsNewUser(false);
    setShowPetNamePrompt(false);
    setIsLoading(false);
    console.log("Wallet context state reset.");
  };
  
  const updatePoints = async (points: number) => {
     if (!publicKey || !walletData) return undefined;
     try {
       // Assuming saveWalletData updates points and returns the new total/state
       const updatedData = { ...walletData, points: walletData.points + points };
       await saveWalletData(publicKey, updatedData); // Adjust payload as needed for backend
       setWalletData(updatedData);
       return updatedData.points;
     } catch (error) {
       console.error('Error updating points:', error);
       setError('Failed to update points.');
       return undefined;
     }
   };

   const burnPoints = async () => {
     if (!publicKey || !walletData) return undefined;
     try {
       // Assuming saveWalletData handles burning logic (e.g., sets points to 0)
       // You might need a specific backend endpoint like /api/burnPoints?publicKey=...
       const updatedData = { ...walletData, points: 0 }; // Example: Reset points locally
       await saveWalletData(publicKey, updatedData); // Adjust payload/endpoint if needed
       setWalletData(updatedData);
       return 0; // Return new points value
     } catch (error) {
       console.error('Error burning points:', error);
       setError('Failed to burn points.');
       return undefined;
     }
   };

  const setUsername = async (username: string): Promise<boolean> => {
    if (!publicKey) {
      setError("Cannot set username: Not connected.");
      return false;
    }
    // Basic validation (can be enhanced in the UI component)
    if (!username || username.trim().length < 4 || username.trim().length > 16 || username.startsWith(' ')) {
       setError("Invalid username. Must be 4-16 characters and not start with space.");
       return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`Attempting to set username '${username}' for key ${publicKey}`);
      
      // Prepare initial data for a new user, including the username
      // The backend should generate the UID and handle defaults for other fields
      const initialUserData = {
          username: username.trim(),
          // Include other fields the backend expects for initial creation, if any.
          // Example: points: 0, multiplier: 1.0, etc. - depends on saveWalletData needs.
          // DO NOT send a UID from the client.
      };

      // Call the backend to save the data (which should create the user profile)
      const saveResult = await saveWalletData(publicKey, initialUserData);
      console.log("Save wallet data result:", saveResult);

      // After saving, fetch the complete user data to get the UID and confirm state
       console.log("Refetching user data after setting username...");
      const serverData = await fetchUserRank(publicKey);
       console.log("Refetched server data:", serverData);


      if (serverData.success && serverData.userData && serverData.userData.username === username.trim()) {
         // Successfully created/updated and refetched
          const userData = {
            uid: serverData.userData.uid, // Get the UID from backend
            username: serverData.userData.username,
            points: serverData.userData.points || 0,
            multiplier: serverData.userData.multiplier || 1.0,
            lastLogin: Date.now(), // Update last login time
            daysActive: serverData.userData.daysActive || 1, // Start at day 1
            consecutiveDays: serverData.userData.consecutiveDays || 1,
            petStats: {
                food: serverData.userData.petState?.hunger ?? 50,
                happiness: serverData.userData.petState?.happiness ?? 40,
                cleanliness: serverData.userData.petState?.cleanliness ?? 40,
                energy: serverData.userData.petState?.energy ?? 30,
                health: serverData.userData.petState?.health ?? 30,
                isDead: serverData.userData.petState?.isDead ?? false,
                points: serverData.userData.points || 0
            }
          };
        setWalletData(userData);
        setIsNewUser(false);
        setShowPetNamePrompt(false);
        console.log("Username set successfully and user data updated.");
        setIsLoading(false);
        return true;
      } else {
        // Handle cases where save might have succeeded but fetch failed,
        // or username doesn't match (edge case)
        console.error("Failed to verify username update or fetch updated data.");
        setError("Failed to update profile. Please try again.");
        // Keep prompt open if verification failed
        setIsNewUser(true);
        setShowPetNamePrompt(true);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Error setting username:', error);
      setError('An error occurred while setting username.');
       // Keep prompt open on error
       setIsNewUser(true);
       setShowPetNamePrompt(true);
      setIsLoading(false);
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
    isLoading,
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