import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { User, PetState, HourlyPool } from './models';

/**
 * Combines multiple class strings or objects into a single string,
 * optimizing tailwind classes to avoid conflicts.
 * 
 * @param inputs - Class values to merge (strings, conditional objects, class value arrays)
 * @returns Optimized class string with tailwind conflicts resolved
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Pre-Launch Points System

/**
 * Calculate quality multiplier based on pet state (0.5 to 3.0)
 */
export function calculateQualityMultiplier(petState: PetState): number {
  // Average the pet state metrics
  const avgState = (
    petState.health + 
    petState.happiness + 
    petState.hunger + 
    petState.cleanliness
  ) / 4;
  
  // Scale from 0.5 to 3.0
  return Math.max(0.5, Math.min(3.0, avgState / 33.33));
}

/**
 * Calculate streak multiplier based on consecutive days (1.0 to 1.5)
 */
export function calculateStreakMultiplier(consecutiveDays: number): number {
  return Math.min(1.5, 1.0 + (consecutiveDays * 0.05));
}

/**
 * Calculate daily points cap
 */
export function calculateDailyPointsCap(daysActive: number): number {
  return Math.min(500, 200 + (daysActive * 20));
}

/**
 * Calculate total points cap
 */
export function calculateTotalPointsCap(referralsCount: number): number {
  return Math.min(20000, 10000 + (referralsCount * 500));
}

/**
 * Calculate hourly points earned
 */
export function calculateHourlyPoints(
  baseRate: number, 
  petState: PetState, 
  consecutiveDays: number
): number {
  const qualityMultiplier = calculateQualityMultiplier(petState);
  const streakMultiplier = calculateStreakMultiplier(consecutiveDays);
  
  return baseRate * qualityMultiplier * streakMultiplier;
}

// Post-Launch SOL Reward System

/**
 * Calculate token holding multiplier (0.2 to 8.0)
 */
export function calculateHoldingMultiplier(tokensHeld: number): number {
  if (tokensHeld === 0) return 0.2;
  
  // Using the formula: min(0.2 + (TokensHeld ÷ 10,000)^0.7, 8.0)
  const multiplier = 0.2 + Math.pow(tokensHeld / 10000, 0.7);
  return Math.min(8.0, multiplier);
}

/**
 * Calculate user's weighted points
 */
export function calculateWeightedPoints(basePoints: number, tokensHeld: number): number {
  return basePoints * calculateHoldingMultiplier(tokensHeld);
}

/**
 * Calculate user's SOL reward from a pool
 */
export function calculateUserSolReward(
  userWeightedPoints: number,
  totalWeightedPoints: number,
  hourlyPoolAmount: number
): number {
  // Minimum reward threshold
  const minReward = 0.001;
  
  // Calculate share of the pool
  const share = userWeightedPoints / totalWeightedPoints;
  
  // Calculate raw reward
  const rawReward = share * hourlyPoolAmount;
  
  // Apply minimum threshold and maximum cap (5% of pool)
  const maxReward = hourlyPoolAmount * 0.05;
  return Math.max(minReward, Math.min(maxReward, rawReward));
}

/**
 * Calculate daily SOL reward pool
 */
export function calculateDailySolPool(dailyVolume: number, taxRate: number = 0.05): number {
  return dailyVolume * taxRate;
}

/**
 * Calculate hourly SOL pool
 */
export function calculateHourlyPools(dailyPool: number): HourlyPool[] {
  const hourlyAmount = dailyPool / 24;
  
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    poolAmount: hourlyAmount,
    distributedAmount: 0,
    participants: 0,
    status: 'pending'
  }));
}

