"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import Image from "next/image";
import { StatusBar } from "@/components/ui/status-bar";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { HappyCat, AlertCat, SadCat, TiredCat, HungryCat, DeadCat } from "@/components/pet/cat-emotions";
import { usePetInteractions, DEFAULT_COOLDOWNS } from "@/hooks/use-pet-interactions";
import { useMenuNavigation } from "@/hooks/use-menu-navigation";
import { formatPoints } from "@/utils/stats-helpers";
import { AIPetAdvisor } from "@/components/ui/ai-pet-advisor";
import { PointAnimation } from "@/components/ui/point-animation";
import { useWallet } from "@/context/WalletContext";
import { useUserData } from "@/context/UserDataContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/forms/button";
import { GPTLogsPanel } from "@/components/ui/gpt-logs-panel";
import { PointsEarnedPanel } from "@/components/ui/points-earned-panel";
import { updateUserScore } from "@/utils/leaderboard";
import CustomSlider from "@/components/game/CustomSlider";
import { dbService } from "@/lib/database-service";

// Add this interface for activities right after the imports
interface UserActivity {
  id: string;
  type: 'feed' | 'play' | 'clean' | 'heal' | string;
  name: string;
  points: number;
  timestamp: number;
}

// Add this component near the top of the file, outside the KawaiiDevice component
interface StatusHeaderProps {
  animatedPoints: number;
  health: number;
}

const StatusHeader = ({ animatedPoints, health }: StatusHeaderProps) => {
  return (
    <div className="flex justify-between w-full pt-2 pb-1 px-5">
      <div className="flex-1">
        <div className="flex items-center">
          <Image 
            src="/assets/icons/coin.png" 
            alt="Coins" 
            width={25} 
            height={25} 
            className="mr-1"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="text-base text-[#4b6130] font-numbers">{formatPoints(animatedPoints)}</span>
        </div>
      </div>
      <div className="flex-1 ml-2">
        <div className="flex items-center">
          <Image 
            src="/assets/icons/hart.png" 
            alt="Health" 
            width={21} 
            height={21} 
            className="mr-1"
            style={{ imageRendering: 'pixelated' }}
          />
          <CustomSlider 
            value={health} 
            maxValue={100}
            backgroundColor="#EBFFB7"
            barColor="#a7ba75"
            className="flex-1 mb-1"
            borderWidth={2}
          />
        </div>
      </div>
    </div>
  );
};

export function KawaiiDevice() {
  const router = useRouter();
  const { isConnected, publicKey, walletData, updatePoints, disconnect, burnPoints } = useWallet();
  const { userData, updatePoints: updateUserDataPoints } = useUserData();
  
  // Add state to track the most recent task type
  const [mostRecentTask, setMostRecentTask] = useState<string | null>(null);
  
  // Add this new state for tracking user activities
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);
  
  // Load user activities from database on component mount
  useEffect(() => {
    async function loadUserActivities() {
      if (!publicKey) return;
      
      try {
        setIsActivitiesLoading(true);
        
        // Load activities from the database service (correct usage)
        const activities = await dbService.getUserActivities(publicKey);
        
        setUserActivities(activities);
      } catch (error) {
        console.error("Failed to load user activities:", error);
      } finally {
        setIsActivitiesLoading(false);
      }
    }
    
    loadUserActivities();
  }, [publicKey]);
  
  // Function to save activity to database
  const saveActivityToDatabase = async (activity: UserActivity) => {
    if (!publicKey) return;
    
    try {
      // Save activity to the database using the service (correct usage)
      await dbService.saveUserActivity(publicKey, activity);
      
      console.log("Activity saved to DB:", activity.name);
    } catch (error) {
      console.error("Failed to save activity to database:", error);
    }
  };

  // Redirect to landing if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  // Use our custom hooks
  const {
    food,
    happiness,
    cleanliness,
    energy,
    health,
    isDead,
    points,
    isFeeding,
    isPlaying,
    isCleaning,
    isHealing,
    lastInteractionTime,
    setLastInteractionTime,
    showInteraction,
    currentInteraction,
    handleFeeding,
    handlePlaying,
    handleCleaning,
    handleDoctor,
    resetPet,
    cooldowns,
    isOnCooldown,
    recentPointGain,
    aiAdvice,
    aiPersonality,
    aiPointMultiplier,
    petMessage,
    petReaction,
    cooldownTimers
  } = usePetInteractions();

  const {
    selectedMenuItem,
    isMenuActive,
    menuStack,
    selectedFoodItem,
    selectedPlayItem,
    selectedCleanItem,
    selectedDoctorItem,
    handleButtonNavigation,
    resetMenu,
    setMenuStack,
    setSelectedMenuItem,
    setSelectedFoodItem,
    setSelectedPlayItem,
    setSelectedCleanItem,
    setSelectedDoctorItem,
  } = useMenuNavigation();

  const [pointAnimationComplete, setPointAnimationComplete] = useState(true);
  const handlePointAnimationComplete = useCallback(() => {
    setPointAnimationComplete(true);
  }, []);

  useEffect(() => {
    if (recentPointGain) {
      setPointAnimationComplete(false)
    }
  }, [recentPointGain])

  // Keep track of last updated points to prevent loops
  const lastUpdatedPointsRef = useRef(0);

  // Create a ref for debouncing updates
  const pointsUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const POINTS_UPDATE_DELAY = 5000; // 5 seconds between server updates

  // Add this near the other refs
  const lastInteractionUpdateRef = useRef<number>(0);
  const INTERACTION_UPDATE_THROTTLE = 3000; // 3 seconds between lastInteraction updates

  // Update UserData when local points change (with debouncing)
  useEffect(() => {
    if (!isConnected || !publicKey) return;
    
    // Don't update if points haven't changed
    if (points <= 0 || points === lastUpdatedPointsRef.current) return;
    
    // Clear any existing timer
    if (pointsUpdateTimerRef.current) {
      clearTimeout(pointsUpdateTimerRef.current);
    }
    
    // Set timer for next update
    pointsUpdateTimerRef.current = setTimeout(async () => {
      try {
        // Update points in centralized user data
        await updateUserDataPoints(points);
        console.log('💰 Points updated successfully');
        lastUpdatedPointsRef.current = points;
      } catch (error) {
        console.error('❌ Error updating points:', error);
      }
    }, POINTS_UPDATE_DELAY);
    
    // Cleanup
    return () => {
      if (pointsUpdateTimerRef.current) {
        clearTimeout(pointsUpdateTimerRef.current);
      }
    };
  }, [points, isConnected, publicKey, updateUserDataPoints]);

  // Update wallet points whenever game points change (with debouncing)
  useEffect(() => {
    if (!isConnected || !publicKey) return;
    
    // Don't update if points haven't changed
    if (lastUpdatedPointsRef.current === userData.points) return;
    
    // Clear any existing timer
    if (pointsUpdateTimerRef.current) {
      clearTimeout(pointsUpdateTimerRef.current);
    }
    
    // Set timer for next update
    pointsUpdateTimerRef.current = setTimeout(async () => {
      try {
        // Update wallet data first (improved with retry and offline support)
        const updateSuccess = await updatePoints(userData.points);
        
        if (updateSuccess) {
          console.log('💰 Wallet points updated successfully');
        } else {
          console.warn('⚠️ Points update saved for later sync');
        }
        
        // Track the points we've successfully accounted for (even if offline)
        lastUpdatedPointsRef.current = userData.points;
        
        // Then update leaderboard - this is less critical
        if (userData.points > 0 && publicKey) {
          try {
            const updated = await updateUserScore(publicKey, userData.points);
            if (updated) {
              console.log('🏆 Leaderboard updated successfully');
            }
          } catch (leaderboardError) {
            // Don't fail the entire operation if leaderboard update fails
            console.warn('⚠️ Leaderboard update failed:', leaderboardError);
          }
        }
      } catch (error) {
        console.error('❌ Error updating points:', error);
        
        // Make sure we try again on the next change
        lastUpdatedPointsRef.current = prevPointsRef.current;
      }
    }, POINTS_UPDATE_DELAY);
    
    // Clean up timer on unmount
    return () => {
      if (pointsUpdateTimerRef.current) {
        clearTimeout(pointsUpdateTimerRef.current);
      }
    };
  }, [userData.points, isConnected, publicKey, updatePoints]);

  // Update leaderboard when pet dies (this can remain immediate since it's a one-time event)
  useEffect(() => {
    if (isDead && isConnected && publicKey && points > 0) {
      // Save final score to leaderboard
      updateUserScore(publicKey, points)
        .catch(err => console.error('Error updating leaderboard on death:', err));
    }
  }, [isDead, isConnected, publicKey, points]);

  const [showReviveConfirm, setShowReviveConfirm] = useState(false);

  const [animatedPoints, setAnimatedPoints] = useState(userData.points);
  
  // Add this ref to track the previous points value
  const prevPointsRef = useRef(userData.points);
  
  // Animation effect when global points change
  useEffect(() => {
    // Only animate if points increased
    if (userData.points > prevPointsRef.current) {
      const startValue = prevPointsRef.current;
      const endValue = userData.points;
      const duration = 1000; // 1 second duration
      const startTime = performance.now();
      
      // Update the reference immediately
      prevPointsRef.current = userData.points;
      
      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic function: progress = 1 - (1 - progress)^3
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = Math.round(startValue + (endValue - startValue) * easeOut);
        setAnimatedPoints(currentValue);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    } else {
      // If points decreased or stayed same, update immediately
      setAnimatedPoints(userData.points);
      prevPointsRef.current = userData.points;
    }
  }, [userData.points]);

  const getCatEmotion = () => {
    // Consider the pet sick when health is below 20
    const isSick = health < 20 && !isDead;
    
    if (isDead) return <DeadCat />;
    if (isMenuActive) return <AlertCat selectedMenuItem={selectedMenuItem} 
                                      hygieneTaskOnCooldown={isOnCooldown.clean} 
                                      foodTaskOnCooldown={isOnCooldown.feed}
                                      sickStatus={isSick}
                                      mostRecentTask={mostRecentTask} />;
    if (isFeeding)
      return (
        <motion.div animate={{ rotate: [0, -5, 5, -5, 0] }} transition={{ duration: 0.5 }}>
          <HappyCat hygieneTaskOnCooldown={isOnCooldown.clean} 
                   foodTaskOnCooldown={isOnCooldown.feed}
                   sickStatus={isSick}
                   mostRecentTask={mostRecentTask} />
        </motion.div>
      );
    if (isPlaying)
      return (
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: 2, duration: 0.3 }}>
          <HappyCat hygieneTaskOnCooldown={isOnCooldown.clean} 
                   foodTaskOnCooldown={isOnCooldown.feed}
                   sickStatus={isSick}
                   mostRecentTask={mostRecentTask} />
        </motion.div>
      );
    if (isCleaning)
      return (
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5 }}>
          <HappyCat hygieneTaskOnCooldown={isOnCooldown.clean} 
                   foodTaskOnCooldown={isOnCooldown.feed}
                   sickStatus={isSick}
                   mostRecentTask={mostRecentTask} />
        </motion.div>
      );
    if (isHealing)
      return (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5 }}>
          <HappyCat hygieneTaskOnCooldown={isOnCooldown.clean} 
                   foodTaskOnCooldown={isOnCooldown.feed}
                   sickStatus={isSick}
                   mostRecentTask={mostRecentTask} />
        </motion.div>
      );
    if (food < 30) return <HungryCat hygieneTaskOnCooldown={isOnCooldown.clean} 
                                    foodTaskOnCooldown={isOnCooldown.feed}
                                    sickStatus={isSick}
                                    mostRecentTask={mostRecentTask} />;
    if (happiness < 30) return <SadCat hygieneTaskOnCooldown={isOnCooldown.clean} 
                                      foodTaskOnCooldown={isOnCooldown.feed}
                                      sickStatus={isSick}
                                      mostRecentTask={mostRecentTask} />;
    if (energy < 30 || food < 50 || happiness < 50) return <TiredCat hygieneTaskOnCooldown={isOnCooldown.clean} 
                                                                    foodTaskOnCooldown={isOnCooldown.feed}
                                                                    sickStatus={isSick}
                                                                    mostRecentTask={mostRecentTask} />;
    return <HappyCat hygieneTaskOnCooldown={isOnCooldown.clean} 
                    foodTaskOnCooldown={isOnCooldown.feed}
                    sickStatus={isSick}
                    mostRecentTask={mostRecentTask} />;
  };

  // Modify the handleInteraction function to also record activities
  const handleInteraction = async (type: string) => {
    // Set the most recent task type
    setMostRecentTask(type);
    
    let activityPoints = 0;
    let activityName = "";
    
    switch (type) {
      case 'feed':
        await handleFeeding(); // Handle async operation
        activityName = ["Fish", "Cookie", "Cat Food", "Kibble"][selectedFoodItem || 0];
        activityPoints = [15, 10, 20, 12][selectedFoodItem || 0];
        break;
      case 'play':
        await handlePlaying(); // Handle async operation
        activityName = ["Laser", "Feather", "Ball", "Puzzle"][selectedPlayItem || 0];
        activityPoints = [20, 15, 18, 25][selectedPlayItem || 0];
        break;
      case 'clean':
        await handleCleaning(); // Handle async operation
        activityName = ["Brush", "Bath", "Nails", "Dental"][selectedCleanItem || 0];
        activityPoints = [18, 25, 15, 20][selectedCleanItem || 0];
        break;
      case 'doctor':
        await handleDoctor(); // Handle async operation
        activityName = ["Checkup", "Medicine", "Vaccine", "Surgery"][selectedDoctorItem || 0];
        activityPoints = [25, 30, 35, 40][selectedDoctorItem || 0];
        break;
    }
    
    // Record the activity if there are points
    if (activityPoints > 0) {
      const newActivity: UserActivity = {
        id: Date.now().toString(),
        type,
        name: activityName,
        points: activityPoints,
        timestamp: Date.now()
      };
      
      // Update activities in state - keep only the latest 4
      setUserActivities(prev => [newActivity, ...prev].slice(0, 4));
      
      // Save activity to database
      await saveActivityToDatabase(newActivity);
    }
  };

  // Button navigation handler with proper integrations
  const handleButtonClick = useCallback(
    async (option: "food" | "clean" | "doctor" | "play" | "previous" | "next" | "a" | "b") => {
      // Only update last interaction time when at least 3 seconds have passed since the last update
      const now = Date.now();
      if (now - lastInteractionUpdateRef.current > INTERACTION_UPDATE_THROTTLE) {
        setLastInteractionTime(now);
        lastInteractionUpdateRef.current = now;
      }
      
      if (isDead) {
        if (option === "a") {
          // Reset game
          resetPet();
          resetMenu();
        }
        return;
      }

      if (option === "previous" || option === "next" || option === "b") {
        handleButtonNavigation(option);
        return;
      }

      if (option === "a") {
        if (menuStack[menuStack.length - 1] === "main") {
          handleButtonNavigation("a");
        } else if (menuStack[menuStack.length - 1] === "food") {
          // Handle food selection
          if (selectedFoodItem !== null) {
            await handleInteraction('feed');
            resetMenu();
          }
        } else if (menuStack[menuStack.length - 1] === "play") {
          // Handle play selection
          if (selectedPlayItem !== null) {
            await handleInteraction('play');
            resetMenu();
          }
        } else if (menuStack[menuStack.length - 1] === "clean") {
          // Handle clean selection
          if (selectedCleanItem !== null) {
            await handleInteraction('clean');
            resetMenu();
          }
        } else if (menuStack[menuStack.length - 1] === "doctor") {
          // Handle doctor selection
          if (selectedDoctorItem !== null) {
            await handleInteraction('doctor');
            resetMenu();
          }
        }
      }
    },
    [
      isDead,
      menuStack, 
      selectedFoodItem, 
      selectedPlayItem, 
      selectedCleanItem, 
      selectedDoctorItem,
      handleButtonNavigation,
      handleInteraction,
      resetPet,
      resetMenu,
      setLastInteractionTime
    ]
  );
  
  // Handle revive confirmation
  const handleReviveRequest = () => {
    setShowReviveConfirm(true);
  };
  
  const handleReviveConfirm = async () => {
    // Burn 50% of points through the wallet context
    await burnPoints();
    // Reset pet stats
    resetPet();
    // Hide confirmation dialog
    setShowReviveConfirm(false);
    
    // Update leaderboard with the new score after revival
    if (publicKey) {
      updateUserScore(publicKey, Math.floor(points / 2));
    }
  };
  
  const handleReviveCancel = () => {
    setShowReviveConfirm(false);
  };

  const renderMenuContent = () => {
    if (isDead) {
      return (
        <>
          <StatusHeader animatedPoints={animatedPoints} health={health} />
          <div className="flex-grow flex flex-col items-center justify-center">
            <div className="transform scale-75">
              {getCatEmotion()}
            </div>
            <p className="text-red-500 font-bold mt-4 text-base">Your pet has died!</p>
            <p className="text-xs mt-1 mb-2">Total tokens remaining: <span className="font-numbers">100</span></p>
            
            {showReviveConfirm ? (
              <div className="mt-2 p-2 bg-gray-100 rounded-md text-center">
                <p className="text-xs mb-2">Current points: <span className="font-numbers">{formatPoints(userData.points)}</span></p>
                <div className="flex space-x-2 justify-center">
                  <button 
                    onClick={handleReviveConfirm} 
                    className="bg-green-500 text-white py-1 px-4 rounded-md text-xs"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={handleReviveCancel} 
                    className="bg-red-500 text-white py-1 px-4 rounded-md text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleReviveRequest} 
                className="mt-2 bg-green-500 text-white py-1 px-6 rounded-md text-sm"
              >
                Revive
              </button>
            )}
          </div>
        </>
      );
    }
    
    // Main menu - show only points and health
    if (menuStack[menuStack.length - 1] === "main") {
      return (
        <>
          <StatusHeader animatedPoints={animatedPoints} health={health} />
          <div className="flex-grow flex items-center justify-center relative mb-[12px]">
            <div className="relative w-full scale-[0.9]">
              {getCatEmotion()}
            </div>
          </div>
          <div className="flex justify-around w-full px-1 pt-3 pb-0">
            {["food", "clean", "doctor", "play"].map((icon, index) => (
              <div key={index} className="transform scale-100">
                <PixelIcon
                  icon={icon as "food" | "clean" | "doctor" | "play"}
                  isHighlighted={selectedMenuItem === index}
                  label={icon.charAt(0).toUpperCase() + icon.slice(1)}
                  cooldown={cooldowns[icon === "doctor" ? "heal" : icon as keyof typeof cooldowns]}
                  maxCooldown={DEFAULT_COOLDOWNS[icon === "doctor" ? "heal" : icon as keyof typeof DEFAULT_COOLDOWNS]}
                  isDisabled={isOnCooldown[icon === "doctor" ? "heal" : icon] || isDead}
                  onClick={() => {
                    setSelectedMenuItem(index);
                    handleButtonClick("a");
                  }}
                />
              </div>
            ))}
          </div>
        </>
      );
    }
    
    // Food page
    if (menuStack[menuStack.length - 1] === "food") {
      return (
        <>
          <StatusHeader animatedPoints={animatedPoints} health={health} />
          <div className="absolute top-[50px] left-0 right-0 text-center text-xs text-[#606845]">Select food to feed your pet:</div>
          <div className="flex-grow flex items-center justify-center scale-[0.9] mb-[12px]">{getCatEmotion()}</div>
          <div className="flex justify-around w-full px-1 pt-3 pb-0">
            {["fish", "cookie", "catFood", "kibble"].map((foodItem, index) => (
              <div key={index} className="transform scale-100">
                <PixelIcon 
                  icon={foodItem as any}
                  isHighlighted={selectedFoodItem === index}
                  label={foodItem === "catFood" ? "Cat Food" : foodItem.charAt(0).toUpperCase() + foodItem.slice(1)}
                  cooldown={cooldowns.feed}
                  maxCooldown={DEFAULT_COOLDOWNS.feed}
                  isDisabled={isOnCooldown.feed || isDead}
                  onClick={() => {
                    setSelectedFoodItem(index);
                    handleButtonClick("a");
                  }}
                />
              </div>
            ))}
          </div>
        </>
      );
    }
    
    // Play page
    if (menuStack[menuStack.length - 1] === "play") {
      return (
        <>
          <StatusHeader animatedPoints={animatedPoints} health={health} />
          <div className="absolute top-[50px] left-0 right-0 text-center text-xs text-[#606845]">Choose a game to play:</div>
          <div className="flex-grow flex items-center justify-center scale-[0.9] mb-[12px]">{getCatEmotion()}</div>
          <div className="flex justify-around w-full px-1 pt-3 pb-0">
            {["laser", "feather", "ball", "puzzle"].map((playItem, index) => (
              <div key={index} className="transform scale-100">
                <PixelIcon 
                  icon={playItem as any}
                  isHighlighted={selectedPlayItem === index}
                  label={playItem.charAt(0).toUpperCase() + playItem.slice(1)}
                  cooldown={cooldowns.play}
                  maxCooldown={DEFAULT_COOLDOWNS.play}
                  isDisabled={isOnCooldown.play || isDead}
                  onClick={() => {
                    setSelectedPlayItem(index);
                    handleButtonClick("a");
                  }}
                />
              </div>
            ))}
          </div>
        </>
      );
    }
    
    // Clean page
    if (menuStack[menuStack.length - 1] === "clean") {
      return (
        <>
          <StatusHeader animatedPoints={animatedPoints} health={health} />
          <div className="absolute top-[50px] left-0 right-0 text-center text-xs text-[#606845]">Choose grooming method:</div>
          <div className="flex-grow flex items-center justify-center scale-[0.9] mb-[12px]">{getCatEmotion()}</div>
          <div className="flex justify-around w-full px-1 pt-3 pb-0">
            {["brush", "bath", "nails", "dental"].map((cleanItem, index) => (
              <div key={index} className="transform scale-100">
                <PixelIcon 
                  icon={cleanItem as any}
                  isHighlighted={selectedCleanItem === index}
                  label={cleanItem.charAt(0).toUpperCase() + cleanItem.slice(1)}
                  cooldown={cooldowns.clean}
                  maxCooldown={DEFAULT_COOLDOWNS.clean}
                  isDisabled={isOnCooldown.clean || isDead}
                  onClick={() => {
                    setSelectedCleanItem(index);
                    handleButtonClick("a");
                  }}
                />
              </div>
            ))}
          </div>
        </>
      );
    }
    
    // Doctor page
    if (menuStack[menuStack.length - 1] === "doctor") {
      return (
        <>
          <StatusHeader animatedPoints={animatedPoints} health={health} />
          <div className="absolute top-[50px] left-0 right-0 text-center text-xs text-[#606845]">Select treatment option:</div>
          <div className="flex-grow flex items-center justify-center scale-[0.9] mb-[12px]">{getCatEmotion()}</div>
          <div className="flex justify-around w-full px-1 pt-3 pb-0">
            {["checkup", "medicine", "vaccine", "surgery"].map((doctorItem, index) => (
              <div key={index} className="transform scale-100">
                <PixelIcon 
                  icon={doctorItem as any}
                  isHighlighted={selectedDoctorItem === index}
                  label={doctorItem.charAt(0).toUpperCase() + doctorItem.slice(1)}
                  cooldown={cooldowns.heal}
                  maxCooldown={DEFAULT_COOLDOWNS.heal}
                  isDisabled={isOnCooldown.heal || isDead}
                  onClick={() => {
                    setSelectedDoctorItem(index);
                    handleButtonClick("a");
                  }}
                />
              </div>
            ))}
          </div>
        </>
      );
    }
  };

  // Add a logout function that disconnects the wallet and redirects to landing page
  const handleLogout = useCallback(() => {
    disconnect();
    router.push('/');
  }, [disconnect, router]);

  // Add an effect to reset mostRecentTask when cooldowns finish
  useEffect(() => {
    // If there's a most recent task but its cooldown is finished, reset it
    if (mostRecentTask === 'feed' && !isOnCooldown.feed) {
      setMostRecentTask(null);
    } else if (mostRecentTask === 'clean' && !isOnCooldown.clean) {
      setMostRecentTask(null);
    }
  }, [isOnCooldown.feed, isOnCooldown.clean, mostRecentTask]);

  return (
    <div className="flex w-full min-h-screen p-2 sm:p-4 items-center justify-center">
      
      {/* Responsive layout container */}
      <div className="flex flex-col lg:flex-row w-full max-w-[1400px] mx-auto gap-3 sm:gap-6 items-stretch justify-center">
        {/* Left column - AI Pet Advisor */}
        <div className="w-full lg:w-1/4 order-2 lg:order-1 min-h-[200px] min-w-[280px] px-0">
          <AIPetAdvisor 
            isDead={isDead}
            food={food}
            happiness={happiness}
            cleanliness={cleanliness}
            energy={energy}
            health={health}
            aiAdvice={aiAdvice}
            aiPersonality={aiPersonality}
            className="h-full"
          />
        </div>

        {/* Center column - Game device */}
        <div className="w-full lg:w-2/4 flex flex-col items-center justify-start order-1 lg:order-2 mx-auto">
          <div className="flex justify-center items-center w-full  max-md:min-h-[100vh] max-h-[100vh]">
            <div className="relative w-full max-w-[398px]">
              {/* Gamepad image - base layer */}
              <div className="relative w-[398px] h-[514px]">
                <Image
                  src="/assets/devices/gamepad.png"
                  alt="Game Device"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
              
              {/* Game screen - positioned according to SVG */}
              <div className="absolute top-[94px] left-[76px] w-[247px] h-[272px] bg-[#eff8cb] rounded-lg overflow-hidden z-[-1]">
                <div className="relative w-full h-full p-3 flex flex-col items-center justify-between">
                  <div className="absolute inset-0 mix-blend-multiply opacity-90 pointer-events-none" />
                  {renderMenuContent()}
                </div>
              </div>
              
              {/* Control buttons positioned according to SVG */}
              {/* Left button */}
              <button 
                onClick={() => handleButtonClick("previous")}
                className="absolute rounded-full overflow-hidden focus:outline-none active:scale-95 transition-transform"
                style={{ 
                  top: "395px", 
                  left: "80px", 
                  width: "52px", 
                  height: "52px",
                }}
                aria-label="Previous"
              >
                <div className="absolute inset-0 bg-black/0 active:bg-[#697140e0] active:shadow-[inset_8px_8px_3px_rgba(0,0,0,0.25),inset_4px_4px_3px_rgba(0,0,0,0.25),inset_0px_0px_15px_rgba(0,0,0,0.4),-1px_-3px_0px_rgba(0,0,0,0.55)] rounded-full transition-all" />
              </button>
              
              {/* Right button */}
              <button 
                onClick={() => handleButtonClick("next")}
                className="absolute rounded-full overflow-hidden focus:outline-none active:scale-95 transition-transform"
                style={{ 
                  top: "395px", 
                  left: "142px", 
                  width: "52px", 
                  height: "52px",
                }}
                aria-label="Next"
              >
                <div className="absolute inset-0 bg-black/0 active:bg-[#697140e0] active:shadow-[inset_8px_8px_3px_rgba(0,0,0,0.25),inset_4px_4px_3px_rgba(0,0,0,0.25),inset_0px_0px_15px_rgba(0,0,0,0.4),-1px_-3px_0px_rgba(0,0,0,0.55)] rounded-full transition-all" />
              </button>
              
              {/* Accept button (A) */}
              <button 
                onClick={() => handleButtonClick("a")}
                className="absolute rounded-full overflow-hidden focus:outline-none active:scale-95 transition-transform"
                style={{ 
                  top: "395px", 
                  left: "205px", 
                  width: "52px", 
                  height: "52px",
                }}
                aria-label="A"
              >
                <div className="absolute inset-0 bg-black/0 active:bg-[#697140e0] active:shadow-[inset_8px_8px_3px_rgba(0,0,0,0.25),inset_4px_4px_3px_rgba(0,0,0,0.25),inset_0px_0px_15px_rgba(0,0,0,0.4),-1px_-3px_0px_rgba(0,0,0,0.55)] rounded-full transition-all" />
              </button>
              
              {/* Cancel button (B) */}
              <button 
                onClick={() => handleButtonClick("b")}
                className="absolute rounded-full overflow-hidden focus:outline-none active:scale-95 transition-transform"
                style={{ 
                  top: "395px", 
                  left: "267px", 
                  width: "52px", 
                  height: "52px",
                }}
                aria-label="B"
              >
                <div className="absolute inset-0 bg-black/0 active:bg-[#697140e0] active:shadow-[inset_8px_8px_3px_rgba(0,0,0,0.25),inset_4px_4px_3px_rgba(0,0,0,0.25),inset_0px_0px_15px_rgba(0,0,0,0.4),-1px_-3px_0px_rgba(0,0,0,0.55)] rounded-full transition-all" />
              </button>
            </div>
          </div>
        </div>

        {/* Right column - Points Earned Panel */}
        <div className="w-full lg:w-1/4 flex justify-center order-3 min-h-[200px] min-w-[280px] px-0">
          <PointsEarnedPanel 
            className="w-full h-full"
            currentPoints={userData.points}
            pointsMultiplier={walletData?.multiplier || 1.0}
            recentActivities={userActivities} // Pass user activities
            isLoading={isActivitiesLoading} // Pass loading state
            onPointsEarned={useCallback((earnedPoints: number) => {
              const newPoints = userData.points + earnedPoints;
              if (newPoints !== lastUpdatedPointsRef.current) {
                updateUserDataPoints(newPoints);
                lastUpdatedPointsRef.current = newPoints;
                
                // Don't create an activity for auto points - we only want to show interactions
              }
            }, [userData.points, lastUpdatedPointsRef, updateUserDataPoints])}
          />
        </div>
      </div>
    </div>
  );
}

