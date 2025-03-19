"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import type { PetStats } from "@/hooks/use-pet-interactions"

interface AIPetAdvisorProps {
  petStats: Omit<PetStats, 'points' | 'isDead'>
  cooldowns: {
    feed: number
    play: number
    clean: number
    doctor: number
  }
}

export function AIPetAdvisor({ petStats, cooldowns }: AIPetAdvisorProps) {
  const [showAdvice, setShowAdvice] = useState(false)
  const [currentAdvice, setCurrentAdvice] = useState<string>("")

  // Generate advice based on pet stats
  useEffect(() => {
    const { food, happiness, cleanliness, energy, health } = petStats
    
    // Find the most urgent need
    const needs = [
      { type: 'feed', value: food, threshold: 40, cooldown: cooldowns.feed },
      { type: 'play', value: happiness, threshold: 40, cooldown: cooldowns.play },
      { type: 'clean', value: cleanliness, threshold: 40, cooldown: cooldowns.clean },
      { type: 'health', value: health, threshold: 50, cooldown: cooldowns.doctor }
    ].sort((a, b) => {
      // Sort by urgency but consider cooldowns
      const aUrgency = a.threshold - a.value
      const bUrgency = b.threshold - b.value
      
      // If both are urgent, prioritize the one that's not on cooldown
      if (aUrgency > 0 && bUrgency > 0) {
        if (a.cooldown === 0 && b.cooldown > 0) return -1
        if (a.cooldown > 0 && b.cooldown === 0) return 1
      }
      
      return bUrgency - aUrgency
    })
    
    // Generate advice based on top need
    const topNeed = needs[0]
    
    // Only give advice if there's an actual need
    if (topNeed.threshold - topNeed.value > 0) {
      let advice = ""
      
      if (topNeed.cooldown > 0) {
        // If top need is on cooldown, suggest alternative
        const alternativeNeed = needs.find(need => need.cooldown === 0 && need.threshold - need.value > 0)
        if (alternativeNeed) {
          advice = getAdviceForNeed(alternativeNeed.type)
        } else {
          advice = `I recommend waiting, all activities are on cooldown (${Math.ceil(topNeed.cooldown / 1000)}s)`
        }
      } else {
        advice = getAdviceForNeed(topNeed.type)
      }
      
      setCurrentAdvice(advice)
      setShowAdvice(true)
      
      // Hide advice after 5 seconds
      const timer = setTimeout(() => {
        setShowAdvice(false)
      }, 5000)
      
      return () => clearTimeout(timer)
    } else {
      // If all stats are above thresholds, show balanced status
      if (needs.every(need => need.value >= need.threshold)) {
        setCurrentAdvice("Your pet is doing great! Keep up the balanced care.")
        setShowAdvice(true)
        
        // Hide advice after 5 seconds
        const timer = setTimeout(() => {
          setShowAdvice(false)
        }, 5000)
        
        return () => clearTimeout(timer)
      }
    }
  }, [petStats, cooldowns])
  
  const getAdviceForNeed = (needType: string): string => {
    switch (needType) {
      case 'feed':
        return "Your pet is hungry! Feed it for bonus points."
      case 'play':
        return "Your pet is sad! Play with it for increased points."
      case 'clean':
        return "Your pet needs grooming! Clean it for extra points."
      case 'health':
        return "Your pet's health is low! Visit the doctor for max points."
      default:
        return "Monitor your pet's needs for bonus points."
    }
  }

  return (
    <AnimatePresence>
      {showAdvice && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-indigo-600 text-white px-4 py-2 text-sm rounded-md shadow-lg max-w-xs"
        >
          <div className="flex items-center">
            <span className="mr-2 text-lg">🤖</span>
            <p>{currentAdvice}</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 