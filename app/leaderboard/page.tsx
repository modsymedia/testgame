"use client";

import { useEffect } from 'react';
import { Navigation } from "@/components/navigation";
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import LeaderboardDisplay from '@/components/landing/LeaderboardDisplay';

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
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">Leaderboard</h1>
          
          <div className="bg-white rounded-lg shadow-sm p-4">
            <LeaderboardDisplay />
          </div>
        </div>
      </main>
    </div>
  );
} 