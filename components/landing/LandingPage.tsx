"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PetNameSetup } from '@/components/PetNameSetup';
import { WalletSelectModal } from '@/components/WalletSelectModal';
import Image from 'next/image';

export default function LandingPage() {
  const router = useRouter();
  const { disconnect, isConnected, walletData, error, isNewUser, currentWalletName } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to game if already connected, unless new user setup is needed
  useEffect(() => {
    if (isConnected && !isNewUser) {
      router.push('/console/gotchi');
    }
  }, [isConnected, isNewUser, router]);

  const handleLogout = () => {
    disconnect();
    setIsLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-purple-500 to-cyan-400 min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full relative">
          <Image
            src="/assets/pattern-bg.png"
            alt="Background Pattern"
            fill
            style={{ objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* Show PetNameSetup for new users */}
      {isNewUser && <PetNameSetup />}

      <div className="relative z-10 w-full max-w-md mx-auto text-center px-4">
        <div className="mb-8 space-y-4">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-pixelify">
            Gochi Game
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-sm mx-auto">
            Take care of your virtual pet and earn rewards!
          </p>
          {isConnected && currentWalletName && (
            <p className="text-white text-lg bg-white/10 rounded-lg py-2 px-4 inline-block">
              Connected with {currentWalletName === 'phantom' ? 'Phantom' : 'Solflare'} wallet
            </p>
          )}
        </div>
        
        {error && (
          <Alert variant="destructive" className="mb-6 max-w-md mx-auto">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          {isConnected ? (
            <Button 
              onClick={handleLogout}
              disabled={isLoading}
              className="py-6 px-12 text-xl bg-white text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-1"
            >
              Disconnect
            </Button>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <WalletSelectModal />
              <p className="text-white/80 text-sm max-w-xs">
                Connect your wallet to start playing and earning rewards
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 w-full max-w-4xl mx-auto mt-16 px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Virtual Pet Care</h3>
            <p>Feed, play, and take care of your unique virtual pet</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Earn Rewards</h3>
            <p>Earn points and rewards for being a good pet owner</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Compete</h3>
            <p>Join the leaderboard and compete with other players</p>
          </div>
        </div>
      </div>
    </div>
  );
} 