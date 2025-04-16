"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useUserData } from '@/context/UserDataContext';
import { 
  getPetBehavior, 
  PetState, 
  DEFAULT_BEHAVIOR,
  PetMessage
} from '@/utils/openai-service';
import { 
  logUserActivity, 
  UserActivityType
} from '@/utils/user-behavior-tracker';

/**
 * Custom hook to integrate AI-driven pet behavior
 */
export const usePetAI = (petName: string, walletId: string, initialStats: any) => {
  const { isConnected } = useWallet();
  const { userData } = useUserData();
  const [isLoading, setIsLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string>(DEFAULT_BEHAVIOR.advice);
  const [aiPersonality, setAiPersonality] = useState<string[]>(DEFAULT_BEHAVIOR.personality);
  const [aiPointMultiplier, setAiPointMultiplier] = useState<number>(DEFAULT_BEHAVIOR.pointMultiplier);
  const [decayRates, setDecayRates] = useState(DEFAULT_BEHAVIOR.decayRates);
  const [cooldowns, setCooldowns] = useState(DEFAULT_BEHAVIOR.cooldowns);
  const [moodDescription, setMoodDescription] = useState(DEFAULT_BEHAVIOR.moodDescription);
  const [petMessage, setPetMessage] = useState<string | null>(null);
  const [petReaction, setPetReaction] = useState<string>("none");

  // Track login time 
  const loginTimeRef = useRef<number | null>(null);
  
  // Store current stats as ref to avoid unnecessary re-renders
  const currentStatsRef = useRef(initialStats);

  // When connected, log login activity
  useEffect(() => {
    if (isConnected && petName && walletId) {
      loginTimeRef.current = Date.now();
      // Log login activity asynchronously
      const logLogin = async () => {
        // Get UID from UserDataContext
        const currentUid = userData?.uid;
        const petName = userData?.username || 'User'; // Or however pet name is determined
        
        if (currentUid) {
          // Call logUserActivity with UID
          await logUserActivity(currentUid, 'login', `${petName} logged in`);
        } else {
          console.warn('usePetAI: Cannot log login activity, UID not available.');
        }
      };
      logLogin();
    } else if (!isConnected && loginTimeRef.current) {
      // Log logout with duration asynchronously
      const duration = getSessionDuration();
      const logLogout = async () => {
        await logUserActivity(walletId, petName, 'logout', duration);
      };
      logLogout();
      loginTimeRef.current = null;
    }
  }, [isConnected, petName, walletId, userData?.uid]);

  // Update AI with current stats
  useEffect(() => {
    if (initialStats) {
      currentStatsRef.current = initialStats;
    }
  }, [initialStats]);

  // Periodic AI behavior updates (every 15 minutes)
  useEffect(() => {
    if (!isConnected || !petName || !walletId) return;
    
    const interval = setInterval(() => {
      getAIBehavior();
    }, 15 * 60 * 1000); // 15 minutes
    
    return () => clearInterval(interval);
  }, [isConnected, petName, walletId]);

  /**
   * Get AI behavior from the server API
   */
  const getAIBehavior = useCallback(async (forceUpdate = false) => {
    if (!isConnected && !forceUpdate) return;
    if (!petName || !walletId) return;
    
    setIsLoading(true);
    try {
      // Prepare current pet state
      const currentPetState: PetState = {
        health: initialStats.health || 100,
        happiness: initialStats.happiness || 100,
        hunger: initialStats.hunger || 100,
        cleanliness: initialStats.cleanliness || 100,
        energy: initialStats.energy || 100
      };
      
      // Use our updated function with fallback support
      const aiResponse = await getPetBehavior(
        petName,
        walletId,
        currentPetState,
        "idle"
      );
      
      // Update state with AI data
      if (aiResponse) {
        setDecayRates(aiResponse.decayRates);
        setCooldowns(aiResponse.cooldowns);
        setAiPersonality(Array.isArray(aiResponse.personality) 
          ? aiResponse.personality 
          : [aiResponse.personality.name, aiResponse.personality.description]
        );
        setAiAdvice(aiResponse.advice);
        setAiPointMultiplier(aiResponse.pointMultiplier);
        
        // Only set mood description if it exists
        const moodDesc = (aiResponse as any).moodDescription;
        if (moodDesc) {
          setMoodDescription(moodDesc);
        }
        
        if (aiResponse.isOfflineMode) {
          console.log('Using offline pet AI mode');
        }
      }
    } catch (error) {
      console.error("Failed to get AI behavior:", error);
      // We still have fallback in getPetBehavior so this should rarely happen
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, petName, walletId, initialStats, userData?.uid]);

  /**
   * Get a message from the pet's perspective based on the interaction
   */
  const getPetMessageForInteraction = useCallback(async (
    interactionType: "feed" | "play" | "clean" | "heal" | "idle",
    currentStats: {
      food: number;
      happiness: number;
      cleanliness: number;
      energy: number;
      health: number;
    }
  ): Promise<PetMessage | null> => {
    if (!petName) return null;
    
    setIsLoading(true);
    try {
      // Map stats to PetState
      const petState: PetState = {
        health: currentStats.health,
        happiness: currentStats.happiness,
        hunger: currentStats.food,
        cleanliness: currentStats.cleanliness,
        energy: currentStats.energy
      };
      
      // Use our updated function with fallback support
      const response = await getPetBehavior(
        petName,
        walletId || 'offline-user',
        petState,
        interactionType
      );
      
      // Process response
      setPetMessage(response.message);
      setPetReaction(response.reaction);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setPetMessage(null);
        setPetReaction("none");
      }, 5000);
      
      return {
        message: response.message,
        reaction: response.reaction,
        reward: response.reward || 0
      };
    } catch (error) {
      console.error("Error getting pet message:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [petName, walletId]);

  /**
   * Log user activity for AI context
   * @param activityType Type of activity (e.g., 'feed', 'play')
   * @param details Optional details about the activity
   */
  const logActivity = useCallback(async (activityType: UserActivityType, details: string = '') => {
    // Get UID from UserDataContext
    const currentUid = userData?.uid;
    if (currentUid) {
      // Call logUserActivity with UID, type, and details
      // The name parameter in logUserActivity can be used for details
      await logUserActivity(currentUid, activityType, details || activityType); 
    } else {
      console.warn(`usePetAI: Cannot log activity (${activityType}), UID not available.`);
    }
  }, [userData?.uid]);

  /**
   * Get session duration since login
   */
  const getSessionDuration = useCallback((): number => {
    if (!loginTimeRef.current) return 0;
    return Math.floor((Date.now() - loginTimeRef.current) / 1000);
  }, []);

  return {
    isLoading,
    aiAdvice,
    aiPersonality,
    aiPointMultiplier,
    decayRates,
    cooldowns,
    moodDescription,
    logActivity,
    forceUpdate: () => getAIBehavior(true),
    getPetMessageForInteraction,
    petMessage,
    petReaction
  };
}; 