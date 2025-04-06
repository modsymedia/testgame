"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';
import { 
  getPetBehavior, 
  getPetMessage, 
  PetBehaviorResult, 
  DEFAULT_BEHAVIOR, 
  PetMessage,
  PetState,
  PetBehaviorResponse
} from '@/utils/openai-service';
import { getBehaviorData, logUserActivity, UserActivity } from '@/utils/user-behavior-tracker';

/**
 * Custom hook to integrate AI-driven pet behavior
 */
export const usePetAI = (petName: string, walletId: string, initialStats: any) => {
  const { isConnected } = useWallet();
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
        await logUserActivity(walletId, petName, 'login');
        // Initial AI behavior fetch after logging - call directly from the effect
        if (isConnected && petName && walletId) {
          setIsLoading(true);
          try {
            // Prepare current pet state
            const currentPetState: PetState = {
              health: currentStatsRef.current.health || 100,
              happiness: currentStatsRef.current.happiness || 100,
              hunger: currentStatsRef.current.hunger || 100,
              cleanliness: currentStatsRef.current.cleanliness || 100,
              energy: currentStatsRef.current.energy || 100
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
          } finally {
            setIsLoading(false);
          }
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
  }, [isConnected, petName, walletId]);

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
  }, [isConnected, petName, walletId, initialStats]);

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
   * Log activity for AI to process
   */
  const logActivity = useCallback(async (activity: UserActivity) => {
    if (!walletId || !petName) return;
    await logUserActivity(walletId, petName, activity);
  }, [walletId, petName]);

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