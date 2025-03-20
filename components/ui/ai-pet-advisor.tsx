"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface AIPetAdvisorProps {
  show: boolean
  isDead: boolean
  food: number
  happiness: number
  cleanliness: number
  energy: number
  health: number
  aiAdvice?: string
  aiPersonality?: any
}

export function AIPetAdvisor({
  show,
  isDead,
  food,
  happiness,
  cleanliness,
  energy,
  health,
  aiAdvice,
  aiPersonality
}: AIPetAdvisorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showFullStats, setShowFullStats] = useState(false)
  
  useEffect(() => {
    if (show) {
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }, [show])
  
  // Get personality traits to display
  const getPersonalityTraits = () => {
    if (!aiPersonality || !aiPersonality.personalityTraits) {
      return ['Friendly', 'Playful']; // Default traits
    }
    
    return aiPersonality.personalityTraits;
  };
  
  // Get mood description
  const getMoodDescription = () => {
    if (!aiPersonality || !aiPersonality.moodDescription) {
      return getDefaultMood();
    }
    
    return aiPersonality.moodDescription;
  };
  
  // Default mood based on stats
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
    return "Your pet needs attention.";
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
    
    return "Keep caring for your pet regularly.";
  };
  
  // Get multiplier info if available
  const getMultiplierInfo = () => {
    if (!aiPersonality || !aiPersonality.multiplier) {
      return null;
    }
    
    const multiplier = aiPersonality.multiplier;
    let message = "";
    
    if (multiplier > 1.3) {
      message = "Excellent care! Earning bonus points!";
    } else if (multiplier > 1.0) {
      message = "Good care, earning extra points";
    } else if (multiplier < 0.9) {
      message = "Pet care needs improvement";
    }
    
    return message ? (
      <div className="text-xs mt-2 px-2 py-1 bg-indigo-100 rounded-full text-indigo-700 font-medium">
        {message} (×{multiplier.toFixed(1)})
      </div>
    ) : null;
  };

  if (!show) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-lg border bg-card text-card-foreground shadow-sm max-w-xs w-full"
        >
          <div className="flex flex-col space-y-1.5 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold leading-none">AI Pet Advisor</h3>
              <button 
                onClick={() => setShowFullStats(!showFullStats)}
                className="text-xs bg-muted rounded px-2 py-1 hover:bg-muted/80"
              >
                {showFullStats ? "Hide Stats" : "Show Stats"}
              </button>
            </div>
            {showFullStats && (
              <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                <div>Food: {Math.floor(food)}%</div>
                <div>Happiness: {Math.floor(happiness)}%</div>
                <div>Cleanliness: {Math.floor(cleanliness)}%</div>
                <div>Energy: {Math.floor(energy)}%</div>
                <div>Health: {Math.floor(health)}%</div>
              </div>
            )}
          </div>
          <div className="p-4 pt-0">
            <div className="mb-2">
              <h4 className="text-xs font-semibold text-muted-foreground">Personality</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                {getPersonalityTraits().map((trait: string, index: number) => (
                  <span key={index} className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                    {trait}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="text-sm font-medium mb-1">{getMoodDescription()}</div>
            <div className="text-xs text-muted-foreground">{getAdvice()}</div>
            
            {getMultiplierInfo()}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 