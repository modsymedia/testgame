"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from './WalletContext';
import { dbService } from '@/lib/database-service';
import { PointsManager } from '@/lib/points-manager';
import { User } from '@/lib/models';

// Types for user data
interface UserData {
  points: number;
  claimedPoints: number;
  multiplier: number;
  rank: number | null;
  lastLogin: number;
  lastSync: number;
  username: string | null;
  uid: string | null;
  unlockedItems?: Record<string, boolean>;
}

// Default user data
const defaultUserData: UserData = {
  points: 0,
  claimedPoints: 0,
  multiplier: 1.0,
  rank: null,
  lastLogin: Date.now(),
  lastSync: Date.now(),
  username: null,
  uid: null,
  unlockedItems: {}
};

// Context types
interface UserDataContextType {
  userData: UserData;
  isLoading: boolean;
  error: string | null;
  updatePoints: (newPoints: number) => Promise<boolean>;
  syncWithServer: () => Promise<void>;
  claimPoints: (amount: number) => Promise<boolean>;
  updateUsername: (username: string) => Promise<boolean>;
  resetUserData: () => void;
  updateUnlockedItems: (newItems: Record<string, boolean>) => Promise<void>;
}

// Create the context
const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

// Provider component
export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, publicKey } = useWallet();
  const [userData, setUserData] = useState<UserData>(defaultUserData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Add a ref to track last sync time to prevent too frequent syncs
  const lastSyncTimeRef = useRef<number>(Date.now());
  const MIN_SYNC_INTERVAL = 10000; // Minimum 10 seconds between syncs
  
  // Add a ref to track pending sync status
  const isSyncingRef = useRef<boolean>(false);
  
  // Debounce sync requests
  const syncDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get instance of PointsManager
  const pointsManagerInstance = PointsManager.instance;

  // Memoize the syncWithServer function to prevent dependency cycle
  const syncWithServer = useCallback(async () => {
    if (!publicKey || !isConnected) return;
    
    // Prevent syncing if another sync is in progress or if we synced too recently
    const now = Date.now();
    if (isSyncingRef.current || now - lastSyncTimeRef.current < MIN_SYNC_INTERVAL) {
      return;
    }
    
    // Set syncing status
    isSyncingRef.current = true;
    
    try {
      console.log('Syncing with server...');
      
      // Process any pending updates first
      await dbService.processPendingPointsUpdates();
      
      // Then get the latest data from server
      const serverData = await dbService.getWalletByPublicKey(publicKey);
      
      if (serverData) {
        // Only update if server data is newer
        if (userData.points !== serverData.points) {
          setUserData(prevData => ({
            ...prevData,
            points: serverData.points || prevData.points,
            claimedPoints: serverData.claimedPoints || prevData.claimedPoints,
            multiplier: serverData.multiplier || prevData.multiplier,
            rank: serverData.rank || prevData.rank,
            lastSync: now
          }));
        } else {
          // Even if no changes, update the lastSync timestamp
          setUserData(prevData => ({
            ...prevData,
            lastSync: now
          }));
        }
        
        console.log('Sync completed successfully');
      }
      
      // Update last sync time
      lastSyncTimeRef.current = now;
    } catch (err) {
      console.error('Sync failed:', err);
      // Don't set error on silent syncs to avoid UI disruptions
    } finally {
      // Clear syncing status
      isSyncingRef.current = false;
    }
  }, [publicKey, isConnected, userData.points]);
  
  // Debounced version of sync function
  const debouncedSync = useCallback(() => {
    if (syncDebounceTimerRef.current) {
      clearTimeout(syncDebounceTimerRef.current);
    }
    
    syncDebounceTimerRef.current = setTimeout(() => {
      syncWithServer();
    }, 500); // 500ms debounce time
  }, [syncWithServer]);

  // Load initial user data
  useEffect(() => {
    if (isConnected && publicKey) {
      loadUserData();
      
      // Set up sync interval
      const interval = setInterval(() => {
        syncWithServer();
      }, 30000); // Sync every 30 seconds
      
      setSyncInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
      };
    } else {
      setUserData(defaultUserData);
      setIsLoading(false);
      if (syncInterval) {
        clearInterval(syncInterval);
        setSyncInterval(null);
      }
    }
  }, [isConnected, publicKey, syncWithServer]);

  // Load user data from server
  const loadUserData = async () => {
    if (!publicKey) return;
    
    setIsLoading(true);
    try {
      console.log('Attempting to load user data for wallet:', publicKey);
      // Fetch standard user data
      const walletData = await dbService.getWalletByPublicKey(publicKey);
      // Fetch custom user data (assuming unlockedItems are stored here)
      const customData = await dbService.getUserData(`user_data_${publicKey}`);
      
      if (walletData) {
        console.log('Wallet data found:', JSON.stringify(walletData, null, 2));
        setUserData({
          points: walletData.points || 0,
          claimedPoints: walletData.claimedPoints || 0,
          multiplier: walletData.multiplier || 1.0,
          rank: walletData.rank || null,
          lastLogin: walletData.lastLogin || Date.now(),
          lastSync: Date.now(),
          username: walletData.username || null,
          uid: walletData.uid || null,
          unlockedItems: customData?.unlockedItems || {}
        });
      } else {
        console.log('No wallet data found, creating new wallet');
        // Create new user data if it doesn't exist
        try {
          // Explicitly type newWallet as User | null
          const newWallet: User | null = await dbService.createWallet(publicKey);
          
          setUserData({
            ...defaultUserData,
            uid: newWallet?.uid || null,
            unlockedItems: {}
          });
          // Create initial custom data entry
          await dbService.saveUserData(publicKey, { unlockedItems: {} });
        } catch (createErr) {
          console.error('Failed to create new wallet:', createErr);
          // Still set default data even if creation fails
          setUserData({
            ...defaultUserData,
            unlockedItems: {},
            lastSync: Date.now()
          });
        }
      }
      setError(null);
    } catch (err) {
      console.error('Failed to load user data:', err);
      // Set default data even on error
      setUserData({
        ...defaultUserData,
        unlockedItems: {},
        lastSync: Date.now()
      });
      setError('Failed to load user data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Function that uses pointsManager to execute operations correctly - simplified
  const executePointsManagerOperation = async (operation: string, ...args: any[]): Promise<any> => {
    try {
      // Check if the operation exists on the pointsManager instance
      if (typeof pointsManagerInstance[operation as keyof typeof pointsManagerInstance] === 'function') {
        // Call the function with the provided arguments using any to avoid type conflicts
        return await (pointsManagerInstance[operation as any])(...args);
      } else {
        console.error(`The operation "${operation}" is not available on pointsManager`);
        return { success: false, error: `Operation not supported: ${operation}` };
      }
    } catch (error) {
      console.error(`Error executing pointsManager operation "${operation}":`, error);
      return { success: false, error };
    }
  };

  // Update points
  const updatePoints = async (newPoints: number): Promise<boolean> => {
    if (!publicKey || !isConnected) return false;
    
    try {
      // Store the current state before update for recovery
      // const previousPoints = userData.points; // Commented out as it's unused
      
      // Update points locally first for immediate feedback
      setUserData(prevData => ({
        ...prevData,
        points: newPoints,
        lastSync: Date.now()
      }));
      
      // Try to update points on server with retry mechanism
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      
      const attemptServerUpdate = async (): Promise<boolean> => {
        try {
          // Save a copy of the points we're about to update to localStorage for recovery
          if (typeof window !== 'undefined') {
            localStorage.setItem(`points_backup_${publicKey}`, JSON.stringify({
              points: newPoints,
              timestamp: Date.now()
            }));
          }
          
          // Calculate the difference to award
          const pointDifference = newPoints - userData.points;
          
          if (pointDifference !== 0) {
            // Use the appropriate method from pointsManagerInstance (awardPoints instead of updatePoints)
            // with operation 'earn' for positive or 'spend' for negative changes
            await pointsManagerInstance.awardPoints(
              publicKey,
              Math.abs(pointDifference),
              'interaction',
              pointDifference > 0 ? 'earn' : 'spend',
              { source: 'context-update' }
            );
          }
          
          return true;
        } catch (serverError) {
          console.warn(`Server update attempt ${retries + 1} failed:`, serverError);
          return false;
        }
      };
      
      // First attempt
      success = await attemptServerUpdate();
      
      // Retry if needed
      while (!success && retries < maxRetries) {
        retries++;
        console.log(`Retrying points update (attempt ${retries})...`);
        success = await attemptServerUpdate();
      }
      
      if (!success) {
        console.error('Failed to update points after multiple retries');
        
        // If we couldn't update the server, queue the update for later
        // and revert the UI to show correct points
        if (typeof window !== 'undefined') {
          const pendingUpdates = JSON.parse(localStorage.getItem('pendingPointsUpdates') || '[]');
          pendingUpdates.push({
            publicKey,
            points: newPoints,
            timestamp: Date.now()
          });
          localStorage.setItem('pendingPointsUpdates', JSON.stringify(pendingUpdates));
        }
        
        // Trigger a sync to try to resolve the issue
        debouncedSync();
        return false;
      }
      
      // Force a sync after successful update to ensure consistency
      setTimeout(() => {
        syncWithServer();
      }, 1000);
      
      return true;
    } catch (error) {
      console.error('Error updating points:', error);
      return false;
    }
  };

  // Claim points
  const claimPoints = async (amount: number): Promise<boolean> => {
    if (!publicKey || !isConnected) return false;
    
    try {
      // Check if enough points to claim
      if (userData.points < amount) {
        setError('Not enough points to claim');
        return false;
      }
      
      // Update local data first
      const newPoints = userData.points - amount;
      const newClaimedPoints = userData.claimedPoints + amount;
      
      setUserData(prevData => ({
        ...prevData,
        points: newPoints,
        claimedPoints: newClaimedPoints,
        lastSync: Date.now()
      }));
      
      // Try to update on server - use awardPoints with negative amount
      try {
        await executePointsManagerOperation('awardPoints', publicKey, amount, 'interaction', 'spend', { source: 'claim' });
      } catch (serverError) {
        console.error('Server claim failed but local state updated:', serverError);
        // We continue since local state is already updated
      }
      
      return true;
    } catch (err) {
      console.error('Failed to claim points:', err);
      setError('Failed to claim points. Please try again.');
      return false;
    }
  };

  // Update username
  const updateUsername = async (username: string): Promise<boolean> => {
    if (!publicKey || !isConnected) return false;
    
    try {
      // Update username on server
      await dbService.updateWallet(publicKey, { username: username });
      
      // Update local data
      setUserData(prevData => ({
        ...prevData,
        username: username,
        lastSync: Date.now()
      }));
      
      return true;
    } catch (err) {
      console.error('Failed to update username:', err);
      setError('Failed to update username. Please try again.');
      return false;
    }
  };

  // Reset user data
  const resetUserData = () => {
    setUserData(defaultUserData);
    setError(null);
  };

  // Add function to update unlocked items
  const updateUnlockedItems = async (newItems: Record<string, boolean>): Promise<void> => {
    if (!publicKey) return;
    
    // Optimistically update local state
    setUserData(prev => ({ ...prev, unlockedItems: newItems }));
    
    try {
      // Save to database
      await dbService.saveUserData(publicKey, { unlockedItems: newItems });
    } catch (error) {
      console.error("Failed to save unlocked items:", error);
      // Optionally revert local state or show error
      // For simplicity, we don't revert here but log the error.
      setError('Failed to save item unlock status.');
    }
  };

  // Handle online status changes with reduced logging
  useEffect(() => {
    // Define the event handler
    const handleOnlineStatusChange = () => {
      if (navigator.onLine) {
        // Only log this once when coming online, not repeatedly
        if (typeof window !== 'undefined' && !window.sessionStorage.getItem('logged_online_sync')) {
          console.log('🌐 App is online. Syncing pending updates...');
          window.sessionStorage.setItem('logged_online_sync', 'true');
        }
        debouncedSync();
      } else {
        console.log('📴 App is offline. Updates will be stored locally.');
        window.sessionStorage.removeItem('logged_online_sync');
      }
    };
    
    // Initial check
    handleOnlineStatusChange();
    
    // Add event listeners
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    
    // Also check visibility changes (when user tabs back to the app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        // Only sync if enough time has passed since last sync
        const now = Date.now();
        if (now - lastSyncTimeRef.current >= MIN_SYNC_INTERVAL) {
          debouncedSync();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Clean up
    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (syncDebounceTimerRef.current) {
        clearTimeout(syncDebounceTimerRef.current);
      }
    };
  }, [debouncedSync]);

  return (
    <UserDataContext.Provider
      value={{
        userData,
        isLoading,
        error,
        updatePoints,
        syncWithServer,
        claimPoints,
        updateUsername,
        resetUserData,
        updateUnlockedItems
      }}
    >
      {children}
    </UserDataContext.Provider>
  );
}

// Custom hook to use the user data context
export function useUserData() {
  const context = useContext(UserDataContext);
  
  if (context === undefined) {
    throw new Error('useUserData must be used within a UserDataProvider');
  }
  
  return context;
} 