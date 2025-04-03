"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { StatusBar } from "@/components/ui/status-bar";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { DeviceIndicators } from "./device-indicators";
import { HappyCat, AlertCat, SadCat, TiredCat, HungryCat, DeadCat } from "./cat-emotions";
import { usePetInteractions, DEFAULT_COOLDOWNS } from "@/hooks/use-pet-interactions";
import { useMenuNavigation } from "@/hooks/use-menu-navigation";
import { formatPoints } from "@/utils/stats-helpers";
import { AIPetAdvisor } from "@/components/ui/ai-pet-advisor";
import { PointAnimation } from "@/components/ui/point-animation";
import { useWallet } from "@/context/WalletContext";
import { usePoints } from "@/context/PointsContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GPTLogsPanel } from "@/components/ui/gpt-logs-panel";
import { PointsEarnedPanel } from "@/components/ui/points-earned-panel";
import { updateUserScore } from "@/utils/leaderboard";
import Image from "next/image";
import CustomSlider from "./CustomSlider";

// Add this component near the top of the file, outside the KawaiiDevice component
interface StatusHeaderProps {
  animatedPoints: number;
  health: number;
}

const StatusHeader = ({ animatedPoints, health }: StatusHeaderProps) => {
  return (
    <div className="flex justify-between w-full mb-2">
      <div className="flex-1">
        <div className="flex items-center">
          <Image 
            src="/assets/icons/coin.png" 
            alt="Coins" 
            width={24} 
            height={24} 
            className="mr-1"
            style={{ imageRendering: 'pixelated' }}
          />
          <span className="text-s text-[#4b6130] font-numbers">{formatPoints(animatedPoints)}</span>
        </div>
      </div>
      <div className="flex-1 ml-2">
        <div className="flex items-center">
          <Image 
            src="/assets/icons/hart.png" 
            alt="Health" 
            width={24} 
            height={24} 
            className="mr-2"
            style={{ imageRendering: 'pixelated' }}
          />
          <CustomSlider 
            value={health} 
            maxValue={100}
            backgroundColor="#EBFFB7"
            barColor="#a7ba75"
            className="flex-1 mb-1"
          />
        </div>
      </div>
    </div>
  );
};

export function KawaiiDevice() {
  const router = useRouter();
  const { isConnected, publicKey, walletData, updatePoints, disconnect, burnPoints } = useWallet();
  const { globalPoints, setGlobalPoints } = usePoints();
  
  // Add state to track the most recent task type
  const [mostRecentTask, setMostRecentTask] = useState<string | null>(null);
  
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

  // Create a ref for debouncing leaderboard updates
  const leaderboardUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const LEADERBOARD_UPDATE_DELAY = 10000; // 10 seconds between leaderboard updates

  // Add this near the other refs
  const lastInteractionUpdateRef = useRef<number>(0);
  const INTERACTION_UPDATE_THROTTLE = 3000; // 3 seconds between lastInteraction updates

  // Update global points when local points change
  useEffect(() => {
    if (points > 0 && points !== lastUpdatedPointsRef.current) {
      // Use setTimeout to move the state update to the next tick
      const timeoutId = setTimeout(() => {
        setGlobalPoints(points);
        lastUpdatedPointsRef.current = points;
      }, 0);
      
      return () => clearTimeout(timeoutId);
    }
  }, [points, setGlobalPoints]);

  // Update wallet points whenever game points change (with debouncing)
  useEffect(() => {
    if (!isConnected || !publicKey) return;
    
    // Don't update if points haven't changed
    if (lastUpdatedPointsRef.current === globalPoints) return;
    
    // Clear any existing timer
    if (leaderboardUpdateTimerRef.current) {
      clearTimeout(leaderboardUpdateTimerRef.current);
    }
    
    // Set timer for next update
    leaderboardUpdateTimerRef.current = setTimeout(async () => {
      try {
        // Update wallet data first
        await updatePoints(globalPoints);
        console.log('💰 Wallet points updated successfully');
        
        // Then update leaderboard
        if (globalPoints > 0 && publicKey) {
          const updated = await updateUserScore(publicKey, globalPoints);
          if (updated) {
            console.log('🏆 Leaderboard updated successfully');
          }
        }
      } catch (error) {
        console.error('❌ Error updating points:', error);
      }
    }, LEADERBOARD_UPDATE_DELAY);
    
    // Clean up timer on unmount
    return () => {
      if (leaderboardUpdateTimerRef.current) {
        clearTimeout(leaderboardUpdateTimerRef.current);
      }
    };
  }, [globalPoints, isConnected, publicKey, updatePoints]);

  // Update leaderboard when pet dies (this can remain immediate since it's a one-time event)
  useEffect(() => {
    if (isDead && isConnected && publicKey && points > 0) {
      // Save final score to leaderboard
      updateUserScore(publicKey, points)
        .catch(err => console.error('Error updating leaderboard on death:', err));
    }
  }, [isDead, isConnected, publicKey, points]);

  const [showReviveConfirm, setShowReviveConfirm] = useState(false);

  const [animatedPoints, setAnimatedPoints] = useState(globalPoints);
  
  // Add this ref to track the previous points value
  const prevPointsRef = useRef(globalPoints);
  
  // Animation effect when global points change
  useEffect(() => {
    // Only animate if points increased
    if (globalPoints > prevPointsRef.current) {
      const startValue = prevPointsRef.current;
      const endValue = globalPoints;
      const duration = 1000; // 1 second duration
      const startTime = performance.now();
      
      // Update the reference immediately
      prevPointsRef.current = globalPoints;
      
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
      setAnimatedPoints(globalPoints);
      prevPointsRef.current = globalPoints;
    }
  }, [globalPoints]);

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

  // Define handleInteraction before it's used in handleButtonClick
  const handleInteraction = async (type: string) => {
    // Set the most recent task type
    setMostRecentTask(type);
    
    switch (type) {
      case 'feed':
        await handleFeeding(); // Handle async operation
        break;
      case 'play':
        await handlePlaying(); // Handle async operation
        break;
      case 'clean':
        await handleCleaning(); // Handle async operation
        break;
      case 'doctor':
        await handleDoctor(); // Handle async operation
        break;
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
            {getCatEmotion()}
            <p className="text-red-500 font-bold mt-4">Your pet has died!</p>
            <p className="text-xs mt-1 mb-2">Total tokens remaining: <span className="font-numbers">100</span></p>
            
            {showReviveConfirm ? (
              <div className="mt-2 p-2 bg-gray-100 rounded-md text-center">
                <p className="text-xs mb-3">Current points: <span className="font-numbers">{formatPoints(globalPoints)}</span></p>
                <div className="flex space-x-2 justify-center">
                  <button 
                    onClick={handleReviveConfirm} 
                    className="bg-green-500 text-white py-1 px-3 rounded-md text-xs"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={handleReviveCancel} 
                    className="bg-red-500 text-white py-1 px-3 rounded-md text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={handleReviveRequest} 
                className="mt-2 bg-green-500 text-white py-1 px-3 rounded-md"
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
          <div className="flex-grow flex items-center justify-center relative">
            <div className="relative w-full">
              {getCatEmotion()}
            </div>
          </div>
          <div className="flex justify-around w-full px-2 pt-2">
            {["food", "clean", "doctor", "play"].map((icon, index) => (
              <PixelIcon
                key={index}
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
            ))}
          </div>
        </>
      );
    }
    
    // Food page - show standard status bar, remove other status bars
    if (menuStack[menuStack.length - 1] === "food") {
      return (
        <>
          <StatusHeader animatedPoints={animatedPoints} health={health} />
          <div className="absolute top-12 left-0 right-0 text-xs text-center">Select food to feed your pet:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2">
            {["fish", "cookie", "catFood", "kibble"].map((foodItem, index) => (
              <PixelIcon 
                key={index}
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
            ))}
          </div>
        </>
      );
    }
    
    // Play page - show standard status bar, remove other status bars
    if (menuStack[menuStack.length - 1] === "play") {
      return (
        <>
          <StatusHeader animatedPoints={animatedPoints} health={health} />
          <div className="absolute top-12 left-0 right-0 text-xs text-center">Choose a game to play:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2">
            {["laser", "feather", "ball", "puzzle"].map((playItem, index) => (
              <PixelIcon 
                key={index}
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
            ))}
          </div>
        </>
      );
    }
    
    // Clean page - show standard status bar, remove other status bars
    if (menuStack[menuStack.length - 1] === "clean") {
      return (
        <>
          <StatusHeader animatedPoints={animatedPoints} health={health} />
          <div className="absolute top-12 left-0 right-0 text-xs text-center">Choose grooming method:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2">
            {["brush", "bath", "nails", "dental"].map((cleanItem, index) => (
              <PixelIcon 
                key={index}
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
            ))}
          </div>
        </>
      );
    }
    
    // Doctor page - show standard status bar, remove other status bars
    if (menuStack[menuStack.length - 1] === "doctor") {
      return (
        <>
          <StatusHeader animatedPoints={animatedPoints} health={health} />
          <div className="absolute top-12 left-0 right-0 text-xs text-center">Select treatment option:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2">
            {["checkup", "medicine", "vaccine", "surgery"].map((doctorItem, index) => (
              <PixelIcon 
                key={index}
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
    <div className="flex w-full min-h-screen p-4 items-center justify-center">
      
      {/* Responsive layout container */}
      <div className="flex flex-col lg:flex-row w-full max-w-[1400px] mx-auto gap-6 items-center justify-center">
        {/* Left column - AI Pet Advisor */}
        <div className="flexw-full lg:w-1/4 order-2 lg:order-1">
          <AIPetAdvisor 
            isDead={isDead}
            food={food}
            happiness={happiness}
            cleanliness={cleanliness}
            energy={energy}
            health={health}
            aiAdvice={aiAdvice}
            aiPersonality={aiPersonality}
          />
        </div>

        {/* Center column - Game device */}
        <div className="w-full lg:w-2/4 flex flex-col items-center justify-start order-1 lg:order-2">
          <motion.div
            className="w-full max-w-[320px] bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 rounded-[2rem] p-4 pb-16 shadow-xl relative"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-purple-400/50" />
            <div className="absolute top-2 left-0 right-0 flex justify-center">
              <DeviceIndicators status={isDead ? "dead" : food < 30 ? "alert" : isFeeding || isPlaying || isCleaning || isHealing ? "active" : "idle"} />
            </div>
            <div className="bg-[#eff8cb] rounded-[1.5rem] p-2 mb-4 relative">
              <div className="relative p-3 flex flex-col items-center justify-between h-[320px]">
                <div className="absolute inset-0 mix-blend-multiply opacity-90 pointer-events-none" />
                {renderMenuContent()}
              </div>
            </div>

            <div className="relative mt-6 flex justify-around px-2 space-x-2">
              {["Previous", "Next", "A", "B"].map((label, index) => (
                <div key={index} className="flex flex-col items-center">
                  <motion.button
                    onClick={() => handleButtonClick(label.toLowerCase() as "previous" | "next" | "a" | "b")}
                    className={`w-10 h-10 rounded-full relative group overflow-hidden ${index < 2 ? "bg-gray-300" : "bg-red-500"}`}
                    whileTap={{ scale: 0.95 }}
                    aria-label={label}
                  >
                    <div className={`absolute inset-0 rounded-full ${index < 2 ? "bg-gradient-to-br from-gray-200 to-gray-400" : "bg-gradient-to-br from-red-400 to-red-600"}`} />
                    <div className={`absolute inset-[2px] rounded-full ${index < 2 ? "bg-gradient-to-tl from-gray-300 to-gray-200" : "bg-gradient-to-tl from-red-500 to-red-400"} flex items-center justify-center`}>
                      {index < 2 ? (
                        <div className={`w-5 h-5 flex items-center justify-center ${index === 0 ? "-translate-x-0.5" : "translate-x-0.5"}`}>
                          <div className={`w-0 h-0 ${index === 0 ? "border-r-[8px] border-r-gray-500 border-y-[5px] border-y-transparent" : "border-l-[8px] border-l-gray-500 border-y-[5px] border-y-transparent"}`} />
                        </div>
                      ) : (
                        <span className="text-sm font-bold text-white">{label}</span>
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-full opacity-0 group-active:opacity-100 bg-black/10 transition-opacity" />
                  </motion.button>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right column - Points Earned Panel */}
        <div className="w-full lg:w-1/4 flex justify-center order-3">
          <PointsEarnedPanel 
            className="w-full"
            currentPoints={globalPoints}
            pointsMultiplier={walletData?.multiplier || 1.0}
            onPointsEarned={useCallback((earnedPoints: number) => {
              const newPoints = globalPoints + earnedPoints;
              if (newPoints !== lastUpdatedPointsRef.current) {
                setGlobalPoints(newPoints);
                lastUpdatedPointsRef.current = newPoints;
              }
            }, [globalPoints, lastUpdatedPointsRef, setGlobalPoints])}
          />
        </div>
      </div>
    </div>
  );
}
