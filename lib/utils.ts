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
  // Average the pet state metrics (health, happiness, hunger, cleanliness)
  const avgState = (
    petState.health + 
    petState.happiness + 
    petState.hunger + 
    petState.cleanliness
  ) / 4;
  
  // Scale from 0.5 to 3.0 based on GOCHI technical specification
  return Math.max(0.5, Math.min(3.0, avgState / 33.33));
}

/**
 * Calculate streak multiplier based on consecutive days (1.0 to 1.5)
 * Formula: 1.0 + (ConsecutiveDays × 0.05), capped at 1.5
 */
export function calculateStreakMultiplier(consecutiveDays: number): number {
  return Math.min(1.5, 1.0 + (consecutiveDays * 0.05));
}

/**
 * Calculate daily points cap
 * Formula: BaseCap + (DaysActive × 20), maximum 500
 * Where BaseCap = 200 points (day 1 maximum)
 */
export function calculateDailyPointsCap(daysActive: number): number {
  return Math.min(500, 200 + (daysActive * 20));
}

/**
 * Calculate total points cap
 * Formula: 10,000 + (ReferralsCount × 500), maximum 20,000
 */
export function calculateTotalPointsCap(referralsCount: number): number {
  return Math.min(20000, 10000 + (referralsCount * 500));
}

/**
 * Calculate hourly points earned
 * Formula: BaseRate × QualityMultiplier × StreakMultiplier
 * Where BaseRate = 10 points per hour
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
 * Formula: min(0.2 + (TokensHeld ÷ 10,000)^0.7, 8.0)
 */
export function calculateHoldingMultiplier(tokensHeld: number): number {
  if (tokensHeld === 0) return 0.2;
  
  // Using the formula from GOCHI technical specification
  const multiplier = 0.2 + Math.pow(tokensHeld / 10000, 0.7);
  return Math.min(8.0, multiplier);
}

/**
 * Calculate user's weighted points
 * Formula: BasePoints × HoldingMultiplier
 */
export function calculateWeightedPoints(basePoints: number, tokensHeld: number): number {
  return basePoints * calculateHoldingMultiplier(tokensHeld);
}

/**
 * Calculate user's SOL reward from a pool
 * Formula: (UserWeightedPoints ÷ TotalWeightedPoints) × HourlySOLPool
 * With minimum reward of 0.001 SOL and maximum of 5% of the pool
 */
export function calculateUserSolReward(
  userWeightedPoints: number,
  totalWeightedPoints: number,
  hourlyPoolAmount: number
): number {
  // Minimum reward threshold of 0.001 SOL per the spec
  const minReward = 0.001;
  
  // Calculate share of the pool
  const share = userWeightedPoints / totalWeightedPoints;
  
  // Calculate raw reward
  const rawReward = share * hourlyPoolAmount;
  
  // Apply minimum threshold and maximum cap (5% of pool) per the spec
  const maxReward = hourlyPoolAmount * 0.05;
  return Math.max(minReward, Math.min(maxReward, rawReward));
}

/**
 * Calculate daily SOL reward pool
 * Formula: DailyVolume × 0.05 (5% tax)
 */
export function calculateDailySolPool(dailyVolume: number, taxRate: number = 0.05): number {
  return dailyVolume * taxRate;
}

/**
 * Calculate hourly SOL pool
 * Formula: Daily SOL Pool ÷ 24
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

