"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PetNameSetup } from '@/components/PetNameSetup';
import { WalletSelectModal } from '@/components/WalletSelectModal';

export default function LandingPage() {
  const router = useRouter();
  const { disconnect, isConnected, walletData, error, isNewUser, currentWalletName } = useWallet();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect to game if already connected, unless new user setup is needed
  useEffect(() => {
    if (isConnected && !isNewUser) {
      router.push('/game');
    }
  }, [isConnected, isNewUser, router]);

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
        {isConnected && currentWalletName && (
          <p className="text-white text-lg">
            Connected with {currentWalletName === 'phantom' ? 'Phantom' : 'Solflare'} wallet
          </p>
        )}
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6 max-w-md">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {isConnected ? (
        <Button 
          onClick={handleLogout}
          disabled={isLoading}
          className="py-6 px-12 text-xl bg-white text-indigo-700 hover:bg-indigo-100 font-bold rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-1 mb-12"
        >
          Disconnect
        </Button>
      ) : (
        <WalletSelectModal />
      )}
    </div>
  );
} 