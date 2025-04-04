"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import PixelatedContainer from "@/components/game/PixelatedContainer";
import Image from "next/image";
import CustomSlider from "@/components/game/CustomSlider";

interface AIPetAdvisorProps {
  isDead: boolean;
  food: number;
  happiness: number;
  cleanliness: number;
  energy: number;
  health: number;
  aiAdvice?: string;
  aiPersonality?: any;
  className?: string;
}

export function AIPetAdvisor({
  isDead,
  food,
  happiness,
  cleanliness,
  energy,
  health,
  aiAdvice,
  aiPersonality,
  className = "",
}: AIPetAdvisorProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Get default mood based on stats
  const getDefaultMood = () => {
    if (isDead) return "Your pet has passed away.";
    if (food < 20) return "Your pet is very hungry!";
    if (happiness < 20) return "Your pet is feeling sad.";
    if (cleanliness < 20) return "Your pet needs cleaning!";
    if (energy < 20) return "Your pet is exhausted.";
    if (health < 20) return "Your pet is sick!";

    const averageStats = (food + happiness + cleanliness + energy + health) / 5;
    if (averageStats > 80) return "Your pet is thriving!";
    if (averageStats > 60) return "Your pet is doing well.";
    if (averageStats > 40) return "Your pet needs attention.";
    return "Your pet needs more care.";
  };

  // Get personalized advice
  const getAdvice = () => {
    if (isDead) return "Press reset to start over.";

    if (aiAdvice) {
      return aiAdvice;
    }

    if (food < 20) return "Feed your pet soon!";
    if (happiness < 20) return "Play with your pet to improve its mood.";
    if (cleanliness < 20) return "Time for cleaning!";
    if (energy < 20) return "Your pet needs to rest.";
    if (health < 20) return "Visit the doctor!";

    return "Try engaging in activities with your pet to improve";
  };

  // Get pet mood text
  const getPetMood = () => {
    const averageStats = (food + happiness + cleanliness + energy + health) / 5;
    
    if (isDead) return "Pet status: Deceased";
    if (averageStats > 80) return "Pet status: Excellent";
    if (averageStats > 60) return "Pet status: Good";
    if (averageStats > 40) return "Pet status: Fair";
    if (averageStats > 20) return "Pet status: Poor";
    return "Pet status: Critical";
  };

  // Get color for stat bar
  const getStatColor = (value: number) => {
    if (value > 70) return "#c7e376"; // Light green
    if (value > 40) return "#a7ba75"; // Medium green
    return "#304700";  // Dark olive green
  };

  return (
    <div className={`flex flex-col gap-3 sm:gap-8 w-full ${className}`}>
      {/* Row layout with automatic wrapping on very small screens */}
      <div className="flex flex-row flex-wrap sm:flex-col gap-3 w-full">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex-1 min-w-[280px] w-full sm:max-w-none sm:w-full"
        >
          <div className="p-2 sm:p-3 bg-[#ebffb7] border-[4px] sm:border-[6px] border-[#304700]">
            <PixelatedContainer bgcolor="#CADA9B">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 flex items-center justify-center">
                  <Image
                    src="/assets/icons/info.svg"
                    alt="Info"
                    width={24}
                    height={24}
                    className=""
                  />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-pixelify ">
                    {getDefaultMood()}
                  </div>
                  <div className="text-sm font-pixelify ">
                    {getAdvice()}
                  </div>
                </div>
              </div>
            </PixelatedContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex-1 min-w-[280px] w-full sm:w-full sm:mx-0"
        >
          <PixelatedContainer noPadding>
            <div className="w-full p-3 sm:p-4 text-[#304700]">
              <div className="text-lg font-pixelify uppercase pb-1 sm:pb-2 mb-2 sm:mb-3 border-b border-[#304700]/20">
                Status Report
              </div>
              <div className="space-y-2">
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-pixelify">Food:</span>
                    <span className="text-sm font-numbers font-medium">{Math.round(food)}%</span>
                  </div>
                  <CustomSlider 
                    value={food} 
                    maxValue={100} 
                    backgroundColor="#ebffb7"
                    barColor={getStatColor(food)}
                  />
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-pixelify">Happiness:</span>
                    <span className="text-sm font-numbers font-medium">{Math.round(happiness)}%</span>
                  </div>
                  <CustomSlider 
                    value={happiness} 
                    maxValue={100} 
                    backgroundColor="#ebffb7"
                    barColor={getStatColor(happiness)}
                  />
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-pixelify">Cleanliness:</span>
                    <span className="text-sm font-numbers font-medium">{Math.round(cleanliness)}%</span>
                  </div>
                  <CustomSlider 
                    value={cleanliness} 
                    maxValue={100} 
                    backgroundColor="#ebffb7"
                    barColor={getStatColor(cleanliness)}
                  />
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-pixelify">Energy:</span>
                    <span className="text-sm font-numbers font-medium">{Math.round(energy)}%</span>
                  </div>
                  <CustomSlider 
                    value={energy} 
                    maxValue={100} 
                    backgroundColor="#ebffb7"
                    barColor={getStatColor(energy)}
                  />
                </div>
                
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-pixelify">Health:</span>
                    <span className="text-sm font-numbers font-medium">{Math.round(health)}%</span>
                  </div>
                  <CustomSlider 
                    value={health} 
                    maxValue={100} 
                    backgroundColor="#ebffb7"
                    barColor={getStatColor(health)}
                  />
                </div>
              </div>
              <div className="mt-3 sm:mt-4 pt-2 text-sm font-pixelify border-t border-[#304700]/20">
                {getPetMood()}
              </div>
            </div>
          </PixelatedContainer>
        </motion.div>
      </div>
    </div>
  );
}

