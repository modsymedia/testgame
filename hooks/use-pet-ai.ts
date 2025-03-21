"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';
import { getPetBehavior, getPetMessage, PetBehaviorResult, DEFAULT_BEHAVIOR, PetMessage } from '@/utils/openai-service';
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
      logUserActivity(walletId, petName, 'login');
      // Initial AI behavior fetch
      getAIBehavior(true);
    } else if (!isConnected && loginTimeRef.current) {
      // Log logout with duration
      const duration = getSessionDuration();
      logUserActivity(walletId, petName, 'logout', duration);
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
  const getAIBehavior = useCallback(async (force = false) => {
    // Don't fetch if we already have behavior and not forcing
    if (aiAdvice && !force) return;
    
    // Skip if not logged in
    if (!petName) return;
    
    setIsLoading(true);
    
    try {
      // Get user behavior data
      const behaviorData = getBehaviorData(
        walletId, 
        petName,
        currentStatsRef.current
      );
      
      if (behaviorData) {
        // Get AI behavior based on user data
        const aiResponse = await getPetBehavior(behaviorData);
        
        // Update state with AI data
        setDecayRates(aiResponse.decayRates);
        setCooldowns(aiResponse.cooldowns);
        setAiPersonality(aiResponse.personality);
        setAiAdvice(aiResponse.advice);
        setAiPointMultiplier(aiResponse.pointMultiplier);
        setMoodDescription(aiResponse.moodDescription);
      }
    } catch (error) {
      console.error("Failed to get AI behavior:", error);
    } finally {
      setIsLoading(false);
    }
  }, [aiAdvice, petName, walletId]);

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
    if (!isConnected || !petName) return null;
    
    setIsLoading(true);
    try {
      const response = await getPetMessage(
        petName,
        interactionType,
        currentStats
      );
      
      setPetMessage(response.message);
      setPetReaction(response.reaction);
      
      // Clear message after 5 seconds
      setTimeout(() => {
        setPetMessage(null);
        setPetReaction("none");
      }, 5000);
      
      return response;
    } catch (error) {
      console.error("Error getting pet message:", error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, petName]);

  /**
   * Log activity for AI to process
   */
  const logActivity = useCallback((activity: UserActivity) => {
    if (!walletId || !petName) return;
    logUserActivity(walletId, petName, activity);
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