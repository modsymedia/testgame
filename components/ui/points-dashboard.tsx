import React, { useEffect, useState } from 'react';
import PixelatedContainer from '@/components/PixelatedContainer';
import { PointsEarnedPanel } from './points-earned-panel';

interface PointsDashboardProps {
  points: number;
  tokenPrice: number;
  claimedPoints: number;
  dollarsCollected: number;
  publicKey: string;
}

export const PointsDashboard = ({
  points,
  tokenPrice,
  claimedPoints,
  dollarsCollected,
  publicKey,
}: PointsDashboardProps) => {
  const potentialRewards = points * tokenPrice;
  
  // Dynamic state for points earned panel
  const [pointsPerSecond, setPointsPerSecond] = useState(1.3);
  const [timeUntilUpdate, setTimeUntilUpdate] = useState(30.0);
  const [progress, setProgress] = useState(0);
  const [nextPoints, setNextPoints] = useState(points + 10);
  
  // Simulate dynamic updates based on game state
  useEffect(() => {
    // Fixed values
    const MAX_TIMER = 30.0;
    const UPDATE_INTERVAL = 1000; // 1 second
    const PROGRESS_INCREMENT = 100 / (MAX_TIMER); // Progress increment per second
    
    // Update progress every second
    const progressInterval = setInterval(() => {
      // Update progress bar
      setProgress((prev) => {
        const newProgress = prev + PROGRESS_INCREMENT;
        if (newProgress >= 100) {
          return 0; // Reset progress when it reaches 100%
        }
        return newProgress;
      });
      
      // Update time until next update
      setTimeUntilUpdate((prev) => {
        const newTime = parseFloat((prev - 1).toFixed(1));
        if (newTime <= 0) {
          // When timer reaches 0, update points and reset timer
          setNextPoints(points + Math.round(10 + Math.random() * 5));
          return MAX_TIMER;
        }
        return newTime;
      });
    }, UPDATE_INTERVAL);
    
    // Update points per second occasionally (every 15 seconds)
    const rateInterval = setInterval(() => {
      // Random fluctuation in points per second between 1.0 and 2.5
      setPointsPerSecond(parseFloat((1 + Math.random() * 1.5).toFixed(1)));
    }, 15000);
    
    return () => {
      clearInterval(progressInterval);
      clearInterval(rateInterval);
    };
  }, [points]);
  
  // Points earned section data - dynamic except for task rewards
  const pointsEarnedData = {
    currentPoints: points,
    nextPoints: nextPoints,
    pointsPerSecond: pointsPerSecond,
    timeUntilUpdate: timeUntilUpdate,
    progress: progress,
  };

  return (
    <div className="max-w-7xl mx-auto flex gap-6">
      {/* Left side - Leaderboard */}
      <div className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* My Points */}
          <PixelatedContainer>
            <div className="w-full">
              <h2 className="text-[24px] font-sk-eliz text-[#304700] mb-2">My Points</h2>
              <div className="text-[32px] font-sk-eliz text-[#304700] mb-2">
                {Math.round(points).toLocaleString()}
              </div>
              <p className="text-[16px] font-sk-eliz text-[#304700]">
                Earn more points by playing Gochi
              </p>
            </div>
          </PixelatedContainer>

          {/* Potential Rewards */}
          <PixelatedContainer>
            <div className="w-full">
              <h2 className="text-[24px] font-sk-eliz text-[#304700] mb-2">Potential Rewards</h2>
              <div className="text-[32px] font-sk-eliz text-[#304700] mb-2">
                ${potentialRewards.toFixed(2)}
              </div>
              <p className="text-[16px] font-sk-eliz text-[#304700]">
                Token price × Points = ${tokenPrice.toFixed(2)} × {Math.round(points)}
              </p>
            </div>
          </PixelatedContainer>

          {/* Claimed Points */}
          <PixelatedContainer className="md:col-span-2">
            <div className="w-full flex justify-between items-start">
              <div>
                <h2 className="text-[24px] font-sk-eliz text-[#304700] mb-2">Claimed Points</h2>
                <div className="text-[32px] font-sk-eliz text-[#304700] mb-2">
                  {Math.round(claimedPoints).toLocaleString()}
                </div>
                <p className="text-[16px] font-sk-eliz text-[#304700]">
                  Total points converted to rewards
                </p>
              </div>
              <div className="text-right">
                <div className="text-[32px] font-sk-eliz text-[#304700] mb-2">
                  $ {dollarsCollected}
                </div>
                <p className="text-[16px] font-sk-eliz text-[#304700]">
                  Total USD value collected
                </p>
              </div>
            </div>
          </PixelatedContainer>

          {/* Wallet Information */}
          <PixelatedContainer className="md:col-span-2">
            <div className="w-full">
              <h2 className="text-[24px] font-sk-eliz text-[#304700] mb-2">Wallet Information</h2>
              <p className="font-mono text-[16px] text-[#304700] break-all">
                {publicKey || "Not connected"}
              </p>
            </div>
          </PixelatedContainer>
        </div>
      </div>

      {/* Right side - Points Earned */}
      <div className="w-[320px]">
        <PointsEarnedPanel {...pointsEarnedData} />
      </div>
    </div>
  );
}; 