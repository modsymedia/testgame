import { useState, useEffect, useCallback } from 'react';
import { pointsManager, PointTransaction, PointSource, PointOperation } from '../lib/points-manager';
import { dbService } from '../lib/database-service';

interface UsePointsOptions {
  walletAddress?: string;
  autoFetch?: boolean;
}

interface PointsData {
  points: number;
  dailyPoints: number;
  multiplier: number;
  streak: number;
  daysActive: number;
  lastUpdate: Date | null;
  recentGain: number;
}

export function usePoints(options: UsePointsOptions = {}) {
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Function to fetch points data
  const fetchPointsData = useCallback(async (address?: string) => {
    const walletToUse = address || options.walletAddress;
    if (!walletToUse) {
      setError('No wallet address provided');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const data = await pointsManager.getUserPointsData(walletToUse);
      
      // Store in localStorage as backup
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`points_data:${walletToUse}`, JSON.stringify({
            data,
            timestamp: Date.now()
          }));
        } catch (err) {
          console.error('Error caching points data:', err);
        }
      }
      
      setPointsData(data);
      
      // Get transaction history
      const transactionHistory = pointsManager.getTransactionHistory(walletToUse);
      setHistory(transactionHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch points data');
      console.error('Error fetching points data:', err);
      
      // Try to load from localStorage as fallback
      if (typeof window !== 'undefined') {
        try {
          const cachedData = localStorage.getItem(`points_data:${walletToUse}`);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            if (parsed.data) {
              setPointsData(parsed.data);
              setError('Using cached data due to fetch error');
            }
          }
        } catch (cacheErr) {
          console.error('Error loading cached points data:', cacheErr);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [options.walletAddress]);
  
  // Award points
  const awardPoints = useCallback(async (
    walletAddress: string,
    amount: number,
    source: PointSource,
    operation: PointOperation = 'earn',
    metadata: Record<string, any> = {}
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await pointsManager.awardPoints(
        walletAddress,
        amount,
        source,
        operation,
        metadata
      );
      
      if (result.success) {
        // Refresh points data
        await fetchPointsData(walletAddress);
      }
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to award points');
      console.error('Error awarding points:', err);
      return {
        success: false,
        points: 0,
        total: 0,
        multiplier: 1.0
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPointsData]);
  
  // Deduct points
  const deductPoints = useCallback(async (
    walletAddress: string,
    amount: number,
    source: PointSource,
    metadata: Record<string, any> = {}
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await pointsManager.deductPoints(
        walletAddress,
        amount,
        source,
        metadata
      );
      
      if (result.success) {
        // Refresh points data
        await fetchPointsData(walletAddress);
      }
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to deduct points');
      console.error('Error deducting points:', err);
      return {
        success: false,
        points: 0,
        total: 0
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPointsData]);
  
  // Award daily bonus
  const awardDailyBonus = useCallback(async (walletAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await pointsManager.awardDailyBonus(walletAddress);
      
      if (result.success) {
        // Refresh points data
        await fetchPointsData(walletAddress);
      }
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to award daily bonus');
      console.error('Error awarding daily bonus:', err);
      return {
        success: false,
        points: 0,
        total: 0,
        daysActive: 0,
        streak: 0
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPointsData]);
  
  // Award achievement
  const awardAchievement = useCallback(async (
    walletAddress: string,
    achievementId: string,
    metadata: Record<string, any> = {}
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await pointsManager.awardAchievement(
        walletAddress,
        achievementId,
        metadata
      );
      
      if (result.success) {
        // Refresh points data
        await fetchPointsData(walletAddress);
      }
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to award achievement');
      console.error('Error awarding achievement:', err);
      return {
        success: false,
        points: 0,
        total: 0
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPointsData]);
  
  // Award gameplay points
  const awardGameplayPoints = useCallback(async (
    walletAddress: string,
    score: number,
    metadata: Record<string, any> = {}
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await pointsManager.awardGameplayPoints(
        walletAddress,
        score,
        metadata
      );
      
      if (result.success) {
        // Refresh points data
        await fetchPointsData(walletAddress);
      }
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to award gameplay points');
      console.error('Error awarding gameplay points:', err);
      return {
        success: false,
        points: 0,
        total: 0
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPointsData]);
  
  // Award interaction points
  const awardInteractionPoints = useCallback(async (
    walletAddress: string,
    interactionType: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const result = await pointsManager.awardInteractionPoints(
        walletAddress,
        interactionType
      );
      
      if (result.success) {
        // Refresh points data
        await fetchPointsData(walletAddress);
      }
      
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to award interaction points');
      console.error('Error awarding interaction points:', err);
      return {
        success: false,
        points: 0,
        total: 0
      };
    } finally {
      setIsLoading(false);
    }
  }, [fetchPointsData]);
  
  // Initial fetch
  useEffect(() => {
    if (options.walletAddress && options.autoFetch !== false) {
      fetchPointsData(options.walletAddress);
    }
  }, [options.walletAddress, options.autoFetch, fetchPointsData]);

  // Subscribe to changes
  useEffect(() => {
    if (!options.walletAddress) return;
    
    // Subscribe directly to point transactions
    const unsubscribePoints = pointsManager.onTransaction((tx) => {
      if (tx.walletAddress === options.walletAddress) {
        fetchPointsData(options.walletAddress);
      }
    });
    
    // Also subscribe to database changes for the user
    const unsubscribeDB = dbService.subscribeToChanges('user', (data: any) => {
      if (data.walletAddress === options.walletAddress) {
        fetchPointsData(options.walletAddress);
      }
    });
    
    return () => {
      unsubscribePoints();
      unsubscribeDB();
    };
  }, [options.walletAddress, fetchPointsData]);
  
  return {
    pointsData,
    history,
    isLoading,
    error,
    fetchPointsData,
    awardPoints,
    deductPoints,
    awardDailyBonus,
    awardAchievement,
    awardGameplayPoints,
    awardInteractionPoints
  };
} 