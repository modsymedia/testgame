"use client";

import { useEffect, useState, useCallback, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';
import { getPetBehavior, PetBehaviorResult, getPetMessage, PetMessage } from '@/utils/openai-service';
import { getBehaviorData, logUserActivity } from '@/utils/user-behavior-tracker';

// Login timestamp tracking
let loginTime: number | null = null;

export function usePetAI() {
  const { isConnected, publicKey, walletData } = useWallet();
  const [aiPersonality, setAiPersonality] = useState<PetBehaviorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [advice, setAdvice] = useState<string>('');
  
  // Track session with ref to avoid unnecessary re-renders
  const sessionRef = useRef({
    isActive: false,
    startTime: 0
  });

  // Track current pet stats
  const currentStatsRef = useRef({
    food: 50,
    happiness: 40,
    cleanliness: 40,
    energy: 30,
    health: 30
  });
  
  // State for pet messages
  const [petMessage, setPetMessage] = useState<string | null>(null);
  const [petReaction, setPetReaction] = useState<string>("none");
  
  // Update pet session status when connection changes
  useEffect(() => {
    if (isConnected && publicKey && !sessionRef.current.isActive) {
      // User just logged in
      sessionRef.current.isActive = true;
      sessionRef.current.startTime = Date.now();
      loginTime = Date.now();
      
      // Log login activity
      if (walletData?.petName) {
        logUserActivity(publicKey, walletData.petName, 'login');
      }
    } else if (!isConnected && sessionRef.current.isActive) {
      // User just logged out
      const sessionDuration = Date.now() - sessionRef.current.startTime;
      sessionRef.current.isActive = false;
      
      // Log logout with duration
      if (publicKey && walletData?.petName) {
        logUserActivity(publicKey, walletData.petName, 'logout', sessionDuration);
      }
    }
  }, [isConnected, publicKey, walletData]);
  
  // Track activities
  const logActivity = useCallback((activityType: 'feed' | 'play' | 'clean' | 'heal') => {
    if (isConnected && publicKey && walletData?.petName) {
      logUserActivity(publicKey, walletData.petName, activityType);
    }
  }, [isConnected, publicKey, walletData]);
  
  // Update current stats
  const updateCurrentStats = useCallback((stats: Partial<typeof currentStatsRef.current>) => {
    currentStatsRef.current = { ...currentStatsRef.current, ...stats };
  }, []);
  
  // Get AI-driven behavior
  const getAIBehavior = useCallback(async (forceUpdate = false) => {
    if (!isConnected || !publicKey || !walletData?.petName) {
      return null;
    }
    
    // Only update every 5 minutes unless forced
    const now = Date.now();
    if (!forceUpdate && now - lastUpdateTime < 5 * 60 * 1000) {
      return aiPersonality;
    }
    
    setIsLoading(true);
    
    try {
      // Get behavior data from tracker
      const behaviorData = getBehaviorData(publicKey, currentStatsRef.current);
      
      if (behaviorData) {
        // Call OpenAI to get personalized behavior
        const personality = await getPetBehavior(behaviorData);
        setAiPersonality(personality);
        setAdvice(personality.advice);
        setLastUpdateTime(now);
        return personality;
      }
    } catch (error) {
      console.error('Error getting AI behavior:', error);
    } finally {
      setIsLoading(false);
    }
    
    return null;
  }, [isConnected, publicKey, walletData, lastUpdateTime, aiPersonality]);
  
  // Initialize AI behavior on first load
  useEffect(() => {
    if (isConnected && publicKey && !aiPersonality) {
      getAIBehavior(true);
    }
  }, [isConnected, publicKey, aiPersonality, getAIBehavior]);
  
  // Update behavior periodically
  useEffect(() => {
    const updateInterval = setInterval(() => {
      if (isConnected && publicKey) {
        getAIBehavior();
      }
    }, 15 * 60 * 1000); // Check every 15 minutes
    
    return () => clearInterval(updateInterval);
  }, [isConnected, publicKey, getAIBehavior]);
  
  // Calculate login duration so far
  const getSessionDuration = useCallback(() => {
    if (!loginTime) return 0;
    return Date.now() - loginTime;
  }, []);
  
  /**
   * Get a message from the pet's perspective based on the interaction
   */
  const getPetMessageForInteraction = useCallback(async (
    interactionType: 'feed' | 'play' | 'clean' | 'doctor' | 'idle',
    currentStats: {
      food: number;
      happiness: number;
      cleanliness: number;
      energy: number;
      health: number;
    }
  ) => {
    if (!isConnected || !walletData?.petName) return;
    
    setIsLoading(true);
    try {
      const response = await getPetMessage(
        walletData.petName,
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
      
      // Apply stat changes if AI suggested any
      if (response.updatedStats) {
        return response;
      }
      
      // Apply any rewards from AI
      if (response.reward > 0) {
        // TODO: Apply rewards
      }
      
      return response;
    } catch (error) {
      console.error("Error getting pet message:", error);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, walletData?.petName]);
  
  return {
    aiPersonality,
    aiAdvice: advice,
    isAILoading: isLoading,
    logActivity,
    updateCurrentStats,
    getAIBehavior,
    getSessionDuration,
    getPetMessageForInteraction,
    petMessage,
    petReaction
  };
} 