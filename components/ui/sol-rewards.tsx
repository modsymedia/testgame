import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

interface SolRewardsProps {
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
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Connect your wallet to view rewards
        </p>
      </div>
    );
  }
  
  if (loading && !rewardData) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center">Loading rewards data...</p>
      </div>
    );
  }
  
  if (error && !rewardData) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-red-300 dark:border-red-700">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-lg">SOL Rewards</h3>
        {rewardData?.holdingMultiplier && rewardData.holdingMultiplier > 1 && (
          <div className="text-sm bg-yellow-100 dark:bg-yellow-900 px-2 py-1 rounded-md">
            {rewardData.holdingMultiplier}x Multiplier
          </div>
        )}
      </div>
      
      {/* Reward Amount Display */}
      {rewardData && (
        <div className="flex items-center justify-center py-6">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">Unclaimed Rewards</p>
            <p className="text-4xl font-bold">{formatSol(rewardData.unclaimedAmount)} SOL</p>
          </div>
        </div>
      )}
      
      {/* Claim Button */}
      <div className="flex justify-center">
        <Button
          onClick={handleClaimRewards}
          disabled={claiming || !rewardData || rewardData.unclaimedAmount <= 0}
          className="w-full"
        >
          {claiming ? 'Claiming...' : 'Claim Rewards'}
        </Button>
      </div>
      
      {/* Stats */}
      {rewardData && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Total Claimed</span>
            <span className="font-medium">{formatSol(rewardData.totalClaimed)} SOL</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Last Claim</span>
            <span className="font-medium">{formatDate(rewardData.lastClaimTime)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Token Balance</span>
            <span className="font-medium">{rewardData.tokenBalance.toLocaleString()} GOCHI</span>
          </div>
        </div>
      )}
      
      {/* Pool Information */}
      {poolData && (
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          <h4 className="text-sm font-medium">Reward Pool</h4>
          
          <div className="flex justify-between text-sm">
            <span>Daily Pool</span>
            <span className="font-medium">{formatSol(poolData.dailyPool)} SOL</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span>Distributed Today</span>
            <span className="font-medium">{formatSol(poolData.distributedToday)} SOL</span>
          </div>
          
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Next Distribution</span>
            <span>{formatDate(poolData.nextDistribution)}</span>
          </div>
        </div>
      )}
      
      {/* Pre-launch Notice */}
      {!rewardData?.tokenBalance && (
        <div className="pt-2 text-xs text-center text-gray-500 dark:text-gray-400">
          Token not yet launched. Earn points now to maximize your rewards at launch!
        </div>
      )}
    </div>
  );
} 