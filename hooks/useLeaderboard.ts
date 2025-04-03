import { useState, useEffect, useCallback } from 'react';
import { LeaderboardEntry } from '../lib/models';
import { dbService } from '../lib/database-service';

interface UseLeaderboardOptions {
  type?: 'points' | 'score';
  limit?: number;
  autoFetch?: boolean;
}

// Define a utility function to convert database LeaderboardEntry to model LeaderboardEntry
function convertLeaderboardEntry(entry: any): LeaderboardEntry {
  return {
    walletAddress: entry.walletAddress,
    username: entry.username || undefined, // Convert null to undefined
    score: entry.score,
    rank: entry.rank,
    points: entry.score // If this is a points leaderboard, use score as points
  };
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const type = options.type || 'points';
      const limit = options.limit || 10;
      
      const data = await dbService.getLeaderboard(type, limit);
      // Convert db entries to model format
      const modelEntries = data.map(convertLeaderboardEntry);
      setLeaderboard(modelEntries);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      console.error('Error fetching leaderboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, [options.type, options.limit]);

  // Subscribe to leaderboard changes
  useEffect(() => {
    // Initial fetch
    if (options.autoFetch !== false) {
      fetchLeaderboard();
    }

    // Subscribe to leaderboard changes
    const unsubscribe = dbService.subscribeToChanges('leaderboard', () => {
      // Refresh leaderboard when data changes
      fetchLeaderboard();
    });

    return () => {
      unsubscribe();
    };
  }, [fetchLeaderboard, options.autoFetch]);

  return {
    leaderboard,
    isLoading,
    error,
    refresh: fetchLeaderboard
  };
} 