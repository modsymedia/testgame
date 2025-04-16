"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useWallet } from './WalletContext';
import { DatabaseService } from '@/lib/database-service';
import { PointsManager } from '@/lib/points-manager';
import { fetchUserRank } from '@/utils/leaderboard';
import { debounce } from 'lodash';

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
  lastSync: 0,
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

// Get instances of services
const dbService = DatabaseService.instance;
const pointsManagerInstance = PointsManager.instance;

// Provider component
export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { publicKey, isConnected } = useWallet();
  const [userData, setUserData] = useState<UserData>(defaultUserData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncInterval, setSyncInterval] = useState<NodeJS.Timeout | null>(null);
  
  // Memoize the syncWithServer function
  const syncWithServer = useCallback(async () => {
    if (!publicKey || !isConnected) return;

    console.log('Syncing with server...');
    const success = await dbService.synchronize();

    if (success) {
      console.log('Sync completed successfully');
      try {
        const { userData: serverData, rank } = await fetchUserRank(publicKey);
        if (serverData) {
          setUserData(prev => ({ 
              ...prev, 
              ...serverData, 
              rank: rank,
              lastSync: Date.now() // Update timestamp on successful fetch
          }));
        }
      } catch (fetchErr) {
        console.error('Error refetching data after sync:', fetchErr);
      }
    } else {
      console.warn('Sync failed');
    }
  }, [publicKey, isConnected]);
  
  // Debounced version of sync function
  const debouncedSync = useCallback(debounce(syncWithServer, 5000), [syncWithServer]);

  // Load initial user data
  useEffect(() => {
    if (publicKey && isConnected) {
      setIsLoading(true);
      
      const loadInitialUserData = async () => {
        try {
          console.log('Loading initial user data for identifier:', publicKey);
          // Use fetchUserRank to get initial data including rank
          const { success, userData: serverData, rank, message } = await fetchUserRank(publicKey);
          
          if (success && serverData) {
            console.log('UserDataContext - Server data loaded via fetchUserRank:', serverData);
            setUserData(prevData => ({
              ...prevData,
              ...serverData,
              rank: rank, // Make sure rank is included
              lastSync: Date.now()
            }));
          } else {
            console.log('UserDataContext - No server data found via fetchUserRank, creating default local state.', message);
            const defaultWithPotentialUid = {
              ...defaultUserData,
              uid: `temp_${publicKey}` 
            };
            setUserData(defaultWithPotentialUid);
          }
        } catch (err) {
          console.error('Error loading initial user data via fetchUserRank:', err);
          setError('Failed to load user data');
          // Set default state even on error
          setUserData(defaultUserData);
        } finally {
          setIsLoading(false);
        }
      };
      
      loadInitialUserData();
      
      // Set up interval to *trigger* the debounced sync check
      const interval = setInterval(() => {
        debouncedSync(); 
      }, 30000); // Check every 30 seconds if a sync is needed
      
      setSyncInterval(interval);
      
      return () => {
        if (interval) clearInterval(interval);
        debouncedSync.cancel(); // Cancel pending debounced calls on unmount
      };
    } else {
      // Reset state when disconnected
      setUserData(defaultUserData);
      setIsLoading(false);
      if (syncInterval) {
        clearInterval(syncInterval);
        setSyncInterval(null);
      }
    }
  }, [isConnected, publicKey, debouncedSync]);

  // Function that uses pointsManager to execute operations correctly
  const executePointsManagerOperation = async (operation: string, ...args: any[]): Promise<any> => {
    try {
      // Use the correctly instantiated pointsManagerInstance
      if (typeof pointsManagerInstance[operation as keyof PointsManager] === 'function') {
        return await (pointsManagerInstance as any)[operation](...args);
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
    
    // Get the current UID from state
    const currentUid = userData.uid;
    if (!currentUid) {
        console.error('Cannot update username: UID not found in user data state.');
        setError('User identifier missing, cannot update username.');
        return false;
    }

    // Optimistic update
    setUserData(prevData => ({
      ...prevData,
      username: username
    }));
    
    try {
      // Call the updated service function using UID
      const success = await dbService.updateUserData(currentUid, { username: username });
      
      if (success) {
        console.log('Username updated successfully');
        // Optionally trigger a sync or rely on periodic sync
        debouncedSync(); 
        return true;
      } else {
        console.error('Failed to update username on server');
        setError('Failed to save username');
        // Revert optimistic update
        setUserData(prevData => ({
          ...prevData,
          username: userData.username // Revert to original username from state before optimistic update
        }));
        return false;
      }
    } catch (err) {
      console.error('Error updating username:', err);
      setError('Error saving username');
      // Revert optimistic update
      setUserData(prevData => ({
        ...prevData,
        username: userData.username // Revert
      }));
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
    // Get UID from state
    const currentUid = userData.uid;
    if (!currentUid) {
      console.error('Cannot update unlocked items: UID not found in user data state.');
      setError('User identifier missing, cannot update items.');
      return;
    }
    
    // Optimistically update local state
    setUserData(prev => ({ ...prev, unlockedItems: { ...(prev.unlockedItems || {}), ...newItems } }));
    
    try {
      // Save to database using UID
      const success = await dbService.updateUserData(currentUid, { unlockedItems: newItems });
      if (!success) {
          throw new Error('Server update failed');
      }
      console.log('Unlocked items saved successfully for UID:', currentUid);
      debouncedSync(); // Trigger sync
    } catch (error) {
      console.error("Failed to save unlocked items:", error);
      // Optionally revert local state or show error
      // Reverting requires storing previous state before optimistic update
      setError('Failed to save item unlock status.');
    }
  };

  // Function to handle online/offline status changes
  const handleOnlineStatusChange = () => {
    if (navigator.onLine) {
      console.log('Network status changed: Online');
      // Try syncing immediately when back online
      debouncedSync();
    } else {
      console.log('Network status changed: Offline');
    }
  };
  
  // Function to handle page visibility changes
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      // Optional: Consider if sync is needed when tab becomes hidden
      // debouncedSync();
    } else if (document.visibilityState === 'visible') {
      // Optional: Trigger sync when tab becomes visible again if needed
      // debouncedSync();
    }
  };

  // Effect to add/remove network and visibility listeners
  useEffect(() => {
    window.addEventListener('online', handleOnlineStatusChange);
    window.addEventListener('offline', handleOnlineStatusChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('online', handleOnlineStatusChange);
      window.removeEventListener('offline', handleOnlineStatusChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      // Clean up interval when provider unmounts
      if (syncInterval) {
        clearInterval(syncInterval);
      }
    };
  }, [syncInterval, debouncedSync]); // Add debouncedSync to dependencies

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