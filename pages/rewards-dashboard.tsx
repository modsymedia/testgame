import React from 'react';
import { PointsDisplay } from '@/components/game/PointsDisplay';
import { SolRewards } from '@/components/ui/sol-rewards';
import { PointsLeaderboard } from '@/components/ui/points-leaderboard';
import { ReferralCard } from '@/components/ui/referral-card';
import { Button } from '@/components/ui/forms/button';
// import { Input } from '@/components/ui/forms/input';
import { Toaster } from '@/components/ui/feedback/toaster';
import { useUserData } from '@/context/UserDataContext';
import { useWallet } from '@/context/WalletContext';

export default function RewardsDashboard() {
  const { isConnected, connect, disconnect, publicKey } = useWallet();
  const { userData, isLoading, error, syncWithServer } = useUserData();
  
  // Manual sync function for user-triggered refresh
  const handleRefresh = async () => {
    await syncWithServer();
  };
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">GOCHI Rewards Dashboard</h1>
      
      {/* Wallet Connection UI */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row gap-2">
          {!isConnected ? (
            <Button onClick={() => connect('phantom')}>
              Connect Wallet
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="destructive" onClick={disconnect}>
                Disconnect
              </Button>
              <Button onClick={handleRefresh} variant="outline">
                Refresh Data
              </Button>
            </div>
          )}
        </div>
        
        {isConnected && publicKey && (
          <p className="text-sm mt-2 text-gray-500">
            Connected: {publicKey.substring(0, 6)}...{publicKey.substring(publicKey.length - 4)}
          </p>
        )}
        
        {error && (
          <p className="text-sm mt-2 text-red-500">
            {error}
          </p>
        )}
      </div>
      
      {/* Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Points and Rewards */}
        <div className="lg:col-span-1 space-y-6">
          <PointsDisplay 
            points={userData.points}
            claimedPoints={userData.claimedPoints}
            multiplier={userData.multiplier}
            isLoading={isLoading}
            lastUpdated={userData.lastSync}
          />
          <SolRewards 
            points={userData.points}
            walletConnected={isConnected}
          />
          <ReferralCard 
            referralCode={userData.referralCode}
            referralCount={userData.referralCount}
            walletConnected={isConnected}
          />
        </div>
        
        {/* Right column - Leaderboard */}
        <div className="lg:col-span-2">
          <PointsLeaderboard 
            userPublicKey={publicKey} 
            userRank={userData.rank}
            limit={15} 
          />
        </div>
      </div>
      
      {/* FAQ Section */}
      <div className="mt-8 p-4 border rounded-lg bg-white dark:bg-gray-800">
        <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">How do I earn points?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Take care of your Gochi pet, maintain high pet stats, and play daily to earn points. 
              The healthier and happier your pet, the more points you'll earn!
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">What are SOL rewards?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              After token launch, you'll earn SOL rewards based on platform activity. 
              Holding more GOCHI tokens increases your reward multiplier!
            </p>
          </div>
          
          <div>
            <h3 className="font-medium">How does the referral system work?</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Share your referral code with friends. When they join and earn 100 points, 
              you'll receive 10% of their points (up to 1,000 points per referral).
            </p>
          </div>
        </div>
      </div>
      
      {/* Toast component for notifications */}
      <Toaster />
    </div>
  );
} 