"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';

export default function LandingPage() {
  const router = useRouter();
  const { connect, disconnect, isConnected, walletData } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  // Check if already connected when page loads
  useEffect(() => {
    if (isConnected && walletData) {
      router.push('/game');
    }
  }, [isConnected, walletData, router]);

  const handleStart = async () => {
    setIsLoading(true);

    try {
      // Connect wallet directly when start is clicked
      const connected = await connect();
      
      if (connected) {
        // Redirect immediately without delay
        router.push('/game');
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    disconnect();
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-700">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-white mb-6">Gochi Landing Page</h1>
      </div>
      
      <Button 
        onClick={handleStart}
        disabled={isLoading}
        className="py-6 px-12 text-xl bg-white text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-1"
      >
        {isLoading ? 'Connecting...' : 'Start'}
      </Button>
    </div>
  );
} 