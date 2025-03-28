"use client";

import { useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import LeaderboardDisplay from '@/components/landing/LeaderboardDisplay';
import Image from 'next/image';

export default function LeaderboardPage() {
  const router = useRouter();
  const { isConnected } = useWallet();

  // Redirect to landing if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen flex flex-col relative pt-[80px]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 ">
        <Image
          src="/assets/leaderboard-bg.png"
          alt="Leaderboard Background"
          fill
          priority
          style={{ objectFit: 'cover' }}
        />
      </div>
      
      <main className="flex-grow p-6 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="p-4 flex items-center justify-center">
            <LeaderboardDisplay />
          </div>
        </div>
      </main>
    </div>
  );
} 