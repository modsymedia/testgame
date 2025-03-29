import React from 'react';
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

  // Points earned section data
  const pointsEarnedData = {
    currentPoints: points,
    nextPoints: points + 10,
    pointsPerSecond: 1.3,
    timeUntilUpdate: 4.0,
    progress: 60, // Example progress percentage
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
                {points.toLocaleString()}
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
                Token price × Points = ${tokenPrice.toFixed(2)} × {points}
              </p>
            </div>
          </PixelatedContainer>

          {/* Claimed Points */}
          <PixelatedContainer className="md:col-span-2">
            <div className="w-full flex justify-between items-start">
              <div>
                <h2 className="text-[24px] font-sk-eliz text-[#304700] mb-2">Claimed Points</h2>
                <div className="text-[32px] font-sk-eliz text-[#304700] mb-2">
                  {claimedPoints.toLocaleString()}
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