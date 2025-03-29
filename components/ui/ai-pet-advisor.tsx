"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import PixelatedContainer from "@/components/PixelatedContainer";
import Image from "next/image";

interface AIPetAdvisorProps {
  isDead: boolean;
  food: number;
  happiness: number;
  cleanliness: number;
  energy: number;
  health: number;
  aiAdvice?: string;
  aiPersonality?: any;
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
    if (averageStats > 40) return "Your pet is okay, but could use some care.";
    return "Your pet is okay, but could use some care.";
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

  return (
    <div className="flex flex-col gap-8 max-w-[320px] mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="max-w-xs w-full"
      >
        <div className="p-3 bg-[#ebffb7] border-[6px] border-[#304700]">
          <PixelatedContainer bgcolor="#CADA9B">
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 flex items-center justify-center">
                <Image
                  src="/assets/icons/info.svg"
                  alt="Info"
                  width={24}
                  height={24}
                  className="text-[#304700]"
                />
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-sk-eliz text-[#304700]">
                  {getDefaultMood()}
                </div>
                <div className="text-[12px] font-sk-eliz text-[#304700]">
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
        className="max-w-xs w-[225px] mx-auto"
      >
        <PixelatedContainer noPadding>
          <div className="w-full p-4">
            <div className="text-[18px] font-sk-eliz text-[#304700] uppercase pb-2 mb-2">
              Feed:
            </div>
            <div className="space-y-0">
              <div className="flex justify-between items-center">
                <span className="text-[16px] font-sk-eliz text-[#304700]">Food:</span>
                <span style={{ fontSize: '24px' }}>{Math.round(food)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[16px] font-sk-eliz text-[#304700]">Happiness:</span>
                <span style={{ fontSize: '24px' }}>{Math.round(happiness)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[16px] font-sk-eliz text-[#304700]">Cleanliness:</span>
                <span style={{ fontSize: '24px' }}>{Math.round(cleanliness)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[16px] font-sk-eliz text-[#304700]">Energy:</span>
                <span style={{ fontSize: '24px' }}>{Math.round(energy)}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[16px] font-sk-eliz text-[#304700]">Health:</span>
                <span style={{ fontSize: '24px' }}>{Math.round(health)}%</span>
              </div>
            </div>
            <div className="mt-4 text-[16px] font-sk-eliz text-[#304700]">
              Pet is feeling happy ^.^
            </div>
          </div>
        </PixelatedContainer>
      </motion.div>
    </div>
  );
}
