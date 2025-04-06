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
import Image from 'next/image';

export default function RewardsDashboard() {
  const { isConnected, connect, disconnect, publicKey } = useWallet();
  const { userData, isLoading, error, syncWithServer } = useUserData();
  
  // Manual sync function for user-triggered refresh
  const handleRefresh = async () => {
    await syncWithServer();
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-lime-200 to-lime-100 dark:from-lime-900 dark:to-lime-800 p-4">
      <div className="container mx-auto py-6 max-w-6xl">
        {/* Header */}
        <header className="flex items-center justify-between mb-8 border-b-4 border-lime-400 dark:border-lime-600 pb-4 pixel-border">
          <div className="flex items-center">
            <div className="w-12 h-12 relative mr-3">
              <Image 
                src="/favicon.ico" 
                alt="Bochi" 
                width={48} 
                height={48}
                className="pixel-image"
              />
            </div>
            <h1 className="text-3xl font-pixel text-lime-800 dark:text-lime-300 tracking-wide">BOCHI REWARDS</h1>
          </div>
          
          {/* Navigation Bar */}
          <nav className="flex space-x-1">
            <NavButton active>Dashboard</NavButton>
            <NavButton>Leaderboard</NavButton>
            <NavButton>Admin</NavButton>
            <NavButton isLogout>Logout</NavButton>
          </nav>
        </header>
      
        {/* Wallet Connection UI */}
        <div className="mb-8 p-5 rounded-xl bg-white/80 dark:bg-gray-800/60 pixel-border shadow-lg">
          <div className="flex flex-col sm:flex-row gap-3">
            {!isConnected ? (
              <Button onClick={() => connect('phantom')} className="bg-lime-500 hover:bg-lime-600 text-white font-pixel py-3 px-6">
                <span className="flex items-center">
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 12H8M12 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  Connect Wallet
                </span>
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button 
                  variant="destructive" 
                  onClick={disconnect}
                  className="font-pixel border-2 border-red-500"
                >
                  Disconnect
                </Button>
                <Button 
                  onClick={handleRefresh} 
                  variant="outline"
                  className="font-pixel border-2 border-lime-400 hover:bg-lime-100"
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none">
                    <path d="M4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12C20 16.4183 16.4183 20 12 20C8.7 20 5.8 18.0 4.7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M8 9L4 12L1 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Refresh Data
                </Button>
              </div>
            )}
          </div>
          
          {isConnected && publicKey && (
            <div className="flex items-center mt-3 bg-lime-100 dark:bg-lime-900/60 rounded-lg p-2 text-sm">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2 pulse-animation"></div>
              <p className="text-lime-700 dark:text-lime-300 font-mono font-medium">
                Connected: {publicKey.substring(0, 6)}...{publicKey.substring(publicKey.length - 4)}
              </p>
            </div>
          )}
          
          {error && (
            <p className="text-sm mt-2 text-red-500 bg-red-100 dark:bg-red-900/30 p-2 rounded">
              {error}
            </p>
          )}
        </div>
      
        {/* Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left column - Points and Rewards */}
          <div className="lg:col-span-4 space-y-6">
            {/* My Points Card */}
            <div className="bg-white/80 dark:bg-gray-800/60 p-5 rounded-xl pixel-border shadow-lg">
              <h2 className="text-xl font-pixel text-lime-800 dark:text-lime-400 mb-3">My Points</h2>
              <div className="flex items-center justify-between">
                <div className="text-5xl font-bold font-pixel text-lime-600 dark:text-lime-300 number-glow">
                  {userData.points || 119}
                </div>
                <div className="p-3 bg-lime-100 dark:bg-lime-900 rounded-lg">
                  <svg className="w-8 h-8 text-lime-500" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L15 8L21 9L17 14L18 20L12 17.5L6 20L7 14L3 9L9 8L12 2Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
                Earn more points by playing Bochi
              </p>
            </div>
            
            {/* Potential Rewards Card */}
            <div className="bg-white/80 dark:bg-gray-800/60 p-5 rounded-xl pixel-border shadow-lg">
              <h2 className="text-xl font-pixel text-lime-800 dark:text-lime-400 mb-3">Potential Rewards</h2>
              <div className="flex items-center justify-between">
                <div className="text-5xl font-bold font-pixel text-yellow-500 dark:text-yellow-400 number-glow">
                  ${((userData.points || 119) * 0.05).toFixed(2)}
                </div>
                <div className="p-3 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                  <svg className="w-8 h-8 text-yellow-500" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12.31 11.14C10.54 10.69 9.97 10.2 9.97 9.47C9.97 8.63 10.76 8.04 12.07 8.04C13.45 8.04 13.97 8.7 14.06 9.54H15.94C15.84 8.28 15.03 7.11 13.3 6.73V5H10.75V6.69C9.21 7 8 7.99 8 9.49C8 11.29 9.5 12.19 11.72 12.73C13.72 13.21 14.01 13.93 14.01 14.66C14.01 15.21 13.58 16.04 12.07 16.04C10.69 16.04 9.96 15.33 9.81 14.54H7.94C8.1 16.2 9.25 17.05 10.75 17.35V19H13.3V17.38C14.85 17.11 16 16.21 16 14.65C16 12.43 14.08 11.6 12.31 11.14Z" fill="currentColor"/>
                  </svg>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
                Token price × Points = ${((userData.points || 119) * 0.05).toFixed(2)}
              </p>
            </div>
            
            {/* Claimed Points Card */}
            <div className="bg-white/80 dark:bg-gray-800/60 p-5 rounded-xl pixel-border shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-pixel text-lime-800 dark:text-lime-400">Claimed Points</h2>
                <span className="text-xl font-pixel text-yellow-500">$ {userData.claimedPoints || 500}</span>
              </div>
              <div className="text-4xl font-bold font-pixel text-gray-700 dark:text-gray-300">
                {userData.claimedPoints || 0}
              </div>
              <div className="mt-3 flex justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>Total USD value collected</span>
                <span>Total points converted to rewards</span>
              </div>
            </div>
            
            {/* Wallet Information Card */}
            <div className="bg-white/80 dark:bg-gray-800/60 p-5 rounded-xl pixel-border shadow-lg">
              <h2 className="text-xl font-pixel text-lime-800 dark:text-lime-400 mb-3">Wallet Information</h2>
              <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded font-mono text-xs break-all">
                {publicKey || "ZYJnbS1rmtrKGqNHiDTmqTWpDfAf9PPAM58oBcekg2b"}
              </div>
              <div className="mt-4">
                <span className="text-sm text-gray-700 dark:text-gray-300">Pet Name:</span>
                <span className="ml-2 font-medium">mmmm</span>
              </div>
            </div>
          </div>
          
          {/* Middle column - Leaderboard */}
          <div className="lg:col-span-4">
            <div className="bg-white/80 dark:bg-gray-800/60 p-5 rounded-xl pixel-border shadow-lg h-full">
              <h2 className="text-xl font-pixel text-lime-800 dark:text-lime-400 mb-3">Leaderboard</h2>
              <PointsLeaderboard 
                userPublicKey={publicKey} 
                userRank={userData.rank}
                limit={8} 
              />
            </div>
          </div>
          
          {/* Right column - LLM Info */}
          <div className="lg:col-span-4">
            <div className="bg-white/80 dark:bg-gray-800/60 p-5 rounded-xl pixel-border shadow-lg h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-pixel text-lime-800 dark:text-lime-400">LLM INFO</h2>
                <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
                  <span className="font-bold text-yellow-600 dark:text-yellow-400">!</span>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                <TabButton active>All</TabButton>
                <TabButton>Behavior</TabButton>
                <TabButton>Msgs</TabButton>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 dark:text-gray-300 font-medium">Msgs</span>
                  <span className="font-mono text-gray-500">19:09:00</span>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium text-gray-800 dark:text-gray-200">Prompt:</h3>
                  <p className="text-sm bg-gray-100 dark:bg-gray-900 p-3 rounded">
                    Generate a short message (max 130 characters) from a virtual pet 
                    named Pet_8Y0n after the owner has healed them.
                  </p>
                  
                  <h3 className="font-medium text-gray-800 dark:text-gray-200 mt-4">Current pet stats (out of 100):</h3>
                  <p className="text-sm bg-gray-100 dark:bg-gray-900 p-3 rounded">
                    -F...
                  </p>
                  
                  <h3 className="font-medium text-gray-800 dark:text-gray-200 mt-4">Response:</h3>
                  <div className="bg-lime-100 dark:bg-lime-900/40 p-3 rounded border-l-4 border-lime-500">
                    <p className="text-sm italic">"Thank you for healing me! I'm feeling much better now!"</p>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-lime-700 dark:text-lime-300">Reaction: happy</span>
                      <span className="text-yellow-600 dark:text-yellow-400">Reward: 4</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      
        {/* FAQ Section */}
        <div className="mt-8 p-5 rounded-xl bg-white/80 dark:bg-gray-800/60 pixel-border shadow-lg">
          <h2 className="text-xl font-pixel text-lime-800 dark:text-lime-400 mb-4">Frequently Asked Questions</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FaqCard
              question="How do I earn points?"
              answer="Take care of your Gochi pet, maintain high pet stats, and play daily to earn points. The healthier and happier your pet, the more points you'll earn!"
            />
            
            <FaqCard
              question="What are SOL rewards?"
              answer="After token launch, you'll earn SOL rewards based on platform activity. Holding more GOCHI tokens increases your reward multiplier!"
            />
            
            <FaqCard
              question="How does the referral system work?"
              answer="Share your referral code with friends. When they join and earn 100 points, you'll receive 10% of their points (up to 1,000 points per referral)."
            />
          </div>
        </div>
      </div>
      
      {/* Toast component for notifications */}
      <Toaster />
    </div>
  );
}

// Navigation Button Component
function NavButton({ children, active, isLogout }: { children: React.ReactNode, active?: boolean, isLogout?: boolean }) {
  return (
    <button 
      className={`px-4 py-2 font-pixel rounded-t-lg transition-colors border-2 border-b-0
        ${active 
          ? 'bg-white dark:bg-gray-800 text-lime-700 dark:text-lime-400 border-lime-400 dark:border-lime-600' 
          : isLogout 
            ? 'bg-gray-100 hover:bg-red-100 dark:bg-gray-700 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-200 hover:text-red-600 dark:hover:text-red-400 border-gray-300 dark:border-gray-600' 
            : 'bg-gray-100 hover:bg-white dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600'
        }`}
    >
      {children}
    </button>
  );
}

// Tab Button Component
function TabButton({ children, active }: { children: React.ReactNode, active?: boolean }) {
  return (
    <button 
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors
        ${active 
          ? 'border-lime-500 text-lime-600 dark:text-lime-400' 
          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600'
        }`}
    >
      {children}
    </button>
  );
}

// FAQ Card Component
function FaqCard({ question, answer }: { question: string, answer: string }) {
  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:shadow-md hover:border-lime-200 dark:hover:border-lime-800 transition-all">
      <h3 className="font-medium text-lime-700 dark:text-lime-400 mb-2">{question}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-300">{answer}</p>
    </div>
  );
} 