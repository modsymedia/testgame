import React, { useEffect, useState, useCallback } from 'react';
import PixelatedContainer from '@/components/game/PixelatedContainer';
import { PointsEarnedPanel } from './points-earned-panel';
import { GPTLogsPanel } from './gpt-logs-panel';
import { useWallet } from '@/context/WalletContext';
import { dbService } from '@/lib/database-service';

interface PointsDashboardProps {
  points: number;
  tokenPrice: number;
  claimedPoints: number;
  dollarsCollected: number;
  publicKey: string;
}

export const PointsDashboard = ({
  points: initialPoints,
  tokenPrice,
  claimedPoints: initialClaimedPoints,
  dollarsCollected,
  publicKey,
}: PointsDashboardProps) => {
  const { walletData } = useWallet();
  
  // State for current points and claimed points
  const [currentPoints, setCurrentPoints] = useState(initialPoints);
  const [currentClaimedPoints, setCurrentClaimedPoints] = useState(initialClaimedPoints);
  
  // State for points earned panel - using real data from wallet
  const [pointsPerSecond, setPointsPerSecond] = useState(1.3);
  const [timeUntilUpdate, setTimeUntilUpdate] = useState(30.0);
  const [progress, setProgress] = useState(0);
  const [nextPoints, setNextPoints] = useState(currentPoints + 10);
  
  // Get user multiplier from wallet data
  const pointsMultiplier = walletData?.multiplier || 1.0;
  
  // Fetch latest wallet data
  const refreshWalletData = useCallback(async () => {
    if (!publicKey) return;
    
    try {
      const freshData = await dbService.getUserData(publicKey);
      if (freshData) {
        setCurrentPoints(freshData.points || 0);
        setCurrentClaimedPoints(freshData.claimedPoints || 0);
        console.log('Dashboard data refreshed:', freshData.points);
      }
    } catch (error) {
      console.error('Failed to refresh wallet data:', error);
    }
  }, [publicKey]);
  
  // Refresh data when component mounts or publicKey changes
  useEffect(() => {
    refreshWalletData();
    
    // Set up interval to periodically refresh data (every 30 seconds)
    const refreshInterval = setInterval(refreshWalletData, 30000);
    
    return () => clearInterval(refreshInterval);
  }, [refreshWalletData]);
  
  // Calculate next update time based on real-world data
  const calculateTimeUntilNextUpdate = useCallback(() => {
    if (!walletData?.lastLogin) return 30.0;
    
    // Points update every 30 seconds in the real system
    const POINTS_UPDATE_INTERVAL = 30 * 1000; // 30 seconds in milliseconds
    const lastUpdate = walletData.lastLogin;
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdate;
    const timeRemaining = Math.max(0, POINTS_UPDATE_INTERVAL - (timeSinceLastUpdate % POINTS_UPDATE_INTERVAL));
    
    return parseFloat((timeRemaining / 1000).toFixed(1)); // Convert to seconds
  }, [walletData?.lastLogin]);
  
  // Calculate progress percentage
  const calculateProgress = useCallback(() => {
    if (!walletData?.lastLogin) return 0;
    
    const POINTS_UPDATE_INTERVAL = 30 * 1000; // 30 seconds
    const lastUpdate = walletData.lastLogin;
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdate;
    const progress = ((timeSinceLastUpdate % POINTS_UPDATE_INTERVAL) / POINTS_UPDATE_INTERVAL) * 100;
    
    return Math.min(100, Math.max(0, progress)); // Ensure it's between 0-100%
  }, [walletData?.lastLogin]);
  
  // Calculate points per second based on real data
  const calculatePointsPerSecond = useCallback(() => {
    // Base points rate from system, multiplied by user's multiplier
    const basePointsRate = 1.2; // Points earned per second base rate
    return parseFloat((basePointsRate * (walletData?.multiplier || 1.0)).toFixed(1));
  }, [walletData?.multiplier]);
  
  // Initialize values on component mount and when wallet data changes
  useEffect(() => {
    if (walletData) {
      // Initialize with real values from wallet data
      setPointsPerSecond(calculatePointsPerSecond());
      setTimeUntilUpdate(calculateTimeUntilNextUpdate());
      setProgress(calculateProgress());
      setNextPoints(currentPoints + Math.round(10 * (walletData.multiplier || 1.0)));
    }
  }, [walletData, currentPoints, calculatePointsPerSecond, calculateTimeUntilNextUpdate, calculateProgress]);
  
  // Update the timer and progress bar every second
  useEffect(() => {
    if (!walletData) return;
    
    const interval = setInterval(() => {
      setTimeUntilUpdate(calculateTimeUntilNextUpdate());
      setProgress(calculateProgress());
    }, 1000);
    
    return () => clearInterval(interval);
  }, [walletData, calculateTimeUntilNextUpdate, calculateProgress]);
  
  // Calculate potential rewards based on current points
  const potentialRewards = currentPoints * tokenPrice;
  
  // Prepare the points data to pass to the panel
  const pointsEarnedData = {
    currentPoints: currentPoints,
    nextPoints: nextPoints,
    pointsPerSecond: pointsPerSecond,
    timeUntilUpdate: timeUntilUpdate,
    progress: progress,
    pointsMultiplier: pointsMultiplier
  };

  return (
    <div className="max-w-7xl mx-auto flex gap-6 flex-wrap">
      {/* Left side - Leaderboard */}
      <div className="flex-1 min-w-[300px]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Points */}
          <PixelatedContainer>
            <div className="w-full">
              <h2 className="text-2xl font-pixelify text-[#304700] mb-2 font-bold">My Points</h2>
              <div className="text-2xl font-pixelify text-[#304700] mb-2 font-bold">
                <span className="font-numbers">{Math.round(currentPoints).toLocaleString()}</span>
              </div>
              <p className="text-lg font-pixelify text-[#304700]">
                Earn more points by playing Gochi
              </p>
            </div>
          </PixelatedContainer>

          {/* Potential Rewards */}
          <PixelatedContainer>
            <div className="w-full">
              <h2 className="text-2xl font-pixelify text-[#304700] mb-2 font-bold">Potential Rewards</h2>
              <div className="text-2xl font-pixelify text-[#304700] mb-2 font-bold">
                $<span className="font-numbers">{potentialRewards.toFixed(2)}</span>
              </div>
              <p className="text-lg font-pixelify text-[#304700]">
                Token price × Points = $<span className="font-numbers">{tokenPrice.toFixed(2)}</span> × <span className="font-numbers">{Math.round(currentPoints)}</span>
              </p>
            </div>
          </PixelatedContainer>

          {/* Claimed Points */}
          <PixelatedContainer className="md:col-span-2">
            <div className="w-full flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-pixelify text-[#304700] mb-2 font-bold">Claimed Points</h2>
                <div className="text-2xl font-pixelify text-[#304700] mb-2 font-bold">
                  <span className="font-numbers">{Math.round(currentClaimedPoints).toLocaleString()}</span>
                </div>
                <p className="text-lg font-pixelify text-[#304700]">
                  Total points converted to rewards
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-pixelify text-[#304700] mb-2 font-bold">
                  $ <span className="font-numbers">{dollarsCollected}</span>
                </div>
                <p className="text-lg font-pixelify text-[#304700]">
                  Total USD value collected
                </p>
              </div>
            </div>
          </PixelatedContainer>

          {/* Wallet Information */}
          <PixelatedContainer className="md:col-span-2">
            <div className="w-full">
              <h2 className="text-2xl font-pixelify text-[#304700] mb-2 font-bold">Wallet Information</h2>
              <p className="font-mono text-lg text-[#304700] break-all">
                {publicKey || "Not connected"}
              </p>
              {walletData?.username && (
                <p className="text-lg font-pixelify text-[#304700] mt-2">
                  Pet Name: {walletData.username}
                </p>
              )}
            </div>
          </PixelatedContainer>
        </div>
      </div>

      {/* Right side - GPT Logs */}
      <div className="w-[320px]">
        <GPTLogsPanel />
      </div>
    </div>
  );
}; 
