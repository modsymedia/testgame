"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useWallet } from './WalletContext';
import { dbService } from '@/lib/database-service';
import { pointsManager } from '@/lib/points-manager';

// Types for user data
interface UserData {
  points: number;
  claimedPoints: number;
  multiplier: number;
  rank: number | null;
  referralCode: string | null;
  referralCount: number;
  lastLogin: number;
  lastSync: number;
  username: string | null;
}

// Default user data
const defaultUserData: UserData = {
  points: 0,
  claimedPoints: 0,
  multiplier: 1.0,
  rank: null,
  referralCode: null,
  referralCount: 0,
  lastLogin: Date.now(),
  lastSync: Date.now(),
  username: null
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
  getReferralData: () => Promise<{
    referralCode: string | null;
    referralCount: number;
    totalEarned: number;
  }>;
  validateReferralCode: (code: string) => Promise<{
    valid: boolean;
    referrerWalletAddress?: string;
    pointsAwarded?: number;
  }>;
}

// Create the context
const UserDataContext = createContext<UserDataContextType | undefined>(undefined);

// Provider component
export function UserDataProvider({ children }: { children: React.ReactNode }) {
  const { isConnected, publicKey, disconnect } = useWallet();
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
            referralCount: serverData.referralCount || prevData.referralCount,
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
      // Fetch user data from database service
      const walletData = await dbService.getWalletByPublicKey(publicKey);
      
      if (walletData) {
        console.log('Wallet data found:', JSON.stringify(walletData, null, 2));
        setUserData({
          points: walletData.points || 0,
          claimedPoints: walletData.claimedPoints || 0,
          multiplier: walletData.multiplier || 1.0,
          rank: walletData.rank || null,
          referralCode: walletData.referralCode || null,
          referralCount: walletData.referralCount || 0,
          lastLogin: walletData.lastLogin || Date.now(),
          lastSync: Date.now(),
          username: walletData.username || null
        });
      } else {
        console.log('No wallet data found, creating new wallet');
        // Create new user data if it doesn't exist
        try {
          await dbService.createWallet(publicKey);
          setUserData({
            ...defaultUserData,
            lastSync: Date.now()
          });
        } catch (createErr) {
          console.error('Failed to create new wallet:', createErr);
          // Still set default data even if creation fails
          setUserData({
            ...defaultUserData,
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
        lastSync: Date.now()
      });
      setError('Failed to load user data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Update points
  const updatePoints = async (newPoints: number): Promise<boolean> => {
    if (!publicKey || !isConnected) return false;
    
    try {
      // Update points locally first for immediate feedback
      setUserData(prevData => ({
        ...prevData,
        points: newPoints
      }));
      
      // Try to update points on server with retry mechanism
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      
      const attemptServerUpdate = async (): Promise<boolean> => {
        try {
          await pointsManager.updatePoints(publicKey, newPoints);
          return true;
        } catch (serverError) {
          console.warn(`Server update attempt ${retries + 1} failed:`, serverError);
          return false;
        }
      };
      
      // First attempt
      success = await attemptServerUpdate();
      
      // If failed, retry with increasing delays
      while (!success && retries < maxRetries) {
        retries++;
        const delay = Math.min(1000 * Math.pow(2, retries), 10000); // Exponential backoff (max 10s)
        
        console.log(`Retrying points update in ${delay/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        success = await attemptServerUpdate();
      }
      
      if (!success) {
        // If all retries failed, store in pending updates
        console.warn('All server update attempts failed. Storing update for later sync.');
        
        // Store the failed update in localStorage for later sync
        try {
          const pendingUpdates = JSON.parse(localStorage.getItem('pendingPointsUpdates') || '[]');
          pendingUpdates.push({
            walletAddress: publicKey,
            points: newPoints,
            timestamp: Date.now()
          });
          localStorage.setItem('pendingPointsUpdates', JSON.stringify(pendingUpdates));
        } catch (e) {
          console.error('Failed to store pending update:', e);
        }
      }
      
      // Update last sync time regardless of server success
      // Client has the latest data even if server update failed
      setUserData(prevData => ({
        ...prevData,
        lastSync: Date.now()
      }));
      
      return true; // Return true because the local update succeeded
    } catch (err) {
      console.error('Failed to update points:', err);
      setError('Failed to update points. Please try again.');
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
      
      // Try to update on server
      try {
        await pointsManager.claimPoints(publicKey, amount);
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

  // Get referral data
  const getReferralData = async () => {
    if (!publicKey || !isConnected) {
      return {
        referralCode: null,
        referralCount: 0,
        totalEarned: 0
      };
    }
    
    try {
      // Get referral data from points manager
      return await pointsManager.getReferralData(publicKey);
    } catch (err) {
      console.error('Failed to get referral data:', err);
      setError('Failed to get referral data. Please try again.');
      return {
        referralCode: userData.referralCode,
        referralCount: userData.referralCount,
        totalEarned: 0
      };
    }
  };

  // Validate a referral code
  const validateReferralCode = async (code: string) => {
    if (!publicKey || !isConnected) {
      return { valid: false };
    }
    
    try {
      // Validate referral code using points manager
      return await pointsManager.validateReferralCode(code, publicKey);
    } catch (err) {
      console.error('Failed to validate referral code:', err);
      setError('Failed to validate referral code. Please try again.');
      return { valid: false };
    }
  };

  // Reset user data
  const resetUserData = () => {
    setUserData(defaultUserData);
    setError(null);
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
        getReferralData,
        validateReferralCode
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