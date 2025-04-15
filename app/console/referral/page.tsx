"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useUserData } from '@/context/UserDataContext';
import PixelatedContainer from '@/components/game/PixelatedContainerBig';
import { Button } from '@/components/ui/forms/button';
import Image from 'next/image';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Check, Copy, Share } from 'lucide-react';
import UidGenerator from '@/components/referral/UidGenerator';

interface ReferredUser {
  username: string;
  walletAddress: string;
  joinedAt: string;
  pointsEarned: number;
}

export default function ReferralPage() {
  const { publicKey, isConnected } = useWallet();
  const { userData } = useUserData();
  const [referralLink, setReferralLink] = useState<string>('');
  const [referredUsers, setReferredUsers] = useState<ReferredUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [totalEarned, setTotalEarned] = useState<number>(0);

  // Define fetchReferredUsers as a memoized function to add it to dependencies
  const fetchReferredUsers = useCallback(async () => {
    if (!publicKey) return;
    
    setIsLoading(true);
    
    try {
      console.log('Fetching referred users via API route');
      
      // Use API route instead of direct database access
      const response = await fetch(`/api/referral?wallet=${publicKey}`);
      
      if (!response.ok) {
        console.warn(`API responded with status: ${response.status}`);
        
        // Use mock data if API fails
        console.log('Using mock data due to API failure');
        
        // Show empty state for now - in a real app you might want to show mock data
        setReferredUsers([]);
        setTotalEarned(0);
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Referrals API response:', data);
      
      if (data.success && data.referrals) {
        setReferredUsers(data.referrals);
        
        // Calculate total earned from referrals
        const total = data.referrals.reduce((sum: number, user: any) => 
          sum + (user.pointsEarned || 0), 0);
        
        setTotalEarned(total);
      } else {
        console.warn('API returned success: false or no referrals data');
        setReferredUsers([]);
        setTotalEarned(0);
      }
    } catch (error) {
      console.error('Error fetching referred users:', error);
      
      // If the error is server related, show a more helpful message in development
      if (process.env.NODE_ENV === 'development') {
        console.log('For debugging purposes:');
        console.log('1. Check if your database connection is properly configured');
        console.log('2. Verify CORS settings if accessing database directly');
        console.log('3. Try accessing the API route directly in browser: /api/referral?wallet=your_wallet_address');
      }
      
      setReferredUsers([]);
      setTotalEarned(0);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey]);

  useEffect(() => {
    // Add debug logs to check values
    console.log('Referral Page - User Data:', userData);
    console.log('Referral Page - UID exists:', Boolean(userData.uid));
    console.log('Referral Page - UID value:', userData.uid);
    console.log('Referral Page - Is Connected:', isConnected);
    console.log('Referral Page - Public Key:', publicKey);
    
    if (isConnected && publicKey) {
      // Create referral link - try to use UID first, but fall back to public key if needed
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      
      if (userData.uid) {
        // Use UID as intended
        const link = `${baseUrl}/?ref=${userData.uid}`;
        console.log('Referral Page - Generated Link with UID:', link);
        setReferralLink(link);
      } else {
        // Fallback to using a portion of public key
        const fallbackId = publicKey.slice(0, 8);
        const link = `${baseUrl}/?ref=${fallbackId}`;
        console.log('Referral Page - Generated FALLBACK Link with public key part:', link);
        setReferralLink(link);
      }
      
      // Fetch referred users
      fetchReferredUsers();
    } else {
      console.log('Referral Page - Conditions not met for link generation:',
        {isConnected, hasPublicKey: Boolean(publicKey), hasUid: Boolean(userData.uid)});
    }
  }, [isConnected, publicKey, userData, fetchReferredUsers]);

  const handleCopyLink = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on Gochi Game!',
          text: 'Use my referral link to join Gochi Game and earn rewards!',
          url: referralLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copying to clipboard
      handleCopyLink();
    }
  };

  return (
    <div className="container mx-auto max-w-4xl pt-16 md:pt-20 px-4">
      {/* Add UidGenerator to ensure UID exists */}
      <UidGenerator />
      
      <h1 className="text-3xl font-bold text-center mb-8 text-[#304700]">Referral Program</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Referral Link Section */}
        <PixelatedContainer className="p-4 md:p-6 min-h-[200px]">
          <h2 className="text-xl font-bold mb-4 text-[#304700]">Your Referral Link</h2>
          <p className="mb-4 text-sm text-[#304700]">
            Share this link with friends. When they join, you&apos;ll both earn rewards!
          </p>
          
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gray-100 p-2 rounded-md flex-1 truncate text-sm">
              {referralLink}
            </div>
            <CopyToClipboard text={referralLink} onCopy={handleCopyLink}>
              <Button variant="outline" size="icon" className="h-10 w-10">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </CopyToClipboard>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleShare} 
              className="flex-1 bg-[#8fbe37] hover:bg-[#a3d64a] text-white"
            >
              <Share className="h-4 w-4 mr-2" /> Share
            </Button>
            <CopyToClipboard text={referralLink} onCopy={handleCopyLink}>
              <Button 
                variant="outline" 
                className="flex-1"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </Button>
            </CopyToClipboard>
          </div>
        </PixelatedContainer>
        
        {/* Stats Section */}
        <PixelatedContainer className="p-4 md:p-6 min-h-[200px]">
          <h2 className="text-xl font-bold mb-4 text-[#304700]">Your Referral Stats</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#ebffb7] p-3 rounded-md">
              <p className="text-sm text-[#304700] mb-1">Total Referrals</p>
              <p className="text-2xl font-bold text-[#304700]">{referredUsers.length}</p>
            </div>
            <div className="bg-[#ebffb7] p-3 rounded-md">
              <p className="text-sm text-[#304700] mb-1">Points Earned</p>
              <div className="flex items-center">
                <Image
                  src="/assets/icons/coin.png"
                  width={20}
                  height={20}
                  alt="Points"
                  className="mr-1"
                />
                <p className="text-2xl font-bold text-[#304700]">{totalEarned}</p>
              </div>
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-sm text-[#304700]">
              Earn <span className="font-bold">100 points</span> for each friend who joins and plays!
            </p>
          </div>
        </PixelatedContainer>
      </div>
      
      {/* Referred Users Section */}
      <PixelatedContainer className="p-4 md:p-6 mt-6">
        <h2 className="text-xl font-bold mb-4 text-[#304700]">Your Referrals</h2>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p>Loading referrals...</p>
          </div>
        ) : referredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#ebffb7]">
                <tr>
                  <th className="px-4 py-2 text-left text-[#304700]">Username</th>
                  <th className="px-4 py-2 text-left text-[#304700]">Joined</th>
                  <th className="px-4 py-2 text-right text-[#304700]">Points Earned</th>
                </tr>
              </thead>
              <tbody>
                {referredUsers.map((user, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-3 text-[#304700]">{user.username}</td>
                    <td className="px-4 py-3 text-[#304700]">{user.joinedAt}</td>
                    <td className="px-4 py-3 text-right text-[#304700]">
                      <div className="flex items-center justify-end">
                        <Image
                          src="/assets/icons/coin.png"
                          width={16}
                          height={16}
                          alt="Points"
                          className="mr-1"
                        />
                        {user.pointsEarned}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-[#304700] mb-4">You haven&apos;t referred anyone yet.</p>
            <p className="text-sm text-[#304700]">
              Share your referral link with friends to start earning rewards!
            </p>
          </div>
        )}
      </PixelatedContainer>
    </div>
  );
} 