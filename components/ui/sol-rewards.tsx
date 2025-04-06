import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/forms/button';
import { toast } from '@/components/ui/use-toast';

export interface SolRewardsProps {
  points?: number;
  walletConnected?: boolean;
  walletAddress?: string;
}

interface RewardData {
  unclaimedAmount: number;
  totalClaimed: number;
  lastClaimTime: string | null;
  tokenBalance: number;
  holdingMultiplier: number;
}

interface PoolData {
  dailyPool: number;
  weeklyPool: number;
  distributedToday: number;
  distributedThisWeek: number;
  nextDistribution: string;
}

export function SolRewards({ walletAddress }: SolRewardsProps) {
  const [rewardData, setRewardData] = useState<RewardData | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<boolean>(false);
  
  useEffect(() => {
    // Don't fetch if no wallet address is provided
    if (!walletAddress) return;
    
    async function fetchRewardsData() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/rewards?walletAddress=${walletAddress}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch rewards data');
        }
        
        setRewardData({
          unclaimedAmount: data.unclaimedAmount || 0,
          totalClaimed: data.totalClaimed || 0,
          lastClaimTime: data.lastClaimTime,
          tokenBalance: data.tokenBalance || 0,
          holdingMultiplier: data.holdingMultiplier || 1
        });
        
        // Also fetch pool data
        const poolResponse = await fetch('/api/rewards/pool');
        const poolData = await poolResponse.json();
        
        if (poolData.success) {
          setPoolData({
            dailyPool: poolData.dailyPool || 0,
            weeklyPool: poolData.weeklyPool || 0,
            distributedToday: poolData.distributedToday || 0,
            distributedThisWeek: poolData.distributedThisWeek || 0,
            nextDistribution: poolData.nextDistribution || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          });
        }
      } catch (err) {
        console.error('Error fetching rewards data:', err);
        setError('Failed to load rewards data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchRewardsData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchRewardsData, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [walletAddress]);
  
  const handleClaimRewards = async () => {
    if (!walletAddress || !rewardData || rewardData.unclaimedAmount <= 0) return;
    
    setClaiming(true);
    
    try {
      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
        }),
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to claim rewards');
      }
      
      // Update the local state
      setRewardData(prev => {
        if (!prev) return prev;
        
        return {
          ...prev,
          unclaimedAmount: 0,
          totalClaimed: prev.totalClaimed + prev.unclaimedAmount,
          lastClaimTime: new Date().toISOString()
        };
      });
      
      toast({
        title: "Rewards Claimed!",
        description: `Successfully claimed ${data.claimedAmount.toFixed(6)} SOL.`,
        variant: "default",
        duration: 5000
      });
    } catch (err) {
      console.error('Error claiming rewards:', err);
      toast({
        title: "Claim Failed",
        description: err instanceof Error ? err.message : 'Failed to claim rewards',
        variant: "destructive",
        duration: 5000
      });
    } finally {
      setClaiming(false);
    }
  };
  
  // Format to 6 decimal places for SOL
  const formatSol = (amount: number) => {
    return amount.toFixed(6);
  };
  
  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  if (!walletAddress) {
    return (
      <div className="p-5 rounded-xl bg-white/80 dark:bg-gray-800/60 pixel-border shadow-lg">
        <p className="text-center text-gray-500 dark:text-gray-400 font-pixel">
          Connect wallet to view rewards
        </p>
      </div>
    );
  }
  
  if (loading && !rewardData) {
    return (
      <div className="p-5 rounded-xl bg-white/80 dark:bg-gray-800/60 pixel-border shadow-lg">
        <div className="flex justify-center py-8">
          <div className="animate-pulse flex space-x-2">
            <div className="w-3 h-3 bg-lime-400 rounded-full"></div>
            <div className="w-3 h-3 bg-lime-400 rounded-full"></div>
            <div className="w-3 h-3 bg-lime-400 rounded-full"></div>
          </div>
        </div>
        <p className="text-center font-pixel text-sm">Loading rewards...</p>
      </div>
    );
  }
  
  if (error && !rewardData) {
    return (
      <div className="p-5 rounded-xl bg-white/80 dark:bg-gray-800/60 pixel-border shadow-lg border-2 border-red-300 dark:border-red-700">
        <div className="flex items-center justify-center mb-3">
          <svg className="w-8 h-8 text-red-500" viewBox="0 0 24 24" fill="none">
            <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-center text-red-500 font-pixel text-sm">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="p-5 rounded-xl bg-white/80 dark:bg-gray-800/60 pixel-border shadow-lg">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-pixel text-xl text-yellow-600 dark:text-yellow-400">SOL Rewards</h3>
        {rewardData?.holdingMultiplier && rewardData.holdingMultiplier > 1 && (
          <div className="text-sm bg-yellow-100 dark:bg-yellow-900 px-3 py-1 rounded-md font-pixel">
            {rewardData.holdingMultiplier}x
          </div>
        )}
      </div>
      
      {/* Reward Amount Display */}
      {rewardData && (
        <div className="mt-4 mb-6 bg-gradient-to-b from-yellow-50 to-white dark:from-yellow-900/20 dark:to-gray-800 p-4 rounded-lg border-2 border-yellow-200 dark:border-yellow-800">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 font-pixel mb-2">Unclaimed Rewards</p>
            <p className="text-3xl font-bold font-pixel text-yellow-500 dark:text-yellow-400 number-glow">
              {formatSol(rewardData.unclaimedAmount)} <span className="text-xl">SOL</span>
            </p>
          </div>
        </div>
      )}
      
      {/* Claim Button */}
      <div className="flex justify-center my-4">
        <Button
          onClick={handleClaimRewards}
          disabled={claiming || !rewardData || rewardData.unclaimedAmount <= 0}
          className={`w-full font-pixel py-3 px-6 ${
            claiming || !rewardData || rewardData.unclaimedAmount <= 0
              ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
              : 'bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 hover:shadow-lg transition-all'
          }`}
        >
          {claiming ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Claiming...
            </span>
          ) : 'Claim Rewards'}
        </Button>
      </div>
      
      {/* Stats */}
      {rewardData && (
        <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600 dark:text-gray-300">Total Claimed</span>
              <span className="font-mono font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                {formatSol(rewardData.totalClaimed)} SOL
              </span>
            </div>
            
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600 dark:text-gray-300">Last Claim</span>
              <span className="font-mono font-medium bg-gray-100 dark:bg-gray-900 px-2 py-1 rounded">
                {formatDate(rewardData.lastClaimTime)}
              </span>
            </div>
            
            <div className="flex justify-between text-sm items-center">
              <span className="text-gray-600 dark:text-gray-300">Token Balance</span>
              <span className="font-mono font-medium bg-lime-100 dark:bg-lime-900/40 px-2 py-1 rounded text-lime-700 dark:text-lime-400">
                {rewardData.tokenBalance.toLocaleString()} GOCHI
              </span>
            </div>
          </div>
        </div>
      )}
      
      {/* Pool Information */}
      {poolData && (
        <div className="mt-4 pt-4 border-t-2 border-dashed border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-pixel text-yellow-600 dark:text-yellow-400 mb-3">Reward Pool</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400">Daily Pool</div>
              <div className="font-medium text-sm font-mono">{formatSol(poolData.dailyPool)} SOL</div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400">Distributed Today</div>
              <div className="font-medium text-sm font-mono">{formatSol(poolData.distributedToday)} SOL</div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400">Weekly Pool</div>
              <div className="font-medium text-sm font-mono">{formatSol(poolData.weeklyPool)} SOL</div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400">This Week</div>
              <div className="font-medium text-sm font-mono">{formatSol(poolData.distributedThisWeek)} SOL</div>
            </div>
          </div>
          
          <div className="mt-3 text-xs text-center text-gray-500">
            Next distribution: {formatDate(poolData.nextDistribution)}
          </div>
        </div>
      )}
    </div>
  );
} 
