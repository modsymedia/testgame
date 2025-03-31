import React, { useState } from 'react';
import { PointsDisplay } from '@/components/ui/points-display';
import { SolRewards } from '@/components/ui/sol-rewards';
import { PointsLeaderboard } from '@/components/ui/points-leaderboard';
import { ReferralCard } from '@/components/ui/referral-card';
import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/toaster';

export default function RewardsDashboard() {
  const [walletAddress, setWalletAddress] = useState<string>('');
  const [connectedWallet, setConnectedWallet] = useState<string | undefined>(undefined);
  
  const handleConnect = () => {
    if (walletAddress.trim()) {
      setConnectedWallet(walletAddress.trim());
    }
  };
  
  const handleDisconnect = () => {
    setConnectedWallet(undefined);
  };
  
  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <h1 className="text-2xl font-bold mb-6">GOCHI Rewards Dashboard</h1>
      
      {/* Wallet Connection UI */}
      <div className="mb-6 p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <div className="flex flex-col sm:flex-row gap-2">

          
          {!connectedWallet ? (
            <Button onClick={handleConnect} disabled={!walletAddress.trim()}>
              Connect Wallet
            </Button>
          ) : (
            <Button variant="destructive" onClick={handleDisconnect}>
              Disconnect
            </Button>
          )}
        </div>
        
        {connectedWallet && (
          <p className="text-sm mt-2 text-gray-500">
            Connected: {connectedWallet.substring(0, 6)}...{connectedWallet.substring(connectedWallet.length - 4)}
          </p>
        )}
      </div>
      
      {/* Dashboard Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Points and Rewards */}
        <div className="lg:col-span-1 space-y-6">
          <PointsDisplay walletAddress={connectedWallet} />
          <SolRewards walletAddress={connectedWallet} />
          <ReferralCard walletAddress={connectedWallet} />
        </div>
        
        {/* Right column - Leaderboard */}
        <div className="lg:col-span-2">
          <PointsLeaderboard walletAddress={connectedWallet} limit={15} />
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