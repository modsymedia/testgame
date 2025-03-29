"use client";

import { useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import { PointsDashboard } from '@/components/ui/points-dashboard';

export default function DashboardPage() {
  const router = useRouter();
  const { isConnected, walletData, publicKey } = useWallet();
  const tokenPrice = 0.05; // Example token price in USD

  // Redirect to landing if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  const points = walletData?.points || 0;
  const claimedPoints = 6000;
  const dollarsCollected = 500;

  return (
    <div className="min-h-screen p-6">
      <PointsDashboard
        points={points}
        tokenPrice={tokenPrice}
        claimedPoints={claimedPoints}
        dollarsCollected={dollarsCollected}
        publicKey={publicKey || ""}
      />
    </div>
  );
} 