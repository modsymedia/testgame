import { useState, useCallback, useRef, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import type { Interaction } from "@/types/interaction"
import { capStat } from "@/utils/stats-helpers"
import { useWallet } from "@/context/WalletContext"
import { saveWalletData } from "@/utils/wallet"
import { usePetAI } from "@/hooks/use-pet-ai"

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
  heal: number
}

export interface PointGain {
  amount: number
  timestamp: number
}

// Default cooldown times in milliseconds
const DEFAULT_COOLDOWNS = {
  feed: 10000,    // 10 seconds
  play: 15000,    // 15 seconds
  clean: 20000,   // 20 seconds
  heal: 30000,    // 30 seconds
}

// Time remaining strings for cooldown display
export interface CooldownTimers {
  feed: string;
  play: string;
  clean: string;
  heal: string;
}

export function usePetInteractions(initialStats: Partial<PetStats> = {}) {
  const { isConnected, publicKey, walletData } = useWallet();
  const petName = walletData?.petName || 'Pet';
  
  // Get AI-driven behavior
  const { 
    aiPersonality, 
    aiAdvice,
    aiPointMultiplier,
    decayRates,
    cooldowns: aiCooldowns,
    logActivity, 
    getPetMessageForInteraction,
    petMessage,
    petReaction
  } = usePetAI(petName, publicKey || '', initialStats);
  
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
    heal: 0
  })
  const [isOnCooldown, setIsOnCooldown] = useState<{[key: string]: boolean}>({
    feed: false,
    play: false,
    clean: false,
    heal: false
  })
  
  // Add cooldown timers for display
  const [cooldownTimers, setCooldownTimers] = useState<CooldownTimers>({
    feed: '',
    play: '',
    clean: '',
    heal: ''
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
  
  // Get AI point system - use the AI-recommended multiplier
  const aiPointSystem = useCallback(() => {
    // If AI multiplier exists, use it, otherwise use default (1.0)
    return aiPointMultiplier || 1.0;
  }, [aiPointMultiplier]);
  
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
  
  // Update cooldowns with countdown display
  useEffect(() => {
    const cooldownInterval = setInterval(() => {
      setCooldowns((prev: ActionCooldowns) => ({
        feed: Math.max(0, prev.feed - 1000),
        play: Math.max(0, prev.play - 1000),
        clean: Math.max(0, prev.clean - 1000),
        heal: Math.max(0, prev.heal - 1000)
      }))
      
      // Update visual cooldown timers
      setCooldownTimers({
        feed: formatCooldownTime(cooldowns.feed),
        play: formatCooldownTime(cooldowns.play),
        clean: formatCooldownTime(cooldowns.clean),
        heal: formatCooldownTime(cooldowns.heal)
      })
      
      setIsOnCooldown({
        feed: cooldowns.feed > 0,
        play: cooldowns.play > 0,
        clean: cooldowns.clean > 0,
        heal: cooldowns.heal > 0
      })
    }, 1000)
    
    return () => clearInterval(cooldownInterval)
  }, [cooldowns])
  
  // Format cooldown time for display (e.g., "0:30")
  const formatCooldownTime = useCallback((milliseconds: number): string => {
    if (milliseconds <= 0) return '';
    const seconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);
  
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
  
  // Apply decay rates from AI or use defaults
  useEffect(() => {
    if (isDead) return;
    
    const decayInterval = setInterval(() => {
      const timeElapsed = (Date.now() - lastInteractionTime) / (1000 * 60); // in minutes
      
      // Use AI decay rates if available, or default rates
      const aiDecayRates = decayRates || {
        food: 0.5,
        happiness: 0.4,
        cleanliness: 0.3,
        energy: 0.4,
        health: 0.2
      };
      
      // Apply decay based on AI-driven rates or defaults
      const foodDecay = aiDecayRates.food * (timeElapsed / 60);
      const happinessDecay = aiDecayRates.happiness * (timeElapsed / 60);
      const cleanlinessDecay = aiDecayRates.cleanliness * (timeElapsed / 60);
      const energyDecay = aiDecayRates.energy * (timeElapsed / 60);
      
      setFood((prev: number) => Math.max(prev - foodDecay, 0));
      setHappiness((prev: number) => Math.max(prev - happinessDecay, 0));
      setCleanliness((prev: number) => Math.max(prev - cleanlinessDecay, 0));
      setEnergy((prev: number) => Math.max(prev - energyDecay, 0));
      
      // Use GOCHI technical specification for point calculation
      // -------------------------------------------------------
      // BaseRate = 10 points per hour
      // QualityMultiplier = 0.5 (poor) to 3.0 (excellent) based on pet state
      // StreakMultiplier = 1.0 + (ConsecutiveDays × 0.05), capped at 1.5
      // Hourly Points = BaseRate × QualityMultiplier × StreakMultiplier
      
      // Calculate pet state quality (the higher the better)
      const petState = {
        health: health,
        happiness: happiness,
        hunger: food,  // In our system, food = hunger
        cleanliness: cleanliness
      };
      
      // Get consecutive days from wallet data or default to 0
      const consecutiveDays = walletData?.daysActive || 0;
      
      // Calculate the base hourly points using the GOCHI formula
      const BASE_RATE = 10; // 10 points per hour as specified in the doc
      
      // Calculate the quality multiplier (0.5 to 3.0)
      const avgState = (health + happiness + food + cleanliness) / 4;
      const qualityMultiplier = Math.max(0.5, Math.min(3.0, avgState / 33.33));
      
      // Calculate streak multiplier (1.0 to 1.5)
      const streakMultiplier = Math.min(1.5, 1.0 + (consecutiveDays * 0.05));
      
      // Calculate hourly points
      const hourlyPoints = BASE_RATE * qualityMultiplier * streakMultiplier;
      
      // Convert to per-minute points for this interval (divide by 60)
      const passivePoints = Math.round((hourlyPoints / 60) * (timeElapsed || 1));
      
      // Apply the AI point multiplier if available
      const pointMultiplier = aiPointSystem();
      const totalPassivePoints = Math.round(passivePoints * pointMultiplier);
      
      // Daily points cap based on days active
      const dailyPointsCap = Math.min(500, 200 + (consecutiveDays * 20));
      
      // Check if we've exceeded the daily cap (this would need proper tracking in a real implementation)
      const todayPoints = (walletData?.dailyPoints || 0) + totalPassivePoints;
      const cappedPoints = Math.min(todayPoints, dailyPointsCap) - (walletData?.dailyPoints || 0);
      
      if (cappedPoints > 0) {
        awardPoints(cappedPoints);
        
        // Log this activity using an existing activity type
        if (cappedPoints > 10) {
          // If significant points earned, log it as one of the valid activities
          logActivity('feed');
        }
      }
    }, 60000); // Run every minute
    
    return () => clearInterval(decayInterval);
  }, [lastInteractionTime, isDead, food, happiness, cleanliness, energy, aiPointSystem, awardPoints, decayRates, health, walletData, logActivity]);
  
  // Apply cooldowns from AI
  const applyCooldown = useCallback((actionType: keyof ActionCooldowns) => {
    // Use AI-driven cooldowns if available, otherwise use defaults
    let cooldownTime = DEFAULT_COOLDOWNS[actionType]; // Default in milliseconds
    
    if (aiCooldowns && aiCooldowns[actionType]) {
      // Convert from seconds (API) to milliseconds (internal)
      cooldownTime = aiCooldowns[actionType] * 1000;
      
      // Debug the API cooldown value
      console.log(`API cooldown for ${actionType}: ${aiCooldowns[actionType]} seconds`);
    }
    
    // Set to nearest second to avoid odd display
    cooldownTime = Math.ceil(cooldownTime / 1000) * 1000;
    
    // Enforce minimum and maximum cooldown time
    const minimumCooldown = 5000; // 5 seconds minimum
    const maximumCooldown = 30000; // 30 seconds maximum
    
    cooldownTime = Math.max(Math.min(cooldownTime, maximumCooldown), minimumCooldown);
    
    console.log(`Setting ${actionType} cooldown to ${cooldownTime / 1000} seconds`);
    
    setCooldowns((prev: ActionCooldowns) => ({
      ...prev,
      [actionType]: cooldownTime
    }));
    
    setIsOnCooldown((prev: {[key: string]: boolean}) => ({
      ...prev,
      [actionType]: true
    }));
    
    // Update timer display immediately
    setCooldownTimers((prev: CooldownTimers) => ({
      ...prev,
      [actionType]: formatCooldownTime(cooldownTime)
    }));
  }, [aiCooldowns, formatCooldownTime]);
  
  // Add the missing interact function
  const interact = useCallback((
    statsChange: PetStatsUpdate,
    interactionType: keyof ActionCooldowns
  ): boolean => {
    // Apply cooldown for the interaction type
    applyCooldown(interactionType);
    
    // Update the last interaction time
    setLastInteractionTime(Date.now());
    
    // Apply stat changes with capping
    if (statsChange.food !== undefined) {
      setFood((prev: number) => capStat(prev + statsChange.food!));
    }
    if (statsChange.happiness !== undefined) {
      setHappiness((prev: number) => capStat(prev + statsChange.happiness!));
    }
    if (statsChange.cleanliness !== undefined) {
      setCleanliness((prev: number) => capStat(prev + statsChange.cleanliness!));
    }
    if (statsChange.energy !== undefined) {
      setEnergy((prev: number) => capStat(prev + statsChange.energy!));
    }
    if (statsChange.health !== undefined) {
      setHealth((prev: number) => capStat(prev + statsChange.health!));
    }
    
    return true;
  }, [applyCooldown, setLastInteractionTime]);
  
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
        blockNumber: "0",
        transactionUrl: "",
        tweet,
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

  // Create a ref for debouncing
  const saveDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const SAVE_DEBOUNCE_DELAY = 5000; // 5 seconds
  
  // Add a ref to track the last actual save time to enforce minimum time between saves
  const lastSaveTimeRef = useRef<number>(Date.now());
  const MIN_SAVE_INTERVAL = 30000; // Increased to 30 seconds to be more conservative

  // Save pet stats to wallet data whenever they change, with debouncing
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
        // Clear any existing timer
        if (saveDebounceTimerRef.current) {
          clearTimeout(saveDebounceTimerRef.current);
        }
        
        // Set a new timer to debounce the save
        saveDebounceTimerRef.current = setTimeout(() => {
          // Check if enough time has elapsed since the last save
          const now = Date.now();
          const timeElapsedSinceLastSave = now - lastSaveTimeRef.current;
          
          if (timeElapsedSinceLastSave >= MIN_SAVE_INTERVAL && walletData) {
            const updatedWalletData = {
              ...walletData,
              petStats: currentStats
            };
            
            console.log(`Debounced save after ${timeElapsedSinceLastSave}ms: Saving wallet data`);
            saveWalletData(publicKey, updatedWalletData);
            
            // Update refs
            lastSavedStatsRef.current = { ...currentStats };
            lastSaveTimeRef.current = now;
          } else {
            console.log(`Skipped save - too soon (${timeElapsedSinceLastSave}ms < ${MIN_SAVE_INTERVAL}ms)`);
          }
          
          saveDebounceTimerRef.current = null;
        }, SAVE_DEBOUNCE_DELAY);
      }
    }
    
    // Clean up the timer when the component unmounts
    return () => {
      if (saveDebounceTimerRef.current) {
        clearTimeout(saveDebounceTimerRef.current);
      }
    };
  }, [food, happiness, cleanliness, energy, health, isDead, points, isConnected, publicKey, walletData]);
  
  // Check for idle pet message
  useEffect(() => {
    // Show an idle message if no interaction for 2 minutes
    const idleCheckInterval = setInterval(async () => {
      const timeSinceLastInteraction = Date.now() - lastInteractionTime;
      
      // Show idle message after 2 minutes of no interaction
      if (timeSinceLastInteraction > 2 * 60 * 1000 && !isDead && !petMessage) {
        await getPetMessageForInteraction('idle', {
          food: foodRef.current,
          happiness: happinessRef.current,
          cleanliness: cleanlinessRef.current,
          energy: energyRef.current,
          health: healthRef.current
        });
      }
    }, 2 * 60 * 1000); // Check every 2 minutes
    
    return () => clearInterval(idleCheckInterval);
  }, [lastInteractionTime, isDead, getPetMessageForInteraction, petMessage]);
  
  // Reset the pet
  const resetPet = useCallback(() => {
    setFood(50);
    setHappiness(40);
    setCleanliness(40);
    setEnergy(30);
    setHealth(30);
    setIsDead(false);
    setPoints(0);
    
    // Reset cooldowns
    setCooldowns({
      feed: 0,
      play: 0,
      clean: 0,
      heal: 0
    });
    
    // NOTE: We don't directly call saveWalletData here
    // State changes will trigger the debounced save useEffect
    
    // Reset last interaction time
    setLastInteractionTime(Date.now());
    
    // Give feedback to user
    addInteraction("Doctor", 0);
  }, [
    setFood, 
    setHappiness, 
    setCleanliness, 
    setEnergy, 
    setHealth, 
    setIsDead, 
    setPoints, 
    setCooldowns, 
    addInteraction,
    setLastInteractionTime
  ]);
  
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

  // Remove the direct saveWalletData call from handleFeeding
  const handleFeeding = useCallback(async () => {
    if (isDead || isOnCooldown.feed) return false
    
    // Log the feeding activity for AI analysis
    logActivity('feed')
    
    // Apply the interaction
    const success = interact({ 
      food: 30, 
      happiness: 10,
    }, 'feed')
    
    if (success) {
      setIsFeeding(true)
      setCurrentInteraction({
        id: uuidv4(),
        type: "Feed",
        timestamp: new Date(),
        stats: {
          food: foodRef.current,
          happiness: happinessRef.current,
          cleanliness: cleanlinessRef.current,
          energy: energyRef.current,
          health: healthRef.current
        },
        emotion: "happy",
        blockchainStats: {},
        blockNumber: "0",
        transactionUrl: "",
        tweet: "My pet just had some food!"
      })
      setShowInteraction(true)
      
      setTimeout(() => {
        setIsFeeding(false)
      }, 2000)
      
      setTimeout(() => {
        setShowInteraction(false)
      }, 1500)
      
      // Get message from the pet's perspective
      const petResponse = await getPetMessageForInteraction('feed', {
        food: foodRef.current,
        happiness: happinessRef.current,
        cleanliness: cleanlinessRef.current,
        energy: energyRef.current,
        health: healthRef.current
      })
      
      // Apply any stat updates from AI
      if (petResponse?.updatedStats) {
        if (petResponse.updatedStats.food !== undefined) {
          setFood(Math.max(0, Math.min(100, petResponse.updatedStats.food)));
        }
        if (petResponse.updatedStats.happiness !== undefined) {
          setHappiness(Math.max(0, Math.min(100, petResponse.updatedStats.happiness)));
        }
        if (petResponse.updatedStats.cleanliness !== undefined) {
          setCleanliness(Math.max(0, Math.min(100, petResponse.updatedStats.cleanliness)));
        }
        if (petResponse.updatedStats.energy !== undefined) {
          setEnergy(Math.max(0, Math.min(100, petResponse.updatedStats.energy)));
        }
        if (petResponse.updatedStats.health !== undefined) {
          setHealth(Math.max(0, Math.min(100, petResponse.updatedStats.health)));
        }
      }
      
      // Award points based on AI system and any bonus from AI
      const pointMultiplier = aiPointSystem()
      const basePoints = 50; // Base points for feeding
      const aiBonus = petResponse?.reward || 0; // Additional points from AI
      
      // Apply the GOCHI point calculation formula
      // Quality multiplier based on pet state after feeding
      const petStateAfterFeeding = {
            health: healthRef.current,
        happiness: happinessRef.current,
        hunger: foodRef.current,  // In our system, food = hunger
        cleanliness: cleanlinessRef.current
      };
      
      // Get quality multiplier (0.5 to 3.0)
      const avgState = (petStateAfterFeeding.health + 
                        petStateAfterFeeding.happiness + 
                        petStateAfterFeeding.hunger + 
                        petStateAfterFeeding.cleanliness) / 4;
      const qualityMultiplier = Math.max(0.5, Math.min(3.0, avgState / 33.33));
      
      // Get consecutive days from wallet data or default to 0
      const consecutiveDays = walletData?.daysActive || 0;
      
      // Get streak multiplier (1.0 to 1.5)
      const streakMultiplier = Math.min(1.5, 1.0 + (consecutiveDays * 0.05));
      
      // Calculate interaction points with quality and streak bonuses
      const interactionPoints = basePoints * qualityMultiplier * streakMultiplier;
      
      // Apply AI multiplier and any AI bonus
      const totalPoints = Math.round((interactionPoints + aiBonus) * pointMultiplier);
      
      // Apply daily points cap
      const dailyPointsCap = Math.min(500, 200 + (consecutiveDays * 20));
      const todayPoints = (walletData?.dailyPoints || 0) + totalPoints;
      const cappedPoints = Math.min(todayPoints, dailyPointsCap) - (walletData?.dailyPoints || 0);
      
      // Award capped points
      if (cappedPoints > 0) {
        awardPoints(cappedPoints);
      }
      
      // NOTE: We no longer call saveWalletData directly here
      // State changes will trigger the debounced save useEffect
    }
    
    return success
  }, [
    isDead, 
    isOnCooldown.feed, 
    interact, 
    setIsFeeding, 
    setCurrentInteraction, 
    setShowInteraction, 
    logActivity, 
    walletData,
    aiPointSystem,
    awardPoints,
    getPetMessageForInteraction,
    setFood,
    setHappiness,
    setCleanliness,
    setEnergy,
    setHealth
  ])
  
  // Remove the direct saveWalletData call from handlePlaying
  const handlePlaying = useCallback(async () => {
    if (isDead || isOnCooldown.play) return false
    
    // Log the playing activity for AI analysis
    logActivity('play')
    
    // Apply the interaction
    const success = interact({
      happiness: 35,
      energy: -20,
    }, 'play')
    
    if (success) {
      setIsPlaying(true)
      setCurrentInteraction({
        id: uuidv4(),
        type: "Play",
        timestamp: new Date(),
        stats: {
          food: foodRef.current,
          happiness: happinessRef.current,
          cleanliness: cleanlinessRef.current,
          energy: energyRef.current,
          health: healthRef.current
        },
        emotion: "happy",
        blockchainStats: {},
        blockNumber: "0",
        transactionUrl: "",
        tweet: "My pet just played a fun game!"
      })
      setShowInteraction(true)
      
      setTimeout(() => {
        setIsPlaying(false)
      }, 2000)
      
      setTimeout(() => {
        setShowInteraction(false)
      }, 1500)
      
      // Get message from the pet's perspective
      const petResponse = await getPetMessageForInteraction('play', {
        food: foodRef.current,
        happiness: happinessRef.current,
        cleanliness: cleanlinessRef.current,
        energy: energyRef.current,
        health: healthRef.current
      })
      
      // Apply any stat updates from AI
      if (petResponse?.updatedStats) {
        if (petResponse.updatedStats.food !== undefined) {
          setFood(Math.max(0, Math.min(100, petResponse.updatedStats.food)));
        }
        if (petResponse.updatedStats.happiness !== undefined) {
          setHappiness(Math.max(0, Math.min(100, petResponse.updatedStats.happiness)));
        }
        if (petResponse.updatedStats.cleanliness !== undefined) {
          setCleanliness(Math.max(0, Math.min(100, petResponse.updatedStats.cleanliness)));
        }
        if (petResponse.updatedStats.energy !== undefined) {
          setEnergy(Math.max(0, Math.min(100, petResponse.updatedStats.energy)));
        }
        if (petResponse.updatedStats.health !== undefined) {
          setHealth(Math.max(0, Math.min(100, petResponse.updatedStats.health)));
        }
      }
      
      // Award points based on AI system and any bonus from AI
      const pointMultiplier = aiPointSystem()
      const basePoints = 60; // Base points for playing
      const aiBonus = petResponse?.reward || 0; // Additional points from AI
      
      // Apply the GOCHI point calculation formula
      // Quality multiplier based on pet state after playing
      const petStateAfterPlaying = {
            health: healthRef.current,
        happiness: happinessRef.current,
        hunger: foodRef.current,  // In our system, food = hunger
        cleanliness: cleanlinessRef.current
      };
      
      // Get quality multiplier (0.5 to 3.0)
      const avgState = (petStateAfterPlaying.health + 
                        petStateAfterPlaying.happiness + 
                        petStateAfterPlaying.hunger + 
                        petStateAfterPlaying.cleanliness) / 4;
      const qualityMultiplier = Math.max(0.5, Math.min(3.0, avgState / 33.33));
      
      // Get consecutive days from wallet data or default to 0
      const consecutiveDays = walletData?.daysActive || 0;
      
      // Get streak multiplier (1.0 to 1.5)
      const streakMultiplier = Math.min(1.5, 1.0 + (consecutiveDays * 0.05));
      
      // Calculate interaction points with quality and streak bonuses
      const interactionPoints = basePoints * qualityMultiplier * streakMultiplier;
      
      // Apply AI multiplier and any AI bonus
      const totalPoints = Math.round((interactionPoints + aiBonus) * pointMultiplier);
      
      // Apply daily points cap
      const dailyPointsCap = Math.min(500, 200 + (consecutiveDays * 20));
      const todayPoints = (walletData?.dailyPoints || 0) + totalPoints;
      const cappedPoints = Math.min(todayPoints, dailyPointsCap) - (walletData?.dailyPoints || 0);
      
      // Award capped points
      if (cappedPoints > 0) {
        awardPoints(cappedPoints);
      }
      
      // NOTE: We no longer call saveWalletData directly here
      // State changes will trigger the debounced save useEffect
    }
    
    return success
  }, [
    isDead, 
    isOnCooldown.play, 
    interact, 
    setIsPlaying, 
    setCurrentInteraction, 
    setShowInteraction, 
    logActivity, 
    walletData,
    aiPointSystem,
    awardPoints,
    getPetMessageForInteraction,
    setFood,
    setHappiness,
    setCleanliness,
    setEnergy,
    setHealth
  ])
  
  // Remove the direct saveWalletData call from handleCleaning
  const handleCleaning = useCallback(async () => {
    if (isDead || isOnCooldown.clean) return false
    
    // Log the cleaning activity for AI analysis
    logActivity('clean')
    
    // Apply the interaction
    const success = interact({
      cleanliness: 40,
      happiness: 5,
    }, 'clean')
    
    if (success) {
      setIsCleaning(true)
      setCurrentInteraction({
        id: uuidv4(),
        type: "Clean",
        timestamp: new Date(),
        stats: {
          food: foodRef.current,
          happiness: happinessRef.current,
          cleanliness: cleanlinessRef.current,
          energy: energyRef.current,
          health: healthRef.current
        },
        emotion: "happy",
        blockchainStats: {},
        blockNumber: "0",
        transactionUrl: "",
        tweet: "My pet just got cleaned up!"
      })
      setShowInteraction(true)
      
      setTimeout(() => {
        setIsCleaning(false)
      }, 2000)
      
      setTimeout(() => {
        setShowInteraction(false)
      }, 1500)
      
      // Get message from the pet's perspective
      const petResponse = await getPetMessageForInteraction('clean', {
        food: foodRef.current,
        happiness: happinessRef.current,
        cleanliness: cleanlinessRef.current,
        energy: energyRef.current,
        health: healthRef.current
      })
      
      // Apply any stat updates from AI
      if (petResponse?.updatedStats) {
        if (petResponse.updatedStats.food !== undefined) {
          setFood(Math.max(0, Math.min(100, petResponse.updatedStats.food)));
        }
        if (petResponse.updatedStats.happiness !== undefined) {
          setHappiness(Math.max(0, Math.min(100, petResponse.updatedStats.happiness)));
        }
        if (petResponse.updatedStats.cleanliness !== undefined) {
          setCleanliness(Math.max(0, Math.min(100, petResponse.updatedStats.cleanliness)));
        }
        if (petResponse.updatedStats.energy !== undefined) {
          setEnergy(Math.max(0, Math.min(100, petResponse.updatedStats.energy)));
        }
        if (petResponse.updatedStats.health !== undefined) {
          setHealth(Math.max(0, Math.min(100, petResponse.updatedStats.health)));
        }
      }
      
      // Award points based on AI system and any bonus from AI
      const pointMultiplier = aiPointSystem()
      const basePoints = 40; // Base points for cleaning
      const aiBonus = petResponse?.reward || 0; // Additional points from AI
      
      // Apply the GOCHI point calculation formula
      // Quality multiplier based on pet state after cleaning
      const petStateAfterCleaning = {
            health: healthRef.current,
        happiness: happinessRef.current,
        hunger: foodRef.current,  // In our system, food = hunger
        cleanliness: cleanlinessRef.current
      };
      
      // Get quality multiplier (0.5 to 3.0)
      const avgState = (petStateAfterCleaning.health + 
                        petStateAfterCleaning.happiness + 
                        petStateAfterCleaning.hunger + 
                        petStateAfterCleaning.cleanliness) / 4;
      const qualityMultiplier = Math.max(0.5, Math.min(3.0, avgState / 33.33));
      
      // Get consecutive days from wallet data or default to 0
      const consecutiveDays = walletData?.daysActive || 0;
      
      // Get streak multiplier (1.0 to 1.5)
      const streakMultiplier = Math.min(1.5, 1.0 + (consecutiveDays * 0.05));
      
      // Calculate interaction points with quality and streak bonuses
      const interactionPoints = basePoints * qualityMultiplier * streakMultiplier;
      
      // Apply AI multiplier and any AI bonus
      const totalPoints = Math.round((interactionPoints + aiBonus) * pointMultiplier);
      
      // Apply daily points cap
      const dailyPointsCap = Math.min(500, 200 + (consecutiveDays * 20));
      const todayPoints = (walletData?.dailyPoints || 0) + totalPoints;
      const cappedPoints = Math.min(todayPoints, dailyPointsCap) - (walletData?.dailyPoints || 0);
      
      // Award capped points
      if (cappedPoints > 0) {
        awardPoints(cappedPoints);
      }
      
      // NOTE: We no longer call saveWalletData directly here
      // State changes will trigger the debounced save useEffect
    }
    
    return success
  }, [
    isDead, 
    isOnCooldown.clean, 
    interact, 
    setIsCleaning, 
    setCurrentInteraction, 
    setShowInteraction, 
    logActivity,
    walletData,
    aiPointSystem,
    awardPoints,
    getPetMessageForInteraction,
    setFood,
    setHappiness,
    setCleanliness,
    setEnergy,
    setHealth
  ])
  
  // Remove the direct saveWalletData call from handleDoctor
  const handleDoctor = useCallback(async () => {
    if (isDead || isOnCooldown.heal) return false
    
    // Log the healing activity for AI analysis
    logActivity('heal')
    
    // Apply the interaction
    const success = interact({
      health: 50,
      energy: 20,
      happiness: -5,
    }, 'heal')
    
    if (success) {
      setIsHealing(true)
      setCurrentInteraction({
        id: uuidv4(),
        type: "Doctor",
        timestamp: new Date(),
        stats: {
          food: foodRef.current,
          happiness: happinessRef.current,
          cleanliness: cleanlinessRef.current,
          energy: energyRef.current,
          health: healthRef.current
        },
        emotion: "happy",
        blockchainStats: {},
        blockNumber: "0",
        transactionUrl: "",
        tweet: "My pet just got a health checkup!"
      })
      setShowInteraction(true)
      
      setTimeout(() => {
        setIsHealing(false)
      }, 2000)
      
      setTimeout(() => {
        setShowInteraction(false)
      }, 1500)
      
      // Get message from the pet's perspective
      const petResponse = await getPetMessageForInteraction('heal', {
        food: foodRef.current,
        happiness: happinessRef.current,
        cleanliness: cleanlinessRef.current,
        energy: energyRef.current,
        health: healthRef.current
      })
      
      // Apply any stat updates from AI
      if (petResponse?.updatedStats) {
        if (petResponse.updatedStats.food !== undefined) {
          setFood(Math.max(0, Math.min(100, petResponse.updatedStats.food)));
        }
        if (petResponse.updatedStats.happiness !== undefined) {
          setHappiness(Math.max(0, Math.min(100, petResponse.updatedStats.happiness)));
        }
        if (petResponse.updatedStats.cleanliness !== undefined) {
          setCleanliness(Math.max(0, Math.min(100, petResponse.updatedStats.cleanliness)));
        }
        if (petResponse.updatedStats.energy !== undefined) {
          setEnergy(Math.max(0, Math.min(100, petResponse.updatedStats.energy)));
        }
        if (petResponse.updatedStats.health !== undefined) {
          setHealth(Math.max(0, Math.min(100, petResponse.updatedStats.health)));
        }
      }
      
      // Award points based on AI system and any bonus from AI
      const pointMultiplier = aiPointSystem()
      const basePoints = 70; // Base points for doctor visit
      const aiBonus = petResponse?.reward || 0; // Additional points from AI
      
      // Apply the GOCHI point calculation formula
      // Quality multiplier based on pet state after doctor visit
      const petStateAfterHealing = {
            health: healthRef.current,
        happiness: happinessRef.current,
        hunger: foodRef.current,  // In our system, food = hunger
        cleanliness: cleanlinessRef.current
      };
      
      // Get quality multiplier (0.5 to 3.0)
      const avgState = (petStateAfterHealing.health + 
                        petStateAfterHealing.happiness + 
                        petStateAfterHealing.hunger + 
                        petStateAfterHealing.cleanliness) / 4;
      const qualityMultiplier = Math.max(0.5, Math.min(3.0, avgState / 33.33));
      
      // Get consecutive days from wallet data or default to 0
      const consecutiveDays = walletData?.daysActive || 0;
      
      // Get streak multiplier (1.0 to 1.5)
      const streakMultiplier = Math.min(1.5, 1.0 + (consecutiveDays * 0.05));
      
      // Calculate interaction points with quality and streak bonuses
      const interactionPoints = basePoints * qualityMultiplier * streakMultiplier;
      
      // Apply AI multiplier and any AI bonus
      const totalPoints = Math.round((interactionPoints + aiBonus) * pointMultiplier);
      
      // Apply daily points cap
      const dailyPointsCap = Math.min(500, 200 + (consecutiveDays * 20));
      const todayPoints = (walletData?.dailyPoints || 0) + totalPoints;
      const cappedPoints = Math.min(todayPoints, dailyPointsCap) - (walletData?.dailyPoints || 0);
      
      // Award capped points
      if (cappedPoints > 0) {
        awardPoints(cappedPoints);
      }
      
      // NOTE: We no longer call saveWalletData directly here
      // State changes will trigger the debounced save useEffect
    }
    
    return success
  }, [
    isDead, 
    isOnCooldown.heal, 
    interact, 
    setIsHealing, 
    setCurrentInteraction, 
    setShowInteraction, 
    logActivity,
    walletData,
    aiPointSystem,
    awardPoints,
    getPetMessageForInteraction,
    setFood,
    setHappiness,
    setCleanliness,
    setEnergy,
    setHealth
  ])
  
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
    cooldownTimers,
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
    
    // AI-related return values
    aiAdvice,
    aiPersonality,
    aiPointMultiplier: aiPointSystem(),
    
    // Pet message and reaction
    petMessage,
    petReaction,
  }
} 