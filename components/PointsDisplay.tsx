import React, { useState, useEffect } from 'react';
import { usePoints } from '../hooks/usePoints';
import { dbService } from '../lib/database-service';
import { pointsManager } from '../lib/points-manager';

interface PointsDisplayProps {
  walletAddress?: string;
  className?: string;
}

export function PointsDisplay({ walletAddress, className = '' }: PointsDisplayProps) {
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const { pointsData, fetchPointsData } = usePoints({
    walletAddress,
    autoFetch: !!walletAddress
  });

  // Animation effect when points change
  useEffect(() => {
    if (pointsData && pointsData.points !== animatedPoints && !isAnimating) {
      const startValue = animatedPoints;
      const endValue = pointsData.points;
      const duration = 1000; // 1 second
      const startTime = Date.now();
      
      setIsAnimating(true);
      
      const animatePoints = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        
        if (elapsed < duration) {
          const progress = elapsed / duration;
          const current = Math.round(startValue + (endValue - startValue) * progress);
          setAnimatedPoints(current);
          requestAnimationFrame(animatePoints);
        } else {
          setAnimatedPoints(endValue);
          setIsAnimating(false);
        }
      };
      
      requestAnimationFrame(animatePoints);
    }
  }, [pointsData, animatedPoints, isAnimating]);

  // Initial points value
  useEffect(() => {
    if (pointsData && animatedPoints === 0) {
      setAnimatedPoints(pointsData.points);
    }
  }, [pointsData, animatedPoints]);

  // Subscribe to real-time updates from both database and points manager
  useEffect(() => {
    if (!walletAddress) return;
    
    // Subscribe to user data changes from database
    const dbUnsubscribe = dbService.subscribeToChanges('user', (data: any) => {
      if (data.walletAddress === walletAddress) {
        fetchPointsData(walletAddress);
      }
    });
    
    // Subscribe to point transactions directly from points manager
    const pointsUnsubscribe = pointsManager.onTransaction((tx) => {
      if (tx.walletAddress === walletAddress) {
        fetchPointsData(walletAddress);
      }
    });
    
    return () => {
      dbUnsubscribe();
      pointsUnsubscribe();
    };
  }, [walletAddress, fetchPointsData]);

  if (!pointsData) {
    return <div className={`${className} text-gray-500`}>Loading points...</div>;
  }

  return (
    <div className={`${className} relative`}>
      <span className="points-value">{animatedPoints}</span>
      <span className="text-xs ml-1">Points</span>
      
      {/* Points change indicator */}
      {pointsData.recentGain > 0 && (
        <div className="absolute -top-5 right-0 text-green-500 animate-bounce transition-opacity duration-1000 opacity-100">
          +{pointsData.recentGain}
        </div>
      )}
      
      {/* Multiplier indicator if greater than 1 */}
      {pointsData.multiplier > 1 && (
        <div className="text-xs text-yellow-500 ml-2">
          {pointsData.multiplier}x
        </div>
      )}
    </div>
  );
} 