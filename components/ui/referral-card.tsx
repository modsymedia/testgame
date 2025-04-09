import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/forms/button';
import { Input } from '@/components/ui/forms/input';
import { toast } from '@/components/ui/use-toast';

export interface ReferralCardProps {
  referralCode?: string | null;
  referralCount?: number;
  walletConnected?: boolean;
  walletAddress?: string;
}

interface ReferralData {
  referralCode: string;
  referralCount: number;
  referralPoints: number;
}

export function ReferralCard({ walletAddress }: ReferralCardProps) {
  const [referralData, setReferralData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [applyCode, setApplyCode] = useState<string>('');
  const [applying, setApplying] = useState<boolean>(false);
  
  useEffect(() => {
    // Don't fetch if no wallet address is provided
    if (!walletAddress) return;
    
    async function fetchReferralData() {
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/points?walletAddress=${walletAddress}`);
        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch referral data');
        }
        
        setReferralData({
          referralCode: data.referralCode,
          referralCount: data.referralCount,
          referralPoints: data.referralPoints
        });
      } catch (err) {
        console.error('Error fetching referral data:', err);
        setError('Failed to load referral data. Please try again later.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchReferralData();
  }, [walletAddress]);
  
  const handleCopyCode = () => {
    if (!referralData?.referralCode) return;
    
    navigator.clipboard.writeText(referralData.referralCode)
      .then(() => {
        toast({
          title: "Copied to clipboard!",
          description: "Your referral code has been copied.",
          duration: 3000
        });
      })
      .catch(err => {
        console.error('Failed to copy code:', err);
        toast({
          title: "Failed to copy",
          description: "Please try copying manually.",
          variant: "destructive",
          duration: 3000
        });
      });
  };
  
  const handleApplyCode = async () => {
    if (!walletAddress || !applyCode) return;
    
    setApplying(true);
    setError(null);
    
    try {
      // First check if code is valid
      const checkResponse = await fetch(`/api/referral?code=${applyCode}`);
      const checkData = await checkResponse.json();
      
      if (!checkData.success) {
        throw new Error(checkData.error || 'Invalid referral code');
      }
      
      // Apply the referral
      const applyResponse = await fetch('/api/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress,
          referralCode: applyCode
        }),
      });
      
      const applyData = await applyResponse.json();
      
      if (!applyData.success) {
        throw new Error(applyData.error || 'Failed to apply referral code');
      }
      
      toast({
        title: "Referral applied!",
        description: applyData.bonusAwarded 
          ? `Referral bonus of ${applyData.bonusAwarded} points awarded to referrer!` 
          : "Referral applied successfully. You need 100 points to trigger the referral bonus.",
        duration: 5000
      });
      
      setApplyCode('');
    } catch (err) {
      console.error('Error applying referral code:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply referral code');
    } finally {
      setApplying(false);
    }
  };
  
  const shareReferralLink = () => {
    if (!referralData?.referralCode) return;
    
    const shareText = `Join me on GOCHI Game! Use my referral code: ${referralData.referralCode} to get started!`;
    const shareUrl = `${window.location.origin}?ref=${referralData.referralCode}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'GOCHI Game Referral',
        text: shareText,
        url: shareUrl,
      })
      .catch(err => console.error('Error sharing:', err));
    } else {
      // Fallback to copying the full message
      navigator.clipboard.writeText(`${shareText} ${shareUrl}`)
        .then(() => {
          toast({
            title: "Copied to clipboard!",
            description: "Referral link and message copied. Paste it to share with friends!",
            duration: 3000
          });
        })
        .catch(err => console.error('Failed to copy:', err));
    }
  };
  
  if (!walletAddress) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center text-gray-500 dark:text-gray-400">
          Connect your wallet to access referrals
        </p>
      </div>
    );
  }
  
  if (loading && !referralData) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800">
        <p className="text-center">Loading referral data...</p>
      </div>
    );
  }
  
  if (error && !referralData) {
    return (
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-red-300 dark:border-red-700">
        <p className="text-center text-red-500">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-lg">Referral Program</h3>
        {referralData && (
          <div className="text-sm bg-green-100 dark:bg-green-900 px-2 py-1 rounded-md">
            {referralData.referralCount} Referrals
          </div>
        )}
      </div>
      
      {/* Your Referral Code */}
      {referralData && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Share your referral code and earn 10% of your friends&apos; points (up to 1,000 points per referral)
          </p>
          
          <div className="flex gap-2">
            <div className="flex-1 p-2 bg-white dark:bg-gray-700 rounded-md border border-gray-300 dark:border-gray-600 font-mono">
              {referralData.referralCode}
            </div>
            <Button variant="outline" onClick={handleCopyCode}>
              Copy
            </Button>
            <Button variant="secondary" onClick={shareReferralLink}>
              Share
            </Button>
          </div>
          
          <div className="flex justify-between text-sm mt-2">
            <span>Referral Points:</span>
            <span className="font-medium">{referralData.referralPoints.toLocaleString()} points</span>
          </div>
        </div>
      )}
      
      {/* Apply Referral Code */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <p className="text-sm">Were you referred by someone? Enter their code below:</p>
        
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Enter referral code"
            value={applyCode}
            onChange={(e) => setApplyCode(e.target.value)}
            className="flex-1"
          />
          <Button 
            onClick={handleApplyCode} 
            disabled={applying || !applyCode.trim()}
          >
            {applying ? 'Applying...' : 'Apply'}
          </Button>
        </div>
        
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
      
      {/* Referral Benefits */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-sm font-medium mb-2">Benefits</h4>
        <ul className="text-sm space-y-1 list-disc list-inside text-gray-600 dark:text-gray-300">
          <li>Both you and your friend get rewards</li>
          <li>Increase your points cap by 500 for each referral</li>
          <li>Earn up to 1,000 points per successful referral</li>
        </ul>
      </div>
    </div>
  );
} 
