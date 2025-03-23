import React, { useState, useEffect } from 'react';

interface PointsDisplayProps {
  walletAddress?: string;
}

interface PointsData {
  total: number;
  dailyEarned: number;
  dailyCap: number;
  weeklyEarned: number;
  multiplier: number;
  level: number;
}

export function PointsDisplay({ walletAddress }: PointsDisplayProps) {
  const [pointsData, setPointsData] = useState<PointsData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Don't fetch if no wallet address is provided
    if (!walletAddress) return;
    
    async function fetchPointsData() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/points?walletAddress=${walletAddress}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch points data');
        }
        
        setPointsData({
          total: data.totalPoints || 0,
          dailyEarned: data.dailyPoints || 0,
          dailyCap: data.dailyCap || 200,
          weeklyEarned: data.weeklyPoints || 0,
          multiplier: data.multiplier || 1,
          level: Math.floor((data.totalPoints || 0) / 1000) + 1
        });
      } catch (err) {
        console.error('Error fetching points data:', err);
        setError('Failed to load points data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchPointsData();
    
    // Refresh every 2 minutes
    const interval = setInterval(fetchPointsData, 2 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [walletAddress]);
  
  // Calculate percentage of daily cap reached
  const dailyCapPercentage = pointsData ? Math.min(100, (pointsData.dailyEarned / pointsData.dailyCap) * 100) : 0;
  
  if (!walletAddress) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Connect your wallet to view points
        </p>
      </div>
    );
  }
  
  if (loading && !pointsData) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center">Loading points data...</p>
      </div>
    );
  }
  
  if (error && !pointsData) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-red-300 dark:border-red-700">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-lg">Your GOCHI Points</h3>
        {pointsData && (
          <div className="text-sm bg-blue-100 dark:bg-blue-900 px-2 py-1 rounded-md">
            Level {pointsData.level}
          </div>
        )}
      </div>
      
      {/* Total Points Display */}
      {pointsData && (
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Points</p>
            <p className="text-4xl font-bold">{pointsData.total.toLocaleString()}</p>
          </div>
        </div>
      )}
      
      {/* Daily Points Progress */}
      {pointsData && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Daily Points: {pointsData.dailyEarned.toLocaleString()}</span>
            <span>Cap: {pointsData.dailyCap.toLocaleString()}</span>
          </div>
          
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-blue-600 h-2.5 rounded-full"
              style={{ width: `${dailyCapPercentage}%` }}
            ></div>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 text-right">
            {pointsData.dailyCap - pointsData.dailyEarned > 0 
              ? `${(pointsData.dailyCap - pointsData.dailyEarned).toLocaleString()} points left today`
              : 'Daily cap reached'}
          </p>
        </div>
      )}
      
      {/* Stats Grid */}
      {pointsData && (
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="bg-white dark:bg-gray-700 p-3 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400">Weekly Earned</p>
            <p className="text-lg font-semibold">{pointsData.weeklyEarned.toLocaleString()}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-700 p-3 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400">Points Multiplier</p>
            <p className="text-lg font-semibold">{pointsData.multiplier}x</p>
          </div>
        </div>
      )}
      
      {/* Tips */}
      <div className="pt-2 text-xs text-gray-500 dark:text-gray-400">
        <p className="mb-1">💡 Tips to earn more points:</p>
        <ul className="list-disc list-inside space-y-1 pl-1">
          <li>Take care of your Gochi pet daily</li>
          <li>Complete quests and challenges</li>
          <li>Refer friends to earn bonus points</li>
        </ul>
      </div>
    </div>
  );
} 