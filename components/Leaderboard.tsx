import React, { useState } from 'react';
import { useLeaderboard } from '../hooks/useLeaderboard';

interface LeaderboardProps {
  limit?: number;
  className?: string;
  currentWallet?: string;
}

export function Leaderboard({ limit = 10, className = '', currentWallet }: LeaderboardProps) {
  const [leaderboardType, setLeaderboardType] = useState<'points' | 'score'>('points');
  const { leaderboard, isLoading, error, refresh } = useLeaderboard({
    type: leaderboardType,
    limit,
    autoFetch: true
  });

  // Toggle between points and score
  const toggleLeaderboardType = () => {
    setLeaderboardType(prev => prev === 'points' ? 'score' : 'points');
  };

  return (
    <div className={`leaderboard-container ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Leaderboard</h2>
        <div className="flex gap-2">
          <button 
            onClick={toggleLeaderboardType}
            className="px-3 py-1 text-sm rounded bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
          >
            {leaderboardType === 'points' ? 'Show Scores' : 'Show Points'}
          </button>
          <button 
            onClick={refresh}
            className="px-3 py-1 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white"
          >
            Refresh
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-6">
          <p>Loading leaderboard...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-6 text-red-500">
          <p>Error loading leaderboard: {error}</p>
        </div>
      )}

      {!isLoading && !error && leaderboard.length === 0 && (
        <div className="text-center py-6">
          <p>No entries found</p>
        </div>
      )}

      {!isLoading && !error && leaderboard.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium">Rank</th>
                <th className="px-4 py-2 text-left text-sm font-medium">Player</th>
                <th className="px-4 py-2 text-right text-sm font-medium">
                  {leaderboardType === 'points' ? 'Points' : 'Score'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaderboard.map((entry) => {
                const isCurrentUser = currentWallet && entry.walletAddress === currentWallet;
                
                return (
                  <tr 
                    key={entry.walletAddress} 
                    className={`${isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm">
                      {entry.rank <= 3 ? (
                        <span className={`
                          inline-flex items-center justify-center w-6 h-6 rounded-full 
                          ${entry.rank === 1 ? 'bg-yellow-100 text-yellow-700' : 
                            entry.rank === 2 ? 'bg-gray-100 text-gray-700' : 
                            'bg-amber-100 text-amber-700'}
                        `}>
                          {entry.rank}
                        </span>
                      ) : (
                        entry.rank
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {entry.username || entry.walletAddress.substring(0, 6) + '...'}
                      {isCurrentUser && <span className="ml-2 text-xs text-blue-500">(You)</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      <span className="points-value">{entry.score}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 