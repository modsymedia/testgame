import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/layout/tabs';
import { LeaderboardEntry, PointsLeaderboard as PointsLeaderboardType } from '@/lib/models';
import { useWallet } from '@/context/WalletContext';
import Image from 'next/image';

export interface PointsLeaderboardProps {
  userPublicKey?: string | null;
  userRank?: number | null;
  limit?: number;
  walletAddress?: string;
}

export function PointsLeaderboard({ walletAddress, limit = 10 }: PointsLeaderboardProps) {
  const [leaderboard, setLeaderboard] = useState<PointsLeaderboardType | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('allTime');
  const { isConnected } = useWallet();

  useEffect(() => {
    // Skip if user is not connected
    if (!isConnected) {
      setLoading(false);
      return;
    }
    
    async function fetchLeaderboard() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/points-leaderboard?limit=${limit}`);
        const data = await response.json();
        
        if (data.leaderboard) {
          setLeaderboard(data.leaderboard);
        } else {
          throw new Error('Failed to load leaderboard data');
        }
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError('Failed to load leaderboard. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    if (isConnected) {
      fetchLeaderboard();
      
      // Refresh every 5 minutes
      const interval = setInterval(fetchLeaderboard, 5 * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [limit, isConnected]);
  
  // Find the user's rank in the current tab if wallet address is provided
  const getUserRank = () => {
    if (!walletAddress || !leaderboard) return null;
    
    const currentLeaderboard = leaderboard[activeTab as keyof PointsLeaderboardType] as LeaderboardEntry[];
    const userEntry = currentLeaderboard.find(entry => entry.walletAddress === walletAddress);
    
    return userEntry ? userEntry.rank : null;
  };
  
  const renderLeaderboardEntries = (entries: LeaderboardEntry[]) => {
    return entries.map((entry, index) => (
      <div 
        key={entry.walletAddress} 
        className={`flex items-center justify-between p-2 text-[18px] uppercase ${
          entry.walletAddress === walletAddress 
            ? 'bg-blue-50 dark:bg-blue-900/30 rounded-md' 
            : index % 2 === 0 
              ? 'bg-gray-50 dark:bg-gray-800/50' 
              : ''
        }`}
      >
        <div className="flex-1 flex items-center space-x-3">
          <div className="w-12 h-12 flex items-center justify-center font-medium">
            {entry.rank}
          </div>
          <div className="truncate uppercase">
            {entry.username || entry.walletAddress.substring(0, 6) + '...'}
          </div>
        </div>
        <div className="font-medium flex items-center gap-2">
          <Image src="/assets/icons/coin.png" width={24} height={24} alt="Points" className="inline-block" />
          {entry.points?.toLocaleString() || entry.score.toLocaleString()}
        </div>
      </div>
    ));
  };
  
  if (!isConnected) {
    return (
      <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center">Sign in to view leaderboard</p>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center">Loading leaderboard...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 border border-red-300 dark:border-red-700">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }
  
  if (!leaderboard) {
    return (
      <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center text-gray-500 dark:text-gray-400">
          No leaderboard data available
        </p>
      </div>
    );
  }
  
  const userRank = getUserRank();
  
  return (
    <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-[18px] uppercase">GOCHI Leaderboard</h3>
        {userRank && (
          <div className="text-[18px] bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-md uppercase">
            Your Rank: <span className="font-bold">{userRank}</span>
          </div>
        )}
      </div>
      
      <Tabs defaultValue="allTime" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 mb-2 text-[18px] uppercase">
          <TabsTrigger value="allTime">All Time</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>
        
        <TabsContent value="allTime" className="mt-0">
          <div className="space-y-1">
            <div className="flex items-center font-medium text-[18px] uppercase text-gray-500 dark:text-gray-400 p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex items-center space-x-3">
                <div className="w-12">Rank</div>
                <div>User</div>
              </div>
              <div>Points</div>
            </div>
            {renderLeaderboardEntries(leaderboard.allTime)}
          </div>
        </TabsContent>
        
        <TabsContent value="weekly" className="mt-0">
          <div className="space-y-1">
            <div className="flex items-center font-medium text-[18px] uppercase text-gray-500 dark:text-gray-400 p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex items-center space-x-3">
                <div className="w-12">Rank</div>
                <div>User</div>
              </div>
              <div>Points</div>
            </div>
            {renderLeaderboardEntries(leaderboard.weekly)}
          </div>
        </TabsContent>
        
        <TabsContent value="daily" className="mt-0">
          <div className="space-y-1">
            <div className="flex items-center font-medium text-[18px] uppercase text-gray-500 dark:text-gray-400 p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex items-center space-x-3">
                <div className="w-12">Rank</div>
                <div>User</div>
              </div>
              <div>Points</div>
            </div>
            {renderLeaderboardEntries(leaderboard.daily)}
          </div>
        </TabsContent>
        
        <TabsContent value="referrals" className="mt-0">
          <div className="space-y-1">
            <div className="flex items-center font-medium text-[18px] uppercase text-gray-500 dark:text-gray-400 p-2 border-b border-gray-200 dark:border-gray-700">
              <div className="flex-1 flex items-center space-x-3">
                <div className="w-12">Rank</div>
                <div>User</div>
              </div>
              <div>Points</div>
            </div>
            {renderLeaderboardEntries(leaderboard.referrals)}
          </div>
        </TabsContent>
      </Tabs>
      
      <div className="pt-2 text-xs text-center text-gray-500 dark:text-gray-400">
        {activeTab === 'allTime' && 'Total points earned across all time'}
        {activeTab === 'weekly' && 'Points earned in the current week'}
        {activeTab === 'daily' && 'Points earned today'}
        {activeTab === 'referrals' && 'Points earned from referrals'}
      </div>
    </div>
  );
} 
