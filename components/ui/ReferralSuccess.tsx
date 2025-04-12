"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ReferralSuccess = () => {
  const [visible, setVisible] = useState(false);
  const [referralData, setReferralData] = useState<{
    referrer?: string;
    pointsAwarded?: number;
  }>({});
  
  useEffect(() => {
    // Check if there's a successful referral in session storage
    const referralSuccess = sessionStorage.getItem('referralSuccess');
    
    if (referralSuccess) {
      try {
        const parsedData = JSON.parse(referralSuccess);
        if (parsedData.success) {
          setReferralData({
            referrer: parsedData.referrer,
            pointsAwarded: parsedData.pointsAwarded
          });
          setVisible(true);
          
          // Clear after 5 seconds
          const timer = setTimeout(() => {
            setVisible(false);
            sessionStorage.removeItem('referralSuccess');
          }, 5000);
          
          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Error parsing referral success data:', error);
      }
    }
  }, []);
  
  if (!visible) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="fixed top-20 right-4 z-50 max-w-md"
      >
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded shadow-lg">
          <div className="flex items-center">
            <div className="py-1">
              <svg className="fill-current h-6 w-6 text-green-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold">Referral Successful!</p>
              <p className="text-sm">You&apos;ve been successfully referred and earned {referralData.pointsAwarded || 100} bonus points.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ReferralSuccess; 