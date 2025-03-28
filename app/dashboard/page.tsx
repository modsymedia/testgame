"use client";

import { useEffect, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const router = useRouter();
  const { isConnected, walletData, publicKey } = useWallet();
  const [tokenPrice, setTokenPrice] = useState(0.05); // Example token price in USD

  // Redirect to landing if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  const points = walletData?.points || 0;
  const petName = walletData?.petName || 'Pet';
  const claimedPoints = 6000; // This would come from the backend in a real implementation
  const dollarsCollected = 500; // This would come from the backend in a real implementation
  const potentialRewards = points * tokenPrice;

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow bg-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
            {isConnected && (
              <div className="text-right">
                <h2 className="text-xl font-semibold text-pink-600">{petName}</h2>
                <p className="text-sm text-gray-500">Your Virtual Pet</p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-pink-600">My Points</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">
                  {isConnected ? points.toLocaleString() : <Skeleton className="h-10 w-24" />}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Earn more points by playing with {petName}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-pink-600">Potential Rewards</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-4xl font-bold">
                  {isConnected 
                    ? `$${potentialRewards.toFixed(2)}` 
                    : <Skeleton className="h-10 w-24" />
                  }
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Token Price × Points = ${tokenPrice.toFixed(2)} × {points.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-pink-600">Claimed Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:justify-between">
                <div>
                  <p className="text-4xl font-bold">{claimedPoints.toLocaleString()} points</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Total points converted to rewards
                  </p>
                </div>
                <div className="mt-4 md:mt-0">
                  <p className="text-4xl font-bold">${dollarsCollected.toLocaleString()}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Total USD value collected
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-pink-600">Account Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-gray-500 mr-2">Pet Name:</span>
                  <span className="font-semibold">{petName}</span>
                </div>
                <div>
                  <span className="text-gray-500 mr-2">Wallet:</span>
                  <span className="font-mono text-sm break-all">
                    {publicKey || "Not connected"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
} 