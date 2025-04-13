import React, { useEffect, useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import PixelatedContainer from '@/components/game/PixelatedContainer';
import { motion, AnimatePresence } from 'framer-motion';
import CustomSlider from '@/components/game/CustomSlider';
import { pointsManager } from '@/lib/points-manager';
import { useWallet } from '@/context/WalletContext';

interface UserActivity {
  id: string;
  type: 'feed' | 'play' | 'clean' | 'heal' | string;
  name: string;
  points: number;
  timestamp: number;
}

interface PointsEarnedPanelProps {
  currentPoints: number;
  className?: string;
  pointsMultiplier?: number;
  recentActivities?: UserActivity[];
  isLoading?: boolean;
}

// Update task rewards data with more specific activity icons
const TASK_REWARD_ICONS: Record<string, string> = {
  // Main categories
  feed: '/assets/icons/foods/foods.png',
  play: '/assets/icons/games/games.png',
  clean: '/assets/icons/hygiene/hygienes.png',
  heal: '/assets/icons/healings/healing.png',
  doctor: '/assets/icons/healings/healing.png',
  
  // Specific food items
  fish: '/assets/icons/foods/food-fish.png',
  cookie: '/assets/icons/foods/food-donat.png',
  catFood: '/assets/icons/foods/food-catfood.png',
  kibble: '/assets/icons/foods/food-catnip.png',
  
  // Specific play items
  laser: '/assets/icons/games/game-laser.png',
  feather: '/assets/icons/games/game-feather.png',
  ball: '/assets/icons/games/game-ball.png',
  puzzle: '/assets/icons/games/game-puzzle.png',
  
  // Specific clean items
  brush: '/assets/icons/hygiene/hygiene-comb.png',
  bath: '/assets/icons/hygiene/hygiene-bath.png',
  nails: '/assets/icons/hygiene/hygiene-nailclipper.png',
  dental: '/assets/icons/hygiene/hygiene-tooth.png',
  
  // Specific heal/doctor items
  checkup: '/assets/icons/healings/healing.png',
  vitamins: '/assets/icons/healings/medicine.png',
  medicine: '/assets/icons/healings/medicine.png',
  vaccine: '/assets/icons/healings/vaccine.png',
  surgery: '/assets/icons/healings/surgery.png',
  
  // Default fallback
  default: '/assets/icons/status/statusbar-coins(points).png'
};

// Add detailed rewards data
const DETAILED_REWARDS = {
  feed: [
    { name: 'Fish', points: 15 },
    { name: 'Cookie', points: 10 },
    { name: 'Cat Food', points: 20 },
    { name: 'Kibble', points: 12 }
  ],
  play: [
    { name: 'Laser', points: 20 },
    { name: 'Feather', points: 15 },
    { name: 'Ball', points: 18 },
    { name: 'Puzzle', points: 25 }
  ],
  clean: [
    { name: 'Brush', points: 18 },
    { name: 'Bath', points: 25 },
    { name: 'Nails', points: 15 },
    { name: 'Dental', points: 20 }
  ],
  heal: [
    { name: 'Checkup', points: 25 },
    { name: 'Medicine', points: 30 },
    { name: 'Vaccine', points: 35 },
    { name: 'Surgery', points: 40 }
  ]
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

// Add RewardDetailsPopup component
const RewardDetailsPopup = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#EBFFB7] rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold font-pixelify text-[#304700]">Rewards Points Guide</h2>
              <button
                onClick={onClose}
                className="text-[#304700] hover:text-[#709926] transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {Object.entries(DETAILED_REWARDS).map(([category, tasks]) => (
                <div key={category} className="border-2 border-[#304700] p-4 rounded-lg">
                  <h3 className="text-xl font-bold font-pixelify text-[#304700] mb-3 capitalize">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {tasks.map((task, index) => (
                      <div
                        key={index}
                        className="bg-[#CADA9B] p-3 rounded-md flex justify-between items-center"
                      >
                        <span className="font-pixelify text-[#304700]">{task.name}</span>
                        <span className="font-numbers font-bold text-[#304700]">+{task.points}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Helper to format timestamp to a readable format
const formatActivityTime = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  
  // Less than a minute
  if (diff < 60 * 1000) {
    return 'Just now';
  }
  
  // Less than an hour
  if (diff < 60 * 60 * 1000) {
    const minutes = Math.floor(diff / (60 * 1000));
    return `${minutes}m ago`;
  }
  
  // Less than a day
  if (diff < 24 * 60 * 60 * 1000) {
    const hours = Math.floor(diff / (60 * 60 * 1000));
    return `${hours}h ago`;
  }
  
  // More than a day
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));
  return `${days}d ago`;
};

export const PointsEarnedPanel = ({
  currentPoints,
  className,
  pointsMultiplier = 1.0,
  recentActivities = [],
  isLoading = false
}: PointsEarnedPanelProps) => {
  const { publicKey } = useWallet();

  // Fixed values
  const TIMER_DURATION = 10; // 10 seconds per cycle
  const POINTS_PER_CYCLE = 2; // 2 points per cycle

  // States
  const [localPoints, setLocalPoints] = useState(currentPoints);
  const [lastPointsAdded, setLastPointsAdded] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(TIMER_DURATION);
  const [progress, setProgress] = useState<number>(0);
  const animationRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(Date.now());
  const lastPointsUpdateRef = useRef<number>(currentPoints);
  const [showRewardDetails, setShowRewardDetails] = useState(false);
  const [localActivities, setLocalActivities] = useState<UserActivity[]>(recentActivities);
  
  // Update recent activities when prop changes
  useEffect(() => {
    if (recentActivities && recentActivities.length > 0) {
      setLocalActivities(recentActivities);
    }
  }, [recentActivities]);
  
  // Update local points when currentPoints prop changes
  useEffect(() => {
    if (currentPoints !== lastPointsUpdateRef.current) {
      setLocalPoints(currentPoints);
      lastPointsUpdateRef.current = currentPoints;
    }
  }, [currentPoints]);
  
  // Clear notification after delay
  useEffect(() => {
    if (lastPointsAdded !== null) {
      const timer = setTimeout(() => {
        setLastPointsAdded(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [lastPointsAdded]);
  
  // Memoize the animation callback
  const animate = useCallback(() => {
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    const remaining = TIMER_DURATION - elapsed;
    
    if (remaining > 0) {
      setTimeRemaining(Number(remaining.toFixed(1)));
      setProgress((elapsed / TIMER_DURATION) * 100);
      animationRef.current = requestAnimationFrame(animate);
    } else {
      // Complete cycle
      const pointsToAdd = Math.round(POINTS_PER_CYCLE * pointsMultiplier);
      
      // Award points directly via PointsManager
      if (pointsToAdd > 0 && publicKey) {
          // Use pointsManager here
          pointsManager.awardPoints(
            publicKey, // Use publicKey
            pointsToAdd,
            'passive', // Use the new 'passive' source type
            'earn',
            { sourceComponent: 'PointsEarnedPanel' }
          ).then(result => {
             if (result.success) {
                console.log(`PointsEarnedPanel: Awarded ${result.points} passive points. New total maybe: ${result.total}`);
                // Update UI state indirectly via context listening to PointsManager events later
                setLastPointsAdded(result.points); // Show notification
             } else {
                 console.warn("PointsEarnedPanel: Failed to award passive points via PointsManager.");
             }
          }).catch(error => {
              console.error("PointsEarnedPanel: Error calling pointsManager.awardPoints:", error);
          });
      } else if (pointsToAdd > 0) {
         console.warn("PointsEarnedPanel: Cannot award passive points, publicKey is missing.");
      }
      
      // Reset for next cycle
      startTimeRef.current = Date.now();
      setProgress(0);
      setTimeRemaining(TIMER_DURATION);
      animationRef.current = requestAnimationFrame(animate);
    }
  }, [
       TIMER_DURATION, 
       POINTS_PER_CYCLE, 
       pointsMultiplier, 
       // Remove onPointsEarned from dependencies
       publicKey // Add publicKey dependency
    ]);
  
  // Start/cleanup animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);
  
  // Get color for progress bar based on progress
  const getProgressColor = () => {
    if (progress > 75) return '#c2ff59'; // Light green
    if (progress > 40) return '#a7ba75'; // Medium green
    return '#304700';  // Dark olive green
  };
  
  // Format points with commas for thousands
  const formatPoints = (pts: number) => {
    return pts.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };
  
  // Get icon for activity type
  const getActivityIcon = (type: string, name?: string): string => {
    // First try to match based on activity name (converted to camelCase)
    if (name) {
      const normalizedName = name.toLowerCase().replace(/\s+/g, '');
      const specificKey = normalizedName as keyof typeof TASK_REWARD_ICONS;
      
      if (TASK_REWARD_ICONS[specificKey]) {
        return TASK_REWARD_ICONS[specificKey];
      }
      
      // For items with special naming
      if (name === 'Cat Food' && TASK_REWARD_ICONS['catFood']) {
        return TASK_REWARD_ICONS['catFood'];
      }
      else if (name === 'Check-up' && TASK_REWARD_ICONS['checkup']) {
        return TASK_REWARD_ICONS['checkup'];
      }
    }
    
    // Fallback to type-based icon
    return TASK_REWARD_ICONS[type] || TASK_REWARD_ICONS.default;
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
          <div className="bg-[#ebffb7] text-[#304700] p-2 flex items-center justify-between border-b-[2px] border-[#304700]/30 relative overflow-hidden">
            <motion.div 
              className="absolute inset-0 bg-white opacity-0"
              animate={{ 
                opacity: progress > 90 ? [0, 0.2, 0] : 0 
              }}
              transition={{ duration: 0.5 }}
            />
            <span className="text-lg font-bold font-pixelify relative z-10">Points Earned</span>
            <div className="flex items-center">
              <Image
                src="/assets/icons/info.svg"
                alt="Info"
                width={20}
                height={20}
                className="text-[#304700]"
              />
            </div>
          </div>

          {/* Body */}
          <div className="bg-[#CADA9B] p-3 sm:p-4">
            {/* Points Summary */}
            <div className="mb-4 p-2 bg-[#ebffb7] rounded border border-[#304700]/20">
            {/* Current Points with highlight on change */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-pixelify text-[#304700]">Current Points:</span>
                <motion.div 
                  className="text-xl font-bold font-numbers text-[#304700]"
                  animate={{ 
                    scale: lastPointsAdded !== null ? [1, 1.05, 1] : 1,
                    color: lastPointsAdded !== null ? ['#304700', '#709926', '#304700'] : '#304700'
                  }}
                  transition={{ duration: 0.5 }}
                >
                  {formatPoints(Math.round(localPoints))}
                </motion.div>
              </div>
              
              {/* Point Multiplier */}
              <div className="flex justify-between items-center">
                <span className="text-sm font-pixelify text-[#304700]">Multiplier:</span>
                <span className="text-sm font-numbers font-bold text-[#304700]">
                  {pointsMultiplier}x
                </span>
              </div>
            </div>

            {/* Points Rate and Timer */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-pixelify text-[#304700]">Next points in:</span>
                <span className="text-sm font-numbers font-medium">{timeRemaining.toFixed(1)}s</span>
              </div>
              <CustomSlider 
                value={progress} 
                maxValue={100} 
                backgroundColor="#ebffb7"
                barColor={getProgressColor()}
              />
              <div className="mt-1 text-xs font-pixelify text-[#304700] text-right">
                +{POINTS_PER_CYCLE * pointsMultiplier} points every {TIMER_DURATION}s
              </div>
            </div>

            {/* Recent Activities Section */}
            <div>
              <div className="py-2 border-t border-b border-[#304700]/20 mb-3">
                <div className="text-md font-bold font-pixelify text-[#304700]">Recent Activities</div>
              </div>
              
              {isLoading ? (
                <div className="text-center py-4 text-sm font-pixelify text-[#304700]/70">
                  Loading activities...
                </div>
              ) : localActivities.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {localActivities.slice(0, 4).map((activity) => (
                    <div 
                      key={activity.id}
                      className="flex flex-col bg-[#ebffb7] p-2 rounded border border-[#304700]/20"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center">
                          <Image 
                            src={getActivityIcon(activity.type, activity.name)} 
                            alt={activity.name || activity.type}
                            width={20} 
                            height={20}
                            style={{ imageRendering: 'pixelated' }}
                            unoptimized={true}
                          />
                          <span className="ml-1 text-xs font-pixelify text-[#304700] truncate max-w-[60px]">{activity.name}</span>
                        </div>
                        <span className="text-xs font-numbers font-bold text-[#304700]">+{activity.points}</span>
                      </div>
                      <div className="text-[10px] text-[#304700]/70 text-right">{formatActivityTime(activity.timestamp)}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-sm font-pixelify text-[#304700]/70">
                  No recent activities
                </div>
              )}
              
              <button
                onClick={() => setShowRewardDetails(true)}
                className="w-full mt-3 bg-[#304700] text-[#EBFFB7] py-1.5 rounded-md font-pixelify text-sm hover:bg-[#709926] transition-colors"
              >
                Rewards Points Guide
              </button>
            </div>

            {/* Add RewardDetailsPopup */}
            <RewardDetailsPopup 
              isOpen={showRewardDetails} 
              onClose={() => setShowRewardDetails(false)} 
            />
          </div>
        </div>
      </PixelatedContainer>
    </div>
  );
};
