"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { StatusBar } from "@/components/ui/status-bar";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { DeviceIndicators } from "./device-indicators";
import { HappyCat, AlertCat, SadCat, TiredCat, HungryCat, DeadCat } from "./cat-emotions";
import { usePetInteractions } from "@/hooks/use-pet-interactions";
import { useMenuNavigation } from "@/hooks/use-menu-navigation";
import { formatPoints } from "@/utils/stats-helpers";
import { AIPetAdvisor } from "@/components/ui/ai-pet-advisor";
import { PointAnimation } from "@/components/ui/point-animation";
import { useWallet } from "@/context/WalletContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { GPTLogsPanel } from "@/components/ui/gpt-logs-panel";
import { updateUserScore } from "@/utils/leaderboard";

export function KawaiiDevice() {
  const router = useRouter();
  const { isConnected, publicKey, walletData, updatePoints, disconnect, burnPoints } = useWallet();
  
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

  // Update wallet points whenever game points change (with debouncing)
  useEffect(() => {
    const updateWalletData = async () => {
      if (isConnected && points > 0 && points !== lastUpdatedPointsRef.current) {
        // Only update if points have actually changed significantly
        if (Math.abs(points - lastUpdatedPointsRef.current) >= 5) {
          try {
            await updatePoints(points);
            lastUpdatedPointsRef.current = points;
            
            // Update leaderboard with the user's current score (debounced)
            if (publicKey) {
              // Clear any existing timer
              if (leaderboardUpdateTimerRef.current) {
                clearTimeout(leaderboardUpdateTimerRef.current);
              }
              
              // Set a new timer to debounce the leaderboard update
              leaderboardUpdateTimerRef.current = setTimeout(() => {
                console.log("Debounced update: Updating leaderboard after delay");
                updateUserScore(publicKey, points)
                  .catch(err => console.error('Error updating leaderboard:', err));
                leaderboardUpdateTimerRef.current = null;
              }, LEADERBOARD_UPDATE_DELAY);
            }
          } catch (error) {
            console.error('Error updating wallet points:', error);
          }
        }
      }
    };
    
    updateWalletData();
    
    return () => {
      // Clean up timer on component unmount
      if (leaderboardUpdateTimerRef.current) {
        clearTimeout(leaderboardUpdateTimerRef.current);
      }
    };
  }, [points, isConnected, updatePoints, publicKey]);

  // Update leaderboard when pet dies (this can remain immediate since it's a one-time event)
  useEffect(() => {
    if (isDead && isConnected && publicKey && points > 0) {
      // Save final score to leaderboard
      updateUserScore(publicKey, points)
        .catch(err => console.error('Error updating leaderboard on death:', err));
    }
  }, [isDead, isConnected, publicKey, points]);

  const [showReviveConfirm, setShowReviveConfirm] = useState(false);

  const getCatEmotion = () => {
    if (isDead) return <DeadCat />;
    if (isMenuActive) return <AlertCat selectedMenuItem={selectedMenuItem} />;
    if (isFeeding)
      return (
        <motion.div animate={{ rotate: [0, -5, 5, -5, 0] }} transition={{ duration: 0.5 }}>
          <HappyCat />
        </motion.div>
      );
    if (isPlaying)
      return (
        <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: 2, duration: 0.3 }}>
          <HappyCat />
        </motion.div>
      );
    if (isCleaning)
      return (
        <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.5 }}>
          <HappyCat />
        </motion.div>
      );
    if (isHealing)
      return (
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.5 }}>
          <HappyCat />
        </motion.div>
      );
    if (food < 30) return <HungryCat />;
    if (happiness < 30) return <SadCat />;
    if (energy < 30 || food < 50 || happiness < 50) return <TiredCat />;
    return <HappyCat />;
  };

  // Define handleInteraction before it's used in handleButtonClick
  const handleInteraction = async (type: string) => {
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
          <div className="flex justify-between w-full mb-2">
            <StatusBar value={food} type="food" />
            <StatusBar value={health} type="health" />
          </div>
          <div className="flex-grow flex flex-col items-center justify-center">
            {getCatEmotion()}
            <p className="text-red-500 font-bold mt-4">Your pet has died!</p>
            <p className="text-sm mt-1 mb-2">Total tokens remaining: 100</p>
            
            {showReviveConfirm ? (
              <div className="mt-2 p-2 bg-gray-100 rounded-md text-center">
                <p className="text-sm mb-2">Revive your pet by burning 50% of your points?</p>
                <p className="text-xs mb-3">Current points: {formatPoints(points)}</p>
                <div className="flex space-x-2 justify-center">
                  <button 
                    onClick={handleReviveConfirm} 
                    className="bg-green-500 text-white py-1 px-3 rounded-md text-sm"
                  >
                    Confirm
                  </button>
                  <button 
                    onClick={handleReviveCancel} 
                    className="bg-red-500 text-white py-1 px-3 rounded-md text-sm"
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
          <div className="flex justify-between w-full mb-2">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[#4b6130]">⭐</span>
                <span className="text-xs text-[#4b6130]">Points: {formatPoints(points)}</span>
              </div>
            </div>
            <div className="flex-1 ml-2">
              <StatusBar value={health} type="health" />
            </div>
          </div>
          <div className="flex-grow flex items-center justify-center relative">
            <div className="relative w-full h-full">
              {getCatEmotion()}
            </div>
            
            {/* Cooldown indicators */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-2">
              {Object.entries(isOnCooldown).map(([type, active]) => 
                active && (
                  <div key={type} className="text-xs px-2 py-0.5 bg-gray-700 text-white rounded-full opacity-80">
                    {type}: {Math.ceil(cooldowns[type as keyof typeof cooldowns] / 1000)}s
                  </div>
                )
              )}
            </div>
          </div>
          <div className="flex justify-around w-full px-2 pt-2 border-t-2 border-gray-400">
            {["food", "clean", "doctor", "play"].map((icon, index) => (
              <PixelIcon
                key={index}
                icon={icon as "food" | "clean" | "doctor" | "play"}
                isHighlighted={selectedMenuItem === index}
              />
            ))}
          </div>
        </>
      );
    }
    
    // Food page - show hunger and energy stats
    if (menuStack[menuStack.length - 1] === "food") {
      return (
        <>
          <div className="flex justify-between w-full mb-2">
            <div className="flex-1">
              <StatusBar value={food} type="food" />
            </div>
            <div className="flex-1">
              <StatusBar value={energy} type="energy" />
            </div>
          </div>
          <div className="text-xs mb-2">Select food to feed your pet:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2 border-t-2 border-gray-400">
            <PixelIcon icon="fish" label="Fish" isHighlighted={selectedFoodItem === 0} />
            <PixelIcon icon="cookie" label="Cookie" isHighlighted={selectedFoodItem === 1} />
            <PixelIcon icon="catFood" label="Cat Food" isHighlighted={selectedFoodItem === 2} />
            <PixelIcon icon="kibble" label="Kibble" isHighlighted={selectedFoodItem === 3} />
          </div>
        </>
      );
    }
    
    // Play page - show happiness and energy stats
    if (menuStack[menuStack.length - 1] === "play") {
      return (
        <>
          <div className="flex justify-between w-full mb-2">
            <div className="flex-1">
              <StatusBar value={happiness} type="happiness" />
            </div>
            <div className="flex-1">
              <StatusBar value={energy} type="energy" />
            </div>
          </div>
          <div className="text-xs mb-2">Choose a game to play:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2 border-t-2 border-gray-400">
            <PixelIcon icon="laser" label="Laser" isHighlighted={selectedPlayItem === 0} />
            <PixelIcon icon="feather" label="Feather" isHighlighted={selectedPlayItem === 1} />
            <PixelIcon icon="ball" label="Ball" isHighlighted={selectedPlayItem === 2} />
            <PixelIcon icon="puzzle" label="Puzzle" isHighlighted={selectedPlayItem === 3} />
          </div>
        </>
      );
    }
    
    // Clean page - show cleanliness and happiness stats
    if (menuStack[menuStack.length - 1] === "clean") {
      return (
        <>
          <div className="flex justify-between w-full mb-2">
            <div className="flex-1">
              <StatusBar value={cleanliness} type="cleanliness" />
            </div>
            <div className="flex-1">
              <StatusBar value={happiness} type="happiness" />
            </div>
          </div>
          <div className="text-xs mb-2">Choose grooming method:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2 border-t-2 border-gray-400">
            <PixelIcon icon="brush" label="Brush" isHighlighted={selectedCleanItem === 0} />
            <PixelIcon icon="bath" label="Bath" isHighlighted={selectedCleanItem === 1} />
            <PixelIcon icon="nails" label="Nails" isHighlighted={selectedCleanItem === 2} />
            <PixelIcon icon="styling" label="Style" isHighlighted={selectedCleanItem === 3} />
            <PixelIcon icon="dental" label="Dental" isHighlighted={selectedCleanItem === 4} />
          </div>
        </>
      );
    }
    
    // Doctor page - show all stats
    if (menuStack[menuStack.length - 1] === "doctor") {
      return (
        <>
          <div className="grid grid-cols-2 gap-2 w-full mb-2">
            <StatusBar value={food} type="food" />
            <StatusBar value={energy} type="energy" />
              <StatusBar value={happiness} type="happiness" />
            <StatusBar value={cleanliness} type="cleanliness" />
          </div>
          <div className="text-xs mb-2">Select treatment option:</div>
          <div className="flex-grow flex items-center justify-center">{getCatEmotion()}</div>
          <div className="flex justify-between w-full px-2 pt-2 border-t-2 border-gray-400">
            <PixelIcon icon="checkup" label="Check-up" isHighlighted={selectedDoctorItem === 0} />
            <PixelIcon icon="vitamins" label="Vitamins" isHighlighted={selectedDoctorItem === 1} />
            <PixelIcon icon="vaccine" label="Vaccine" isHighlighted={selectedDoctorItem === 2} />
            <PixelIcon icon="surgery" label="Surgery" isHighlighted={selectedDoctorItem === 3} />
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

  return (
    <div className="w-full flex items-center justify-center min-h-screen p-4">
      {/* Navigation and Dev Tools */}
      <div className="absolute top-4 right-4 flex space-x-2">
        {isConnected && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleLogout}
            className="text-xs"
          >
            Logout
          </Button>
        )}
      </div>
      
      {/* Three-column layout */}
      <div className="flex w-full max-w-6xl justify-between">
        {/* Left column - AI Pet Advisor and Notifications */}
        <div className="w-1/2">
          <AIPetAdvisor 
            show={true}
            isDead={isDead}
            food={food}
            happiness={happiness}
            cleanliness={cleanliness}
            energy={energy}
            health={health}
            aiAdvice={aiAdvice}
            aiPersonality={aiPersonality}
          />
          {/* Notifications and other elements */}
          {showInteraction && currentInteraction && (
            <motion.div 
              className="bg-white p-4 rounded-lg shadow-lg z-10 max-w-xs mt-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <h3 className="font-bold">{currentInteraction.type}</h3>
              {currentInteraction.stats && (
                <>
                  <p>Food: {currentInteraction.stats.food.toFixed(1)}%</p>
                  <p>Happiness: {currentInteraction.stats.happiness.toFixed(1)}%</p>
                  <p>Cleanliness: {currentInteraction.stats.cleanliness.toFixed(1)}%</p>
                  <p>Energy: {currentInteraction.stats.energy.toFixed(1)}%</p>
                  <p>Health: {currentInteraction.stats.health.toFixed(1)}%</p>
                </>
              )}
              {currentInteraction.emotion && <p>Pet is feeling {currentInteraction.emotion}</p>}
            </motion.div>
          )}
        </div>
        
        {/* Center column - Game device */}
        <div className="relative flex flex-col items-center justify-center">
          {/* Display pet message in a cute speech bubble when available */}
          <AnimatePresence>
            {petMessage && (
              <motion.div 
                id="ainotification"
                className={`absolute left-0 right-0 bg-white p-3 rounded-lg shadow-md mb-2 max-w-[300px] text-center ${
                  petReaction === "happy" || petReaction === "excited" ? "border-green-300" :
                  petReaction === "sad" || petReaction === "hungry" || petReaction === "sleepy" ? "border-blue-300" :
                  petReaction === "angry" || petReaction === "sick" ? "border-red-300" :
                  petReaction === "clean" ? "border-cyan-300" :
                  petReaction === "dirty" ? "border-amber-300" :
                  "border-gray-200"
                }`}
                style={{ 
                  top: '-10px',
                  transform: 'translateY(-100%)',
                  border: "2px solid",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.05)",
                  zIndex: 100,
                }}
                initial={{ opacity: 0, y: -20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  x: petReaction === "excited" ? [0, -5, 5, -5, 0] : 0,
                  rotate: petReaction === "happy" ? [0, -2, 2, -2, 0] : 0
                }}
                transition={{ 
                  duration: 0.5,
                  x: { duration: 0.5, repeat: petReaction === "excited" ? 2 : 0 },
                  rotate: { duration: 0.5, repeat: petReaction === "happy" ? 2 : 0 }
                }}
                exit={{ opacity: 0, y: -10 }}
              >
                {/* Pet message content */}
                <div className="text-sm font-medium text-gray-800">
                  {petMessage}
                </div>
                
                {/* Reaction emoji */}
                <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
                  {petReaction === "happy" && "😊"}
                  {petReaction === "sad" && "😢"}
                  {petReaction === "excited" && "🤩"}
                  {petReaction === "sleepy" && "😴"}
                  {petReaction === "hungry" && "🍽️"}
                  {petReaction === "angry" && "😠"}
                  {petReaction === "sick" && "🤒"}
                  {petReaction === "clean" && "✨"}
                  {petReaction === "dirty" && "🧹"}
                  {petReaction === "none" && "😐"}
                </div>
                
                {/* Speech bubble tail */}
                <div 
                  className={`absolute w-4 h-4 bg-white rotate-45 ${
                    petReaction === "happy" || petReaction === "excited" ? "bg-green-100" :
                    petReaction === "sad" || petReaction === "hungry" || petReaction === "sleepy" ? "bg-blue-100" :
                    petReaction === "angry" || petReaction === "sick" ? "bg-red-100" :
                    petReaction === "clean" ? "bg-cyan-100" :
                    petReaction === "dirty" ? "bg-amber-100" :
                    "bg-white"
                  }`}
                  style={{
                    bottom: "-8px",
                    left: "50%",
                    marginLeft: "-8px",
                    boxShadow: "2px 2px 0 0 #e9e9e9",
                    zIndex: -1
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
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
            <div className="bg-[#eff8cb]  rounded-[1.5rem] p-2 mb-4 relative">
              <div className="relative  p-3 flex flex-col items-center justify-between h-[320px]">
                
                {/* Game Boy-like color filter */}
                <div className="absolute inset-0 mix-blend-multiply opacity-90 pointer-events-none" />
                
                {/* Point animation */}
                {recentPointGain && !pointAnimationComplete && (
                  <PointAnimation 
                    points={recentPointGain.amount}
                    show={true}
                    onComplete={handlePointAnimationComplete}
                  />
                )}
                
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
                    aria-label={label}>
                    <div className={`absolute inset-0 rounded-full ${index < 2 ? "bg-gradient-to-br from-gray-200 to-gray-400" : "bg-gradient-to-br from-red-400 to-red-600"}`} />

                    <div
                      className={`absolute inset-[2px] rounded-full ${
                        index < 2 ? "bg-gradient-to-tl from-gray-300 to-gray-200" : "bg-gradient-to-tl from-red-500 to-red-400"
                      } flex items-center justify-center`}>
                      {index < 2 ? (
                        <div className={`w-5 h-5 flex items-center justify-center ${index === 0 ? "-translate-x-0.5" : "translate-x-0.5"}`}>
                          <div
                            className={`w-0 h-0 ${
                              index === 0 ? "border-r-[8px] border-r-gray-500 border-y-[5px] border-y-transparent" : "border-l-[8px] border-l-gray-500 border-y-[5px] border-y-transparent"
                            }`}
                          />
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
        
        {/* Right column - GPT Logs Panel */}
        <div className="w-1/2">
          <GPTLogsPanel />
        </div>
      </div>
    </div>
  );
}
