import React, { useState, useEffect } from 'react';
import { useUserData } from '@/context/UserDataContext';

interface PointsDisplayProps {
  points?: number;
  claimedPoints?: number;
  multiplier?: number;
  isLoading?: boolean;
  lastUpdated?: number;
  className?: string;
}

export function PointsDisplay({ 
  points: externalPoints, 
  claimedPoints: externalClaimedPoints,
  multiplier: externalMultiplier,
  isLoading: externalIsLoading,
  lastUpdated,
  className = '' 
}: PointsDisplayProps) {
  const { userData, isLoading: contextIsLoading } = useUserData();
  const [animatedPoints, setAnimatedPoints] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Determine whether to use props or context
  const points = externalPoints !== undefined ? externalPoints : userData.points;
  const multiplier = externalMultiplier !== undefined ? externalMultiplier : userData.multiplier;
  const isLoading = externalIsLoading !== undefined ? externalIsLoading : contextIsLoading;

  // Animation effect when points change
  useEffect(() => {
    if (points !== animatedPoints && !isAnimating) {
      const startValue = animatedPoints;
      const endValue = points;
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
  }, [points, animatedPoints, isAnimating]);

  // Initial points value
  useEffect(() => {
    if (points && animatedPoints === 0) {
      setAnimatedPoints(points);
    }
  }, [points, animatedPoints]);

  if (isLoading) {
    return <div className={`${className} text-gray-500`}>Loading points...</div>;
  }

  return (
    <div className={`${className} relative`}>
      <span className="points-value">{animatedPoints}</span>
      <span className="text-xs ml-1">Points</span>
      
      {/* Last updated timestamp if provided */}
      {lastUpdated && (
        <div className="text-xs text-gray-500 mt-1">
          Updated: {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      )}
      
      {/* Multiplier indicator if greater than 1 */}
      {multiplier > 1 && (
        <div className="text-xs text-yellow-500 ml-2">
          {multiplier}x
        </div>
      )}
    </div>
  );
} 