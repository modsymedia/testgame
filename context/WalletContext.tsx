"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useRouter } from 'next/navigation';
import { 
  getProvider, 
  saveWalletData, 
  // getAvailableWallets // Removed
} from '@/utils/wallet';
import { fetchUserRank } from '@/utils/leaderboard';
import { useSession, signOut } from 'next-auth/react';

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
  currentWalletName: string | null;
  isTwitterConnected: boolean;
  twitterDisconnect: () => void;
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
  currentWalletName: null,
  isTwitterConnected: false,
  twitterDisconnect: () => {},
};

const WalletContext = createContext<WalletContextType>(defaultContext);

export function useWallet() {
  return useContext(WalletContext);
}

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletData, setWalletData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);
  const [showPetNamePrompt, setShowPetNamePrompt] = useState(false);
  const [currentWalletName, setCurrentWalletName] = useState<string | null>(null);
  const [isTwitterConnected, setIsTwitterConnected] = useState(false);

  // Handle Twitter authentication
  useEffect(() => {
    if (status === 'authenticated' && session) {
      setIsTwitterConnected(true);
      
      // If we have a Twitter session but no wallet connection,
      // we can treat this as a different type of connection
      if (!isConnected) {
        // Twitter users might have a different ID format
        const twitterId = session.user?.id || '';
        if (twitterId) {
          // Create a "pseudo" public key for Twitter users
          const twitterPublicKey = `twitter-${twitterId}`;
          setPublicKey(twitterPublicKey);
          setIsConnected(true);
          
          // Fetch user data using this Twitter ID
          fetchDataForConnectedWallet(twitterPublicKey);
        }
      }
    } else {
      setIsTwitterConnected(false);
    }
  }, [status, session]);

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
    // This effect now primarily handles event listeners and initial state sync,
    // rather than constantly re-checking the connection status after initial connect.

    const provider = getProvider(currentWalletName || undefined);

    // Function to handle fetching data when connection is confirmed
    const handleConnectionEstablished = (key: string) => {
      console.log("Connection established, fetching data for key:", key);
      setIsConnected(true);
      setPublicKey(key);
      fetchDataForConnectedWallet(key); 
    };

    // Function to handle disconnection event or loss of connection
    const handleDisconnection = () => {
      console.log("Wallet disconnected or connection lost.");
      setError(null);
      setIsConnected(false);
      setPublicKey(null);
      setWalletData(null);
      setCurrentWalletName(null); // Reset wallet name on disconnect
      setIsNewUser(false);
      setShowPetNamePrompt(false);
      setIsLoading(false); 
    };

    // Initial check on mount or when provider might change (though publicKey is main driver)
    // We trust the state set by the `connect` function more now.
    if (isConnected && publicKey && provider?.publicKey?.toString() === publicKey) {
      console.log("useEffect: Already connected with key:", publicKey);
      // If already connected, ensure data is loaded (fetchData handles checks)
      fetchDataForConnectedWallet(publicKey);
    } else if (!isConnected && !publicKey) {
        // If context state is disconnected, ensure everything is reset
        // This case might be redundant if handleDisconnection is robust
        handleDisconnection();
    }

    // Setup event listeners
    let connectHandler: ((publicKey: PublicKey) => void) | null = null;
    let disconnectHandler: (() => void) | null = null;
    let accountChangedHandler: ((newPublicKey: PublicKey | null) => void) | null = null;

    if (provider) {
      // Listen for 'connect' event (might be triggered by auto-reconnect)
      connectHandler = (respPublicKey: PublicKey) => {
        if (respPublicKey) {
          const key = respPublicKey.toString();
          console.log("Wallet emitted 'connect' event with key:", key);
          // Check if this is a new connection or re-connect
          if (!isConnected || key !== publicKey) {
            handleConnectionEstablished(key);
          }
        } else {
            console.warn("Wallet emitted 'connect' event without public key.");
        }
      };

      // Listen for 'disconnect' event
      disconnectHandler = () => {
        console.log("Wallet emitted 'disconnect' event.");
        handleDisconnection();
      };

      // Listen for account changes
      accountChangedHandler = (newPublicKey: PublicKey | null) => {
        console.log("Wallet emitted 'accountChanged' event.");
        if (newPublicKey) {
          const key = newPublicKey.toString();
          if (key !== publicKey) {
            console.log("Account changed to:", key);
            // Treat account change like a new connection
            handleDisconnection(); // First disconnect the old state
            // Delay slightly before attempting new connection logic
            setTimeout(() => {
                // Attempt to connect with the new account implicitly?
                // Or trigger a manual reconnect? For now, just reset.
                // Re-running connect logic here might be complex.
                // Let's rely on the user re-initiating connection for now.
                console.log("Account changed, user may need to reconnect manually.");
            }, 500); 
          }
        } else {
          // Account changed to null/undefined, treat as disconnect
          console.log("Account changed to null/undefined.");
          handleDisconnection();
        }
      };

      provider.on('connect', connectHandler);
      provider.on('disconnect', disconnectHandler);
      provider.on('accountChanged', accountChangedHandler);
    }

    // Cleanup listeners
    return () => {
      if (provider) {
        if (connectHandler) provider.removeListener('connect', connectHandler);
        if (disconnectHandler) provider.removeListener('disconnect', disconnectHandler);
        if (accountChangedHandler) provider.removeListener('accountChanged', accountChangedHandler);
      }
    };
    // Rerun when the public key changes (indicating connect/disconnect)
    // Or when the specific wallet provider might change (less common)
  }, [publicKey, currentWalletName]); // Depend on publicKey and potentially currentWalletName
  
  // Function to fetch user data and update state
  const fetchDataForConnectedWallet = async (key: string) => {
    // Prevent fetching if no key
    if (!key) {
      console.warn("fetchDataForConnectedWallet called without a key.");
      return;
    }
    
    // Indicate loading state for data fetch part? Or assume connect already handles it?
    // setIsLoading(true); // Consider if needed here too

    try {
      console.log(`Fetching user data for key: ${key}`);
      const serverData = await fetchUserRank(key);
      console.log(`Server data fetched for ${key}:`, serverData);

      // Determine if the user is genuinely new or just lacks a custom username
      const userRecordExists = serverData.success;
      const hasCustomUsername = userRecordExists && serverData.userData && serverData.userData.username && !serverData.userData.username.startsWith('User_');
      const isTrulyNewUser = !userRecordExists && serverData.rank === 0 && serverData.userData === null;

      // Set isNewUser based *only* on whether the API confirmed the record doesn't exist
      setIsNewUser(isTrulyNewUser);

      if (userRecordExists && serverData.userData) {
        // --- User record exists ---
        console.log('Existing user record found. Updating local data.');
        const userData = {
          uid: serverData.userData.uid,
          username: serverData.userData.username,
          points: serverData.userData.points || 0,
          multiplier: serverData.userData.multiplier || 1.0,
          lastLogin: Date.now(),
          daysActive: serverData.userData.daysActive || 0,
          consecutiveDays: serverData.userData.consecutiveDays || 0,
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
        setWalletData(userData); // Update local state

        // Decide whether to show the username prompt
        if (!hasCustomUsername) {
          const hasExplicitlyChosen = localStorage.getItem(`hasChosenName_${key}`) === 'true';
          if (!hasExplicitlyChosen) {
            console.log('User has auto-generated name and has not chosen one, showing prompt.');
            setShowPetNamePrompt(true);
          } else {
            console.log('User has auto-generated name BUT has explicitly chosen one before, hiding prompt.');
            setShowPetNamePrompt(false);
          }
        } else {
          console.log('User has custom name, hiding prompt.');
          setShowPetNamePrompt(false);
        }
      } else if (isTrulyNewUser) {
        // --- User record does not exist (truly new) ---
        console.log('New user detected (no record found).');
        setWalletData(null); // Clear data, will be set after username submission
        setShowPetNamePrompt(true); // Always show for new users
        
        // Check if the user arrived via a referral code
        const hasReferralCode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('ref');
        if (hasReferralCode) {
          console.log('New user with referral code detected. Setting up a timer to redirect to default username flow...');
          // Set a timer to redirect to the UsernameModal on /console/gotchi if the modal doesn't appear
          // This ensures users with referral codes don't get stuck
          setTimeout(() => {
            // Get the current state values when the timer executes
            const isStillNew = isNewUser;
            const isStillConnected = isConnected;
            console.log('Timer fired for referral code redirection. isStillNew:', isStillNew, 'isStillConnected:', isStillConnected);
            
            if (isStillConnected) {
              console.log('Forcing redirect to /console/gotchi for user with referral code');
              // Use a more robust approach by delaying the router push slightly
              setTimeout(() => router.push('/console/gotchi'), 100);
            }
          }, 5000); // Increase to 5 seconds to ensure modal has enough time to appear
        }
      } else {
        // --- Handle unexpected errors or missing data ---
        console.warn('Failed to fetch user data or data was incomplete, but user record might exist. Clearing local data.');
        setError('Could not load your profile data. Please try refreshing.');
        setWalletData(null);
        setShowPetNamePrompt(false);
      }
    } catch (dataError) {
      // --- Handle network/fetch errors ---
      console.error(`Error during fetchUserRank call for key ${key}:`, dataError);
      setError('Failed to communicate with the server. Please check your connection and refresh.');
      setWalletData(null); // Clear data on fetch error
      setIsNewUser(false); // Uncertain state
      setShowPetNamePrompt(false);
    } finally {
       // Consider if loading needs to be set false here if it was set true above
       // setIsLoading(false); 
    }
  };

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
        await fetchDataForConnectedWallet(key);

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
    
    // Handle Twitter logout if connected
    if (isTwitterConnected) {
      try {
        await signOut();
        console.log("Twitter session signed out.");
      } catch (e) {
        console.error("Error during Twitter sign out:", e);
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
    setIsTwitterConnected(false); // Always reset Twitter connection state
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
    // Basic validation
    if (!username || username.trim().length < 4 || username.trim().length > 16 || !/^[a-zA-Z0-9_]+$/.test(username.trim())) {
       setError("Invalid username. Must be 4-16 characters using only letters, numbers, or underscores.");
       return false;
    }

    setIsLoading(true);
    setError(null);
    const trimmedUsername = username.trim();

    try {
      console.log(`Attempting to set username '${trimmedUsername}' for key ${publicKey}`);
      
      // Prepare data to send to the save endpoint
      // Send only the username; the backend handles the rest (UID, defaults)
      const userDataToSave = {
          username: trimmedUsername,
          // Explicitly include default pet stats if needed by saveWalletData/API
          petStats: {
              food: 50,
              happiness: 40,
              cleanliness: 40,
              energy: 30,
              health: 30,
              isDead: false,
              points: 0 // Start points at 0
          }
      };

      // Call the backend to save the data (creates user if new, updates if existing)
      const saveSuccess = await saveWalletData(publicKey, userDataToSave);
      console.log("Save wallet data result:", saveSuccess);

      if (saveSuccess) {
         // --- Optimistic Update --- 
         // Assume save worked, update local state immediately
         console.log("Save successful, optimistically updating local state.");
         
         // Update local walletData state
         // Use existing data if available, otherwise create new structure
         setWalletData((prevData: any) => ({
           ...prevData, // Keep existing fields like UID if they were fetched before
           username: trimmedUsername,
           points: prevData?.points ?? 0, // Keep existing points or default to 0
           multiplier: prevData?.multiplier ?? 1.0,
           lastLogin: Date.now(),
           daysActive: prevData?.daysActive ?? 1,
           consecutiveDays: prevData?.consecutiveDays ?? 1,
           // Update petStats based on defaults sent or existing if available
           petStats: {
             food: prevData?.petStats?.food ?? 50,
             happiness: prevData?.petStats?.happiness ?? 40,
             cleanliness: prevData?.petStats?.cleanliness ?? 40,
             energy: prevData?.petStats?.energy ?? 30,
             health: prevData?.petStats?.health ?? 30,
             isDead: prevData?.petStats?.isDead ?? false,
             points: prevData?.points ?? 0, // Reflect points in petStats too
           }
         }));

        // Mark as not a new user anymore & hide prompt
        setIsNewUser(false); 
        setShowPetNamePrompt(false);
        // Mark locally that name was chosen
        localStorage.setItem(`hasChosenName_${publicKey}`, 'true');

        console.log("Username set optimistically.");
        setIsLoading(false);
        
        // Use setTimeout to ensure the router navigation happens after state updates
        // This helps prevent navigation issues when state updates haven't been applied yet
        setTimeout(() => {
          console.log('WalletContext - Redirecting to /console/gotchi after username set');
          router.push('/console/gotchi');
        }, 100);
        
        return true; // Signal success to the modal
      } else {
        // Save operation failed according to saveWalletData
        console.error("saveWalletData returned false.");
        setError("Failed to save username to the server. Please try again.");
        // Keep prompt open if save failed
        setShowPetNamePrompt(true); 
        setIsLoading(false);
        return false; // Signal failure to the modal
      }
    } catch (error) {
      console.error('Error in setUsername function:', error);
      setError('An unexpected error occurred while setting username.');
       // Keep prompt open on error
       setShowPetNamePrompt(true); 
      setIsLoading(false);
      return false;
    }
  };
  
  // Add Twitter disconnect function
  const twitterDisconnect = async () => {
    try {
      await signOut();
      
      // Only reset context if not connected via wallet
      if (!currentWalletName) {
        setIsConnected(false);
        setPublicKey(null);
        setWalletData(null);
        setIsNewUser(false);
        setShowPetNamePrompt(false);
      }
      
      setIsTwitterConnected(false);
    } catch (error) {
      console.error('Error disconnecting from Twitter:', error);
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
    currentWalletName,
    isTwitterConnected,
    twitterDisconnect,
  };
  
  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
} 