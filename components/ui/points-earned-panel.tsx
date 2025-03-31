import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import PixelatedContainer from '@/components/PixelatedContainer';
import { motion, AnimatePresence } from 'framer-motion';

interface PointsEarnedPanelProps {
  currentPoints: number;
  className?: string;
  pointsMultiplier?: number;
  onPointsEarned?: (points: number) => void;
}

// Static task rewards data
const TASK_REWARDS = [
  { icon: '/assets/icons/foods/food-fish.png', name: 'Feed', points: 15 },
  { icon: '/assets/icons/games/game-ball.png', name: 'Play', points: 20 },
  { icon: '/assets/icons/hygiene/hygiene-bath.png', name: 'Clean', points: 18 },
  { icon: '/assets/icons/healings/vaccine.png', name: 'Heal', points: 25 },
];

// Helper function to get health icon based on points value
const getHealthIcon = (points: number) => {
  if (points <= 15) return '/assets/icons/healings/healing.png';
  if (points <= 20) return '/assets/icons/healings/medicine.png';
  if (points <= 25) return '/assets/icons/healings/vaccine.png';
  return '/assets/icons/healings/surgery.png';
};

// Points notification component 
const PointsAddedNotification = ({ amount }: { amount: number }) => {
  return (
    <motion.div
      className="absolute -top-8 right-4 bg-[#304700] text-[#ebffb7] px-2 py-1 rounded-md font-pixelify"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5 }}
    >
      +{amount} points
    </motion.div>
  );
};

export const PointsEarnedPanel = ({
  currentPoints,
  className,
  pointsMultiplier = 1.0,
  onPointsEarned
}: PointsEarnedPanelProps) => {
  // Fixed values
  const TIMER_DURATION = 10; // 10 seconds per cycle
  const POINTS_PER_CYCLE = 2; // 2 points per cycle
  
  // Helper function to format time with one decimal place
  const formatTime = (time: number): string => {
    return time.toFixed(1);
  };
  
  // States
  const [localPoints, setLocalPoints] = useState(currentPoints);
  const [lastPointsAdded, setLastPointsAdded] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(TIMER_DURATION);
  const [progress, setProgress] = useState<number>(0);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(Date.now());
  
  // Update local points when currentPoints prop changes
  useEffect(() => {
    setLocalPoints(currentPoints);
  }, [currentPoints]);
  
  // Clear notification after delay
  useEffect(() => {
    if (lastPointsAdded !== null) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  }, [lastPointsAdded]);
  
  // Simplified timer implementation
  useEffect(() => {
    const animate = () => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = TIMER_DURATION - elapsed;
      
      if (remaining > 0) {
        setTimeRemaining(Number(remaining.toFixed(1)));
        setProgress((elapsed / TIMER_DURATION) * 100);
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Complete cycle
        const pointsToAdd = POINTS_PER_CYCLE * pointsMultiplier;
        setLocalPoints(prev => prev + pointsToAdd);
        setLastPointsAdded(pointsToAdd);
        onPointsEarned?.(pointsToAdd);
        
        // Reset for next cycle
        startTimeRef.current = Date.now();
        setProgress(0);
        setTimeRemaining(TIMER_DURATION);
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [onPointsEarned, pointsMultiplier]);
  
  // Calculate progress bar color based on progress
  const getProgressColor = () => {
    if (progress > 75) return 'from-[#c2ff59] to-[#ebffb7]';
    if (progress > 50) return 'from-[#99cc33] to-[#c2ff59]';
    if (progress > 25) return 'from-[#709926] to-[#99cc33]';
    return 'from-[#304700] to-[#709926]';
  };
  
  return (
    <div className={`${className} relative`}>
      <AnimatePresence>
        {lastPointsAdded !== null && (
          <PointsAddedNotification amount={lastPointsAdded} />
        )}
      </AnimatePresence>
      
      <PixelatedContainer noPadding>
        <div className="w-full">
          {/* Header with highlight effect */}
          <div className="bg-[#ebffb7] text-[#304700] p-2 flex items-center justify-between border-b-4 border-[#304700] relative overflow-hidden">
            <motion.div 
              className="absolute inset-0 bg-white opacity-0"
              animate={{ 
                opacity: progress > 90 ? [0, 0.2, 0] : 0 
              }}
              transition={{ duration: 0.5 }}
            />
            <span className="text-xl font-bold font-pixelify relative z-10">Points Earned</span>
            <div className="flex items-center">
              <Image
                src="/assets/icons/info.svg"
                alt="Info"
                width={24}
                height={24}
                className="text-[#304700]"
              />
            </div>
          </div>

          {/* Body */}
          <div className="bg-[#CADA9B] p-4">
            {/* Current Points with highlight on change */}
            <motion.div 
              className="text-2xl font-bold font-numbers text-[#304700] mb-4"
              animate={{ 
                scale: lastPointsAdded !== null ? [1, 1.05, 1] : 1,
                color: lastPointsAdded !== null ? ['#304700', '#ff6600', '#304700'] : '#304700'
              }}
              transition={{ duration: 0.5 }}
            >
              {Math.round(localPoints)}
            </motion.div>

            {/* Points Rate and Timer */}
            <div className="mb-4">
              <div className="flex justify-between text-lg font-pixelify text-[#304700] mb-2">
                <span>+{POINTS_PER_CYCLE} points every {TIMER_DURATION}s</span>
                <span className="font-numbers">{timeRemaining.toFixed(1)}s</span>
              </div>
              <div className="h-2 bg-[#304700]/20 rounded-full">
                <div 
                  className="h-full bg-[#304700] transition-all duration-100"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Task Rewards Section - Dynamic based on point values */}
            <div>
              <div className="text-xl font-bold font-pixelify text-[#304700] mb-3 border-t-2 border-[#304700] pt-4">Task Rewards</div>
              <div className="grid grid-cols-2 gap-3">
                {TASK_REWARDS.map((task, index) => (
                  <motion.div 
                    key={index} 
                    className="border-2 border-[#304700] overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <div className="bg-[#ebffb7] p-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 relative">
                            <Image
                              src={index === 3 ? getHealthIcon(task.points) : task.icon}
                              alt={task.name}
                              width={22}
                              height={22}
                              className="object-contain"
                              style={{
                                imageRendering: 'pixelated',
                                width: '22px',
                                height: '22px'
                              }}
                            />
                          </div>
                          <span className="text-md font-medium font-pixelify text-[#304700]">
                            {task.name}
                          </span>
                        </div>
                        <span className="text-md font-bold font-numbers text-[#304700]">
                          +{task.points}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </PixelatedContainer>
    </div>
  );
};