"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { Button } from '@/components/ui/forms/button';
import { Alert, AlertDescription } from '@/components/ui/feedback/alert';
import { WalletSelectModal } from '@/components/game/WalletSelectModal';
import PixelatedContainer from '@/components/game/PixelatedContainer';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function LandingPage() {
  const router = useRouter();
  const { disconnect, isConnected, error, isNewUser, currentWalletName } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [UID, setUID] = useState<string | null>(null);

  // Redirect to game if already connected, unless new user setup is needed
  useEffect(() => {
    if (isConnected && !isNewUser) {
      router.push('/console/gotchi');
    }
  }, [isConnected, isNewUser, router]);

  // Extract referral code from URL if present
  useEffect(() => {
    // Only run in browser
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref');
      
      if (refCode) {
        // Store the referral code in state to display it
        setUID(refCode);
        // Store the referral code in session storage for later use during signup
        sessionStorage.setItem('pendingUID', refCode);
        console.log(`Referral code detected and stored: ${refCode}`);
      }
    }
  }, []);

  const handleLogout = () => {
    disconnect();
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <picture className="fixed w-[100vw] h-[100vh]" >
          <source media="(max-width: 768px)" srcSet="/assets/mobilebg.png" />
          <Image
            src="/assets/bg.png"
            alt="Background"
            layout="fill"
            priority
            className="object-cover pixelated"
            style={{ imageRendering: "pixelated" }}
          />
        </picture>
      </div>
      
      {/* Content */}
      <div className="relative z-10 flex flex-col min-h-screen items-center justify-center px-4 py-8 md:py-12">
        {/* Logo and Title */}
        <motion.div 
          className="mb-8 text-center"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Image
            src="/assets/icons/header/gochi.png"
            alt="Gochi Logo"
            width={80}
            height={80}
            className="mx-auto mb-4"
            style={{ imageRendering: "pixelated" }}
          />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-[#304700] font-pixelify mb-2">
            Gochi Game
          </h1>
          <p className="text-lg md:text-xl text-[#304700] max-w-sm mx-auto font-pixelify">
            Take care of your virtual pet and earn rewards!
          </p>
        </motion.div>

        {/* Main Content Container */}
        <PixelatedContainer className="max-w-3xl w-full mb-8 py-6 px-4 md:px-8">
          <div className="w-full flex flex-col items-center">
            {/* Connection Status */}
            {isConnected && currentWalletName && (
              <PixelatedContainer 
                className="mb-4 py-2 px-4" 
                bgcolor="#d8ee9e"
                borderColor="#304700"
              >
                <p className="text-[#304700] font-pixelify">
                  Connected with {currentWalletName === 'phantom' ? 'Phantom' : 'Solflare'} wallet
                </p>
              </PixelatedContainer>
            )}
            
            {/* Error Message */}
            {error && (
              <Alert variant="destructive" className="mb-6 max-w-md mx-auto">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            {/* Wallet Connect / Disconnect */}
            <div className="space-y-4 flex flex-col items-center">
              {isConnected ? (
                <Button 
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="py-4 px-8 text-xl bg-[#f8ca58] text-[#304700] hover:bg-[#f5b730] font-bold font-pixelify rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-1"
                >
                  Disconnect
                </Button>
              ) : (
                <div className="flex flex-col items-center space-y-4">
                  {/* Show referral code message if present */}
                  {UID && (
                    <PixelatedContainer className="mb-4 px-4 py-2" bgcolor="#9ee95f" borderColor="#304700">
                      <p className="text-[#304700] font-pixelify">
                        Joining with referral code: <strong>{UID}</strong>
                      </p>
                    </PixelatedContainer>
                  )}
                  
                  {/* Wallet connect button styled like console buttons */}
                  <div className="mb-4">
                    <WalletSelectModal />
                  </div>
                  
                  <p className="text-[#304700] text-sm max-w-xs text-center font-pixelify">
                    Connect your wallet to start playing and earning rewards
                  </p>
                </div>
              )}
            </div>
          </div>
        </PixelatedContainer>

        {/* Features Grid in Pixelated Containers */}
        <div className="w-full max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <PixelatedContainer className="h-full" bgcolor="#d8ee9e">
              <div className="text-center p-4">
                <Image
                  src="/assets/icons/header/gochi.png"
                  alt="Virtual Pet"
                  width={40}
                  height={40}
                  className="mx-auto mb-2"
                  style={{ imageRendering: "pixelated" }}
                />
                <h3 className="text-xl font-bold mb-2 text-[#304700] font-pixelify">Virtual Pet Care</h3>
                <p className="text-[#304700] font-pixelify">Feed, play, and take care of your unique virtual pet</p>
              </div>
            </PixelatedContainer>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <PixelatedContainer className="h-full" bgcolor="#f8ca58">
              <div className="text-center p-4">
                <Image
                  src="/assets/icons/withdraw.svg"
                  alt="Earn Rewards"
                  width={40}
                  height={40}
                  className="mx-auto mb-2"
                  style={{ imageRendering: "pixelated" }}
                />
                <h3 className="text-xl font-bold mb-2 text-[#304700] font-pixelify">Earn Rewards</h3>
                <p className="text-[#304700] font-pixelify">Earn points and rewards for being a good pet owner</p>
              </div>
            </PixelatedContainer>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <PixelatedContainer className="h-full" bgcolor="#9ee95f">
              <div className="text-center p-4">
                <Image
                  src="/assets/icons/header/leaderboard.svg"
                  alt="Compete"
                  width={40}
                  height={40}
                  className="mx-auto mb-2"
                  style={{ imageRendering: "pixelated" }}
                />
                <h3 className="text-xl font-bold mb-2 text-[#304700] font-pixelify">Compete</h3>
                <p className="text-[#304700] font-pixelify">Join the leaderboard and compete with other players</p>
              </div>
            </PixelatedContainer>
          </motion.div>
        </div>
        
        {/* Footer Social Links */}
        <div className="mt-8 flex items-center gap-4">
          <PixelatedContainer
            className="h-[40px] cursor-pointer hover:bg-[#d8ee9e] transition-colors"
            style={{ width: "40px" }}
            noPadding
          >
            <a
              href="https://x.com/gochionsol"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-full flex items-center justify-center"
            >
              <Image
                src="/assets/icons/social/x.png"
                alt="X (Twitter)"
                width={20}
                height={20}
                className="object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            </a>
          </PixelatedContainer>
          
          <PixelatedContainer
            className="h-[40px] cursor-pointer hover:bg-[#d8ee9e] transition-colors"
            style={{ width: "40px" }}
            noPadding
          >
            <a
              href="https://github.com/gochiGame"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-full flex items-center justify-center"
            >
              <Image
                src="/assets/icons/social/github.png"
                alt="GitHub"
                width={20}
                height={20}
                className="object-contain"
                style={{ imageRendering: "pixelated" }}
              />
            </a>
          </PixelatedContainer>
        </div>
      </div>
    </div>
  );
} 
