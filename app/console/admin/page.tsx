"use client";

import { useState, useEffect } from 'react';
import { useWallet } from '@/context/WalletContext';
import PixelatedContainer from '@/components/PixelatedContainer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const { publicKey, walletData, disconnect } = useWallet();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [pointsAmount, setPointsAmount] = useState('');

  // Log wallet info when component mounts or wallet data changes
  useEffect(() => {
    if (walletData) {
      console.log('👛 Wallet Data Loaded:', {
        publicKey: publicKey,
        petName: walletData.petName,
        points: walletData.points,
        stats: {
          health: walletData.health,
          happiness: walletData.happiness,
          hunger: walletData.hunger,
          cleanliness: walletData.cleanliness,
        },
        lastActive: walletData.lastActive,
        consecutiveDays: walletData.consecutiveDays,
      });
    }
  }, [walletData, publicKey]);

  const handleKillPet = async () => {
    setIsLoading(true);
    try {
      console.log('💀 Killing Pet for wallet:', publicKey);
      
      const response = await fetch('/api/pet/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey,
          health: 0,
          happiness: 0,
          hunger: 0,
          cleanliness: 0,
        }),
      });

      if (!response.ok) throw new Error('Failed to kill pet');
      
      console.log('☠️ Pet killed successfully for wallet:', publicKey);
      toast.success("Pet killed successfully");
      router.refresh();
    } catch (error) {
      console.error('❌ Error killing pet:', error);
      toast.error("Failed to kill pet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsLoading(true);
    try {
      console.log('🗑️ Deleting account for wallet:', publicKey);
      
      const response = await fetch('/api/user/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publicKey }),
      });

      if (!response.ok) throw new Error('Failed to delete account');
      
      console.log('🚮 Account deleted successfully for wallet:', publicKey);
      toast.success("Account deleted successfully");
      disconnect();
      router.push('/');
    } catch (error) {
      console.error('❌ Error deleting account:', error);
      toast.error("Failed to delete account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPet = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Resetting pet for wallet:', publicKey);
      
      const response = await fetch('/api/pet/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey,
          health: 100,
          happiness: 100,
          hunger: 100,
          cleanliness: 100,
        }),
      });

      if (!response.ok) throw new Error('Failed to reset pet');
      
      console.log('✨ Pet reset successfully for wallet:', publicKey, {
        health: 100,
        happiness: 100,
        hunger: 100,
        cleanliness: 100,
      });
      toast.success("Pet reset successfully");
      router.refresh();
    } catch (error) {
      console.error('❌ Error resetting pet:', error);
      toast.error("Failed to reset pet");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGivePoints = async () => {
    if (!pointsAmount || isNaN(Number(pointsAmount))) {
      toast.error("Please enter a valid number of points");
      return;
    }

    setIsLoading(true);
    try {
      console.log('🎯 Adding points for wallet:', publicKey, 'Amount:', pointsAmount);
      
      const response = await fetch('/api/points/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicKey,
          points: Number(pointsAmount),
        }),
      });

      if (!response.ok) throw new Error('Failed to add points');
      
      console.log('🎉 Points added successfully:', {
        wallet: publicKey,
        amount: pointsAmount,
        currentTotal: walletData?.points ? walletData.points + Number(pointsAmount) : Number(pointsAmount),
      });
      toast.success(`Successfully gave ${pointsAmount} points`);
      setPointsAmount('');
      router.refresh();
    } catch (error) {
      console.error('❌ Error giving points:', error);
      toast.error("Failed to give points");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 mt-16">
      <h1 className="text-3xl font-bold mb-8">Admin Panel (Test Version)</h1>
      
      <div className="grid gap-6">
        {/* Pet Management Section */}
        <PixelatedContainer className="p-6">
          <h2 className="text-xl font-bold mb-4">Pet Management</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Kill Pet</h3>
              <Button 
                variant="destructive" 
                onClick={handleKillPet}
                disabled={isLoading}
                className="w-full"
              >
                Kill Pet
              </Button>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Reset Pet</h3>
              <Button 
                variant="secondary" 
                onClick={handleResetPet}
                disabled={isLoading}
                className="w-full"
              >
                Reset Pet
              </Button>
            </div>
          </div>
        </PixelatedContainer>

        {/* Account Management Section */}
        <PixelatedContainer className="p-6">
          <h2 className="text-xl font-bold mb-4">Account Management</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Delete Account</h3>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="w-full"
              >
                Delete Account
              </Button>
            </div>
          </div>
        </PixelatedContainer>

        {/* Points Management Section */}
        <PixelatedContainer className="p-6">
          <h2 className="text-xl font-bold mb-4">Points Management</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Give Points</h3>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Enter amount of points"
                  className="flex-1"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                />
                <Button 
                  onClick={handleGivePoints}
                  disabled={isLoading}
                >
                  Give Points
                </Button>
              </div>
            </div>
          </div>
        </PixelatedContainer>
      </div>
    </div>
  );
} 