import { useState, useCallback, useRef, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import type { Interaction } from "@/types/interaction"
import { capStat } from "@/utils/stats-helpers"
import { useWallet } from "@/context/WalletContext"
import { saveWalletData } from "@/utils/wallet"

export interface PetStats {
  food: number
  happiness: number
  cleanliness: number
  energy: number
  health: number
  isDead: boolean
  points: number
}

interface PetStatsUpdate {
  food?: number
  happiness?: number
  cleanliness?: number
  energy?: number
  health?: number
}

interface ActionCooldowns {
  feed: number
  play: number
  clean: number
  doctor: number
}

export interface PointGain {
  amount: number
  timestamp: number
}

// Default cooldown times in milliseconds
const DEFAULT_COOLDOWNS = {
  feed: 30000,    // 30 seconds
  play: 45000,    // 45 seconds
  clean: 60000,   // 1 minute
  doctor: 120000, // 2 minutes
}

export function usePetInteractions(initialStats: Partial<PetStats> = {}) {
  const { isConnected, publicKey, walletData } = useWallet();
  
  // Initialize stats from wallet data if available
  const initialWalletStats = isConnected && walletData?.petStats 
    ? walletData.petStats 
    : initialStats;
  
  // Core stats
  const [food, setFood] = useState(initialWalletStats.food ?? 50)
  const [happiness, setHappiness] = useState(initialWalletStats.happiness ?? 40)
  const [cleanliness, setCleanliness] = useState(initialWalletStats.cleanliness ?? 40)
  const [energy, setEnergy] = useState(initialWalletStats.energy ?? 30)
  const [health, setHealth] = useState(initialWalletStats.health ?? 30)
  const [isDead, setIsDead] = useState(initialWalletStats.isDead ?? false)
  const [points, setPoints] = useState(initialWalletStats.points ?? 0)
  
  // Cooldown tracking
  const [cooldowns, setCooldowns] = useState<ActionCooldowns>({
    feed: 0,
    play: 0,
    clean: 0,
    doctor: 0
  })
  const [isOnCooldown, setIsOnCooldown] = useState<{[key: string]: boolean}>({
    feed: false,
    play: false,
    clean: false,
    doctor: false
  })
  
  // Interaction tracking
  const [lastInteractionTime, setLastInteractionTime] = useState(Date.now())
  const [showInteraction, setShowInteraction] = useState(false)
  const [currentInteraction, setCurrentInteraction] = useState<Interaction | null>(null)
  
  // Animation states
  const [isFeeding, setIsFeeding] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isCleaning, setIsCleaning] = useState(false)
  const [isHealing, setIsHealing] = useState(false)
  
  // Create refs to track current state values
  const foodRef = useRef(food)
  const happinessRef = useRef(happiness)
  const cleanlinessRef = useRef(cleanliness)
  const energyRef = useRef(energy)
  const healthRef = useRef(health)
  
  // Keep refs in sync with state
  useEffect(() => {
    foodRef.current = food
    happinessRef.current = happiness
    cleanlinessRef.current = cleanliness
    energyRef.current = energy
    healthRef.current = health
  }, [food, happiness, cleanliness, energy, health])
  
  // Point gain tracking
  const [recentPointGain, setRecentPointGain] = useState<PointGain | null>(null)
  
  // AI point system - determines current pet state and best actions
  const aiPointSystem = useCallback(() => {
    // Analyze current pet state
    const needsFood = food < 40
    const needsPlay = happiness < 40
    const needsCleaning = cleanliness < 40
    const needsRest = energy < 40
    const needsHealing = health < 50
    
    // Determine priority actions based on needs
    const priorities = [
      { action: 'feed', urgency: needsFood ? (40 - food) : 0 },
      { action: 'play', urgency: needsPlay ? (40 - happiness) : 0 },
      { action: 'clean', urgency: needsCleaning ? (40 - cleanliness) : 0 },
      { action: 'doctor', urgency: needsHealing ? (50 - health) : 0 }
    ].sort((a, b) => b.urgency - a.urgency)
    
    // Calculate point bonuses for balanced care
    const balanceScore = 100 - Math.abs(food - happiness) - Math.abs(happiness - cleanliness) - 
                         Math.abs(cleanliness - energy) - Math.abs(energy - health)
    
    // Calculate streak bonuses for consecutive appropriate actions
    const streakBonus = priorities[0].urgency > 20 ? 1.5 : 1 // 50% bonus for addressing urgent needs
    
    // Consistency check - regular care vs sporadic care
    const consistencyScore = Math.min(20, Math.floor((Date.now() - lastInteractionTime) / 3600000)) // Up to 20 points for hourly interaction
    
    // Return the combined point modifier 
    return Math.max(0.5, Math.min(3.0, (balanceScore / 100) * streakBonus * (1 - consistencyScore / 100)))
  }, [food, happiness, cleanliness, energy, health, lastInteractionTime])
  
  // Calculate health based on stats
  const updateHealth = useCallback(() => {
    let newHealth = (food * 0.4) + (happiness * 0.2) + (cleanliness * 0.2) + (energy * 0.2)
    
    // Apply penalty for overfeeding
    if (food > 100) {
      newHealth -= (food - 100) * 0.1
    }
    
    newHealth = Math.max(newHealth, 0)
    setHealth(newHealth)
    
    // Check for death condition
    if (newHealth === 0 || food === 0) {
      setIsDead(true)
    }
  }, [food, happiness, cleanliness, energy])
  
  // Update health whenever stats change
  useEffect(() => {
    updateHealth()
  }, [food, happiness, cleanliness, energy, updateHealth])
  
  // Update cooldowns
  useEffect(() => {
    const cooldownInterval = setInterval(() => {
      const currentTime = Date.now()
      
      setCooldowns((prev: ActionCooldowns) => ({
        feed: Math.max(0, prev.feed - 1000),
        play: Math.max(0, prev.play - 1000),
        clean: Math.max(0, prev.clean - 1000),
        doctor: Math.max(0, prev.doctor - 1000)
      }))
      
      setIsOnCooldown({
        feed: cooldowns.feed > 0,
        play: cooldowns.play > 0,
        clean: cooldowns.clean > 0,
        doctor: cooldowns.doctor > 0
      })
    }, 1000)
    
    return () => clearInterval(cooldownInterval)
  }, [cooldowns])
  
  // Add this helper function to award points
  const awardPoints = useCallback((amount: number) => {
    setPoints((prev: number) => prev + amount)
    setRecentPointGain({
      amount,
      timestamp: Date.now()
    })
    
    // Clear point gain notification after 2 seconds
    setTimeout(() => {
      setRecentPointGain(null)
    }, 2000)
  }, [])
  
  // Interaction tracking
  const addInteraction = useCallback(
    (type: "Feed" | "Play" | "Clean" | "Doctor", selectedItemIndex: number = 0) => {
      // Access state via refs
      const currentFood = foodRef.current
      const currentHappiness = happinessRef.current
      const currentCleanliness = cleanlinessRef.current
      const currentEnergy = energyRef.current
      const currentHealth = healthRef.current
      
      let emotion: "happy" | "sad" | "tired" | "hungry" | "curious" | "dead" = "curious"
      
      if (isDead) {
        emotion = "dead"
      } else if (currentFood < 30) {
        emotion = "hungry"
      } else if (currentHappiness < 30) {
        emotion = "sad"
      } else if (currentEnergy < 30) {
        emotion = "tired"
      } else if (currentHappiness > 70) {
        emotion = "happy"
      }
      
      let tweet = ""
      if (type === "Feed") {
        const foods = ["fish", "a cookie", "cat food", "kibble"]
        tweet = `My pet just ate ${foods[selectedItemIndex]}!`
      } else if (type === "Play") {
        const games = ["with a laser pointer", "with a feather toy", "with a ball", "with a puzzle toy"]
        tweet = `My pet just played ${games[selectedItemIndex]}!`
      } else if (type === "Clean") {
        const cleanings = ["brushed", "bathed", "got its nails trimmed", "styled", "got dental care"]
        tweet = `My pet just got ${cleanings[selectedItemIndex]}!`
      } else if (type === "Doctor") {
        const treatments = ["a check-up", "vitamins", "vaccinated", "surgery"]
        tweet = `My pet just got ${treatments[selectedItemIndex]}!`
      }
      
      const newInteraction: Interaction = {
        id: uuidv4(),
        timestamp: new Date(),
        type,
        stats: {
          food: currentFood,
          happiness: currentHappiness,
          cleanliness: currentCleanliness,
          energy: currentEnergy,
          health: currentHealth
        },
        emotion,
        blockchainStats: {},
        tweet,
        blockNumber: "",
        transactionUrl: ""
      }
      
      setCurrentInteraction(newInteraction)
      setShowInteraction(true)
      
      // Hide interaction after 3 seconds
      setTimeout(() => {
        setShowInteraction(false)
      }, 3000)
    },
    [isDead]
  )
  
  // Apply action cooldown
  const applyCooldown = useCallback((actionType: keyof ActionCooldowns) => {
    setCooldowns((prev: ActionCooldowns) => ({
      ...prev,
      [actionType]: DEFAULT_COOLDOWNS[actionType]
    }))
    
    setIsOnCooldown((prev: {[key: string]: boolean}) => ({
      ...prev,
      [actionType]: true
    }))
  }, [])
  
  // Apply stat changes
  const interact = useCallback((updates: PetStatsUpdate, actionType: keyof ActionCooldowns) => {
    if (isDead) return false
    if (isOnCooldown[actionType]) return false
    
    // Apply the updates with capping to prevent values over 100
    if (updates.food !== undefined) {
      setFood((prev: number) => Math.min(Math.max(prev + updates.food! * 0.3, 0), 100))
    }
    if (updates.happiness !== undefined) {
      setHappiness((prev: number) => capStat(prev + updates.happiness! * 0.3))
    }
    if (updates.cleanliness !== undefined) {
      setCleanliness((prev: number) => capStat(prev + updates.cleanliness! * 0.3))
    }
    if (updates.energy !== undefined) {
      setEnergy((prev: number) => capStat(prev + updates.energy! * 0.3))
    }
    if (updates.health !== undefined) {
      setHealth((prev: number) => capStat(prev + updates.health! * 0.3))
    }
    
    // Apply cooldown for this action
    applyCooldown(actionType)
    
    setLastInteractionTime(Date.now())
    return true
  }, [isDead, isOnCooldown, applyCooldown])
  
  // Update the handleFeeding function
  const handleFeeding = useCallback((foodType: string, selectedIndex: number) => {
    if (isOnCooldown.feed) return false
    
    setIsFeeding(true)
    
    setTimeout(() => {
      setIsFeeding(false)
      
      let success = false
      switch(foodType) {
        case "fish":
          success = interact({ food: 12, energy: 6 }, "feed")
          break
        case "cookie":
          success = interact({ food: 10, energy: 12, health: -0.45 }, "feed")
          break
        case "catFood":
          success = interact({ food: 25, energy: 16 }, "feed")
          break
        case "kibble":
          success = interact({ food: 30, energy: 20 }, "feed")
          break
      }
      
      if (success) {
        // Award bonus points based on AI system
        const pointMultiplier = aiPointSystem()
        const bonusPoints = Math.round(10 * pointMultiplier)
        awardPoints(bonusPoints)
        
        addInteraction("Feed", selectedIndex)
      }
    }, 1000)
    
    return true
  }, [interact, addInteraction, isOnCooldown, aiPointSystem, awardPoints])
  
  // Update the handlePlaying function
  const handlePlaying = useCallback((playType: string, selectedIndex: number) => {
    if (isOnCooldown.play) return false
    
    setIsPlaying(true)
    
    setTimeout(() => {
      setIsPlaying(false)
      
      let success = false
      switch(playType) {
        case "laser":
          success = interact({ happiness: 16, energy: -7, food: -2.5 }, "play")
          break
        case "feather":
          success = interact({ happiness: 15, energy: -5, food: -2 }, "play")
          break
        case "ball":
          success = interact({ happiness: 20, energy: -15, food: -3 }, "play")
          break
        case "puzzle":
          success = interact({ happiness: 25, energy: -5, food: -4 }, "play")
          break
      }
      
      if (success) {
        // Award bonus points based on AI system
        const pointMultiplier = aiPointSystem()
        const bonusPoints = Math.round(15 * pointMultiplier)
        awardPoints(bonusPoints)
        
        addInteraction("Play", selectedIndex)
      }
    }, 1000)
    
    return true
  }, [interact, addInteraction, isOnCooldown, aiPointSystem, awardPoints])
  
  // Update the handleCleaning function
  const handleCleaning = useCallback((cleanType: string, selectedIndex: number) => {
    if (isOnCooldown.clean) return false
    
    setIsCleaning(true)
    
    setTimeout(() => {
      setIsCleaning(false)
      
      let success = false
      switch(cleanType) {
        case "brush":
          success = interact({ cleanliness: 25, happiness: 10 }, "clean")
          break
        case "bath":
          success = interact({ cleanliness: 50 }, "clean")
          break
        case "nails":
          success = interact({ cleanliness: 10, happiness: -5 }, "clean")
          break
        case "styling":
          success = interact({ cleanliness: 15, happiness: 20 }, "clean")
          break
        case "dental":
          success = interact({ cleanliness: 15, health: 10 }, "clean")
          break
      }
      
      if (success) {
        // Award bonus points based on AI system
        const pointMultiplier = aiPointSystem()
        const bonusPoints = Math.round(12 * pointMultiplier)
        awardPoints(bonusPoints)
        
        addInteraction("Clean", selectedIndex)
      }
    }, 1000)
    
    return true
  }, [interact, addInteraction, isOnCooldown, aiPointSystem, awardPoints])
  
  // Update the handleDoctor function
  const handleDoctor = useCallback((treatmentType: string, selectedIndex: number) => {
    if (isOnCooldown.doctor) return false
    
    setIsHealing(true)
    
    setTimeout(() => {
      setIsHealing(false)
      
      let success = false
      switch(treatmentType) {
        case 'checkup':
          success = interact({ health: 10, happiness: -5 }, "doctor")
          break
        case 'vitamins':
          success = interact({ health: 20, happiness: -10 }, "doctor")
          break
        case 'vaccine':
          success = interact({ health: 15, energy: 10, happiness: -15 }, "doctor")
          break
        case 'surgery':
          success = interact({ health: 40, energy: -20, happiness: -20 }, "doctor")
          break
        default:
          success = interact({ health: 30, happiness: -10 }, "doctor")
      }
      
      if (success) {
        // Award bonus points based on AI system
        const pointMultiplier = aiPointSystem()
        const bonusPoints = Math.round(20 * pointMultiplier)
        awardPoints(bonusPoints)
        
        addInteraction("Doctor", selectedIndex)
      }
    }, 1000)
    
    return true
  }, [interact, addInteraction, isOnCooldown, aiPointSystem, awardPoints])
  
  // Update Stat decay over time to use awardPoints
  useEffect(() => {
    if (isDead) return
    
    const decayInterval = setInterval(() => {
      const timeElapsed = (Date.now() - lastInteractionTime) / (1000 * 60) // in minutes
      // Using accelerated decay for testing (32 points/hour = 0.53 points/minute)
      const decayRate = 0.53 * (timeElapsed / 60)
      
      setFood((prev: number) => Math.max(prev - decayRate, 0))
      setHappiness((prev: number) => Math.max(prev - decayRate, 0))
      setCleanliness((prev: number) => Math.max(prev - decayRate, 0))
      setEnergy((prev: number) => Math.max(prev - decayRate, 0))
      
      // Use AI system to award points based on pet state
      const pointMultiplier = aiPointSystem()
      const averageStats = (food + happiness + cleanliness + energy) / 4
      
      // Award points based on average health and AI multiplier
      let passivePoints = 0
      if (averageStats > 80) {
        passivePoints = Math.round((150/60) * pointMultiplier) // 150 points per hour with multiplier
      } else if (averageStats > 60) {
        passivePoints = Math.round((100/60) * pointMultiplier) // 100 points per hour with multiplier
      } else if (averageStats > 40) {
        passivePoints = Math.round((60/60) * pointMultiplier) // 60 points per hour with multiplier
      } else if (averageStats > 20) {
        passivePoints = Math.round((30/60) * pointMultiplier) // 30 points per hour with multiplier
      } else {
        passivePoints = Math.round((10/60) * pointMultiplier) // 10 points per hour with multiplier
      }
      
      if (passivePoints > 0) {
        awardPoints(passivePoints)
      }
    }, 60000) // Update every minute
    
    return () => clearInterval(decayInterval)
  }, [lastInteractionTime, isDead, food, happiness, cleanliness, energy, aiPointSystem, awardPoints])
  
  // Add a ref to track the last saved state to prevent infinite updates
  const lastSavedStatsRef = useRef({
    food: initialWalletStats.food ?? 50,
    happiness: initialWalletStats.happiness ?? 40,
    cleanliness: initialWalletStats.cleanliness ?? 40,
    energy: initialWalletStats.energy ?? 30,
    health: initialWalletStats.health ?? 30,
    isDead: initialWalletStats.isDead ?? false,
    points: initialWalletStats.points ?? 0,
  });

  // Save pet stats to wallet data whenever they change
  useEffect(() => {
    if (isConnected && publicKey) {
      const currentStats = {
        food,
        happiness,
        cleanliness,
        energy,
        health,
        isDead,
        points
      };
      
      // Update wallet data with current pet stats
      if (walletData) {
        // Only save if values have actually changed significantly to prevent infinite loops
        const lastSaved = lastSavedStatsRef.current;
        const hasSignificantChange = 
          Math.abs(lastSaved.food - food) > 1 || 
          Math.abs(lastSaved.happiness - happiness) > 1 ||
          Math.abs(lastSaved.cleanliness - cleanliness) > 1 ||
          Math.abs(lastSaved.energy - energy) > 1 ||
          Math.abs(lastSaved.health - health) > 1 ||
          lastSaved.isDead !== isDead ||
          Math.abs(lastSaved.points - points) > 5;
          
        if (hasSignificantChange) {
          const updatedWalletData = {
            ...walletData,
            petStats: currentStats
          };
          
          saveWalletData(publicKey, updatedWalletData);
          
          // Update the ref
          lastSavedStatsRef.current = currentStats;
        }
      }
    }
  }, [food, happiness, cleanliness, energy, health, isDead, points, isConnected, publicKey, walletData]);
  
  const resetPet = useCallback(() => {
    setFood(50)
    setHappiness(40)
    setCleanliness(40)
    setEnergy(30)
    setHealth(30)
    setIsDead(false)
    setPoints(0)
    setCooldowns({
      feed: 0,
      play: 0,
      clean: 0,
      doctor: 0
    })
    setIsOnCooldown({
      feed: false,
      play: false,
      clean: false,
      doctor: false
    })
  }, [])
  
  return {
    // Stats
    food,
    happiness,
    cleanliness, 
    energy,
    health,
    isDead,
    points,
    
    // Point gain
    recentPointGain,
    
    // Cooldowns
    cooldowns,
    isOnCooldown,
    
    // Animation states
    isFeeding,
    isPlaying,
    isCleaning,
    isHealing,
    
    // Interaction
    lastInteractionTime,
    setLastInteractionTime,
    showInteraction,
    currentInteraction,
    
    // Methods
    handleFeeding,
    handlePlaying,
    handleCleaning,
    handleDoctor,
    resetPet,
    
    // Update methods
    setFood,
    setHappiness,
    setCleanliness,
    setEnergy,
    setHealth,
  }
} 