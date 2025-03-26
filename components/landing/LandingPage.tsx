"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PetNameSetup } from '@/components/PetNameSetup';

export default function LandingPage() {
  const router = useRouter();
  const { connect, disconnect, isConnected, walletData, error, isNewUser } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to game if already connected, unless new user setup is needed
  useEffect(() => {
    if (isConnected && !isNewUser) {
      router.push('/game');
    }
  }, [isConnected, isNewUser, router]);

  const handleStart = async () => {
    setIsLoading(true);

    try {
      console.log('Starting wallet connection...');
      
      // Check if the Phantom extension is installed
      if (typeof window !== 'undefined' && !(window as any)['solana']) {
        setIsLoading(false);
        // Instead of using context error, set a more direct message
        alert('Phantom wallet extension not detected. Please install Phantom and reload the page.');
        return;
      }
      
      // Connect wallet directly when start is clicked
      const connected = await connect();
      
      if (connected) {
        // Redirect immediately without delay
        router.push('/game');
      } else {
        // Connection failed - in this case, we should check for an error message
        // and show it to the user. The error should already be set in the WalletContext.
        setIsLoading(false);
        console.log('Connection failed, error should be shown via context');
      }
    } catch (err) {
      console.error('Wallet connection error:', err);
      setIsLoading(false);
      // Show a more user-friendly message
      alert('There was a problem connecting to your wallet. Please try refreshing the page.');
    }
  };

  const handleLogout = () => {
    disconnect();
    setIsLoading(false);
  };

  return (
    <div className="bg-gradient-to-br from-purple-500 to-cyan-400 min-h-screen flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Show PetNameSetup for new users */}
      {isNewUser && <PetNameSetup />}

      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white mb-4">Gochi Landing Page</h1>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6 max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <Button 
        onClick={handleStart}
        disabled={isLoading}
        className="py-6 px-12 text-xl bg-white text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 mb-12"
      >
        {isLoading ? 'Connecting...' : 'Start'}
      </Button>
    </div>
  );
} 