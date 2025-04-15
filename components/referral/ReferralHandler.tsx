"use client";

import { useEffect, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useSearchParams } from 'next/navigation';

export default function ReferralHandler() {
  const { publicKey, isConnected } = useWallet();
  const searchParams = useSearchParams();
  const [processed, setProcessed] = useState(false);

  useEffect(() => {
    // Check for referral code in URL
    const refCode = searchParams?.get('ref');
    
    if (refCode && isConnected && publicKey && !processed) {
      // Store referral code in localStorage if user is not logged in yet
      if (!localStorage.getItem('pendingReferral')) {
        localStorage.setItem('pendingReferral', refCode);
        console.log('Stored referral code for later processing:', refCode);
      }
      
      // If user is logged in, process the referral
      processReferral(refCode);
    }
    
    // Check for pending referral when user logs in
    if (isConnected && publicKey && !processed) {
      const pendingReferral = localStorage.getItem('pendingReferral');
      if (pendingReferral) {
        processReferral(pendingReferral);
      }
    }
  }, [isConnected, publicKey, searchParams, processed]);

  const processReferral = async (referralCode: string) => {
    // Avoid processing referrals multiple times
    if (processed || !publicKey) return;
    
    try {
      console.log('Processing referral with code:', referralCode);
      
      // Make API call to process referral
      const response = await fetch('/api/referral', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWallet: publicKey,
          referralCode: referralCode
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('Referral processed successfully:', result);
        // Clear the stored referral code
        localStorage.removeItem('pendingReferral');
        
        // Show a notification or modal to inform the user
        // This could be implemented with a toast notification or a modal
        // For now, we'll just log to console
      } else {
        console.warn('Failed to process referral:', result.error);
      }
    } catch (error) {
      console.error('Error processing referral:', error);
    } finally {
      // Mark as processed regardless of result to avoid repeated processing
      setProcessed(true);
      
      // Remove referral parameter from URL after a short delay
      // This gives other navigation logic (like redirecting to /console/gotchi) a chance to run
      setTimeout(() => {
        if (window.history && window.history.replaceState && searchParams) {
          const searchParamsString = searchParams.toString();
          // Ensure removal logic handles edge cases (ref at end or middle)
          const newSearchParams = searchParamsString
            .replace(/ref=[^&]+&/, '') // Remove ref if followed by &
            .replace(/&ref=[^&]+/, '')  // Remove ref if preceded by &
            .replace(/\?ref=[^&]+$/, '') // Remove ref if it's the only param
            .replace(/^ref=[^&]+$/, ''); // Remove ref if it's the only param without ?
            
          const newUrl = window.location.pathname + (newSearchParams ? `?${newSearchParams}` : '');
          
          // Only replace if the URL actually changed
          if (newUrl !== window.location.pathname + window.location.search) {
             console.log('ReferralHandler - Cleaning up URL to:', newUrl);
             window.history.replaceState({}, '', newUrl);
          }
        }
      }, 500); // Delay URL cleanup by 500ms
    }
  };

  // This component doesn't render anything
  return null;
} 