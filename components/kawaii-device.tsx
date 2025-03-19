"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
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

export function KawaiiDevice() {
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
    recentPointGain
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

  // Button navigation handler with proper integrations
  const handleButtonClick = useCallback(
    (option: "food" | "clean" | "doctor" | "play" | "previous" | "next" | "a" | "b") => {
      setLastInteractionTime(Date.now());
      
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
          const foodTypes = ["fish", "cookie", "catFood", "kibble"];
          if (selectedFoodItem !== null && selectedFoodItem < foodTypes.length) {
            const success = handleFeeding(foodTypes[selectedFoodItem], selectedFoodItem);
            if (success) {
              resetMenu();
            }
          }
        } else if (menuStack[menuStack.length - 1] === "play") {
          // Handle play selection
          const playTypes = ["laser", "feather", "ball", "puzzle"];
          if (selectedPlayItem !== null && selectedPlayItem < playTypes.length) {
            const success = handlePlaying(playTypes[selectedPlayItem], selectedPlayItem);
            if (success) {
              resetMenu();
            }
          }
        } else if (menuStack[menuStack.length - 1] === "clean") {
          // Handle clean selection
          const cleanTypes = ["brush", "bath", "nails", "styling", "dental"];
          if (selectedCleanItem !== null && selectedCleanItem < cleanTypes.length) {
            const success = handleCleaning(cleanTypes[selectedCleanItem], selectedCleanItem);
            if (success) {
              resetMenu();
            }
          }
        } else if (menuStack[menuStack.length - 1] === "doctor") {
          // Handle doctor selection
          const doctorTypes = ["checkup", "vitamins", "vaccine", "surgery"];
          if (selectedDoctorItem !== null && selectedDoctorItem < doctorTypes.length) {
            const success = handleDoctor(doctorTypes[selectedDoctorItem], selectedDoctorItem);
            if (success) {
              resetMenu();
            }
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
      handleFeeding, 
      handlePlaying, 
      handleCleaning, 
      handleDoctor,
      resetPet,
      resetMenu,
      setLastInteractionTime,
    ]
  );
  
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
            <button onClick={() => handleButtonClick("a")} className="mt-2 bg-green-500 text-white py-1 px-3 rounded-md">
              Revive
            </button>
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
                <span className="text-xs font-mono text-black">⭐</span>
                <span className="text-xs text-black">Points: {formatPoints(points)}</span>
              </div>
            </div>
            <div className="flex-1 ml-2">
              <StatusBar value={health} type="health" />
            </div>
          </div>
          <div className="flex-grow flex items-center justify-center relative">
            {getCatEmotion()}
            
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

  return (
    <div className="flex items-center justify-center min-h-screen bg-pink-100 p-4">
      {showInteraction && currentInteraction && (
        <motion.div 
          className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-10 max-w-xs"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <h3 className="font-bold">{currentInteraction.type}</h3>
          <p>Food: {currentInteraction.stats.food.toFixed(1)}%</p>
          <p>Happiness: {currentInteraction.stats.happiness.toFixed(1)}%</p>
          <p>Cleanliness: {currentInteraction.stats.cleanliness.toFixed(1)}%</p>
          <p>Energy: {currentInteraction.stats.energy.toFixed(1)}%</p>
          <p>Health: {currentInteraction.stats.health.toFixed(1)}%</p>
          <p>Pet is feeling {currentInteraction.emotion}</p>
        </motion.div>
      )}
      
      {/* AI Advisor - moved outside the device */}
      <div className="absolute top-4 left-4 z-20">
        <AIPetAdvisor 
          petStats={{ food, happiness, cleanliness, energy, health }}
          cooldowns={cooldowns}
        />
      </div>
      
      <motion.div
        className="w-full max-w-[320px] bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 rounded-[2rem] p-4 pb-16 shadow-xl relative overflow-hidden"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-purple-400/50" />
        <div className="absolute top-2 left-0 right-0 flex justify-center">
          <DeviceIndicators status={isDead ? "dead" : food < 30 ? "alert" : isFeeding || isPlaying || isCleaning || isHealing ? "active" : "idle"} />
        </div>
        <div className="bg-[#c3cfa1] rounded-lg p-2 mb-4 relative">
          <div className="relative bg-[#7b8d4c] rounded-md p-3 flex flex-col items-center justify-between h-[320px] border-4 border-[#5a6b2f] shadow-inner">
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,#00000010_1px,transparent_2px)] opacity-50" />
            
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
  );
}
