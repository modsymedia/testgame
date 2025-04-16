"use client";

import { useEffect, useState, useCallback } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useUserData } from '@/context/UserDataContext';
import { useSearchParams } from 'next/navigation';

export default function ReferralHandler() {
  const { isConnected } = useWallet();
  const { userData } = useUserData();
  const [processed, setProcessed] = useState(false);
  const searchParams = useSearchParams();

  const processReferral = useCallback(async (referralCode: string) => {
    if (processed || !userData?.uid) return;
    
    setProcessed(true);
    
    try {
      console.log(`Processing referral for UID: ${userData.uid} with code: ${referralCode}`);
      
      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userUid: userData.uid,
          referralCode: referralCode
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Referral processed successfully:', result);
        localStorage.removeItem('pendingReferral');
      } else {
        console.warn('Failed to process referral:', result.error);
        setProcessed(false);
      }
    } catch (error) {
      console.error('Error processing referral:', error);
      setProcessed(false);
    }
  }, [processed, userData?.uid, setProcessed]);

  useEffect(() => {
    const refCode = searchParams?.get('ref');
    
    if (refCode && isConnected && userData?.uid && !processed) {
      if (!localStorage.getItem('pendingReferral')) {
        localStorage.setItem('pendingReferral', refCode);
        console.log('Stored referral code for later processing:', refCode);
      }
      processReferral(refCode);
    }
    
    if (isConnected && userData?.uid && !processed) {
      const pendingReferral = localStorage.getItem('pendingReferral');
      if (pendingReferral) {
        processReferral(pendingReferral);
      }
    }
  }, [isConnected, userData?.uid, searchParams, processed, processReferral]);

  return null;
} 