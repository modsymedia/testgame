import { User } from './models';
import { dbService } from './database-service';
import { gameSyncManager } from './game-sync-manager';
import { EventEmitter } from 'events';

// Point operation types
export type PointOperation = 'earn' | 'spend' | 'bonus' | 'penalty' | 'refund';

// Point source tracking
export type PointSource = 'gameplay' | 'daily' | 'achievement' | 'referral' | 'streak' | 'interaction' | 'purchase';

// Point transaction record
export interface PointTransaction {
  walletAddress: string;
  amount: number;
  operation: PointOperation;
  source: PointSource;
  timestamp: Date;
  metadata?: Record<string, any>;
  isProcessed?: boolean;
}

// Configuration for points management
export interface PointsConfig {
  // Base values for different point sources
  baseValues: {
    gameplay: number;
    daily: number;
    achievement: Record<string, number>;
    referral: number;
    streak: number;
    interaction: number;
  };
  
  // Multipliers for different conditions
  multipliers: {
    consecutiveDaysMin: number; // Minimum consecutive days for streak bonus
    consecutiveDaysMultiplier: number; // Multiplier per consecutive day
    maxConsecutiveDaysMultiplier: number; // Cap on consecutive days multiplier
    referralMultiplier: number; // Multiplier for referral points
  };
  
  // Cooldowns for different point sources (in milliseconds)
  cooldowns: {
    interaction: number;
    gameplay: number;
  };
  
  // Caps for daily points
  caps: {
    dailyPoints: number;
    interactionPoints: number;
  };
}

// Default configuration
export const DEFAULT_POINTS_CONFIG: PointsConfig = {
  baseValues: {
    gameplay: 10,
    daily: 50,
    achievement: {
      'first_game': 100,
      'five_games': 250,
      'daily_streak_3': 150,
      'daily_streak_7': 300,
      'daily_streak_30': 1000,
      'pet_max_stats': 500,
    },
    referral: 200,
    streak: 20,
    interaction: 5
  },
  multipliers: {
    consecutiveDaysMin: 3,
    consecutiveDaysMultiplier: 0.1, // 10% per day after min
    maxConsecutiveDaysMultiplier: 2.0, // Max 2x multiplier
    referralMultiplier: 0.05 // 5% per referral
  },
  cooldowns: {
    interaction: 60 * 1000, // 1 minute
    gameplay: 5 * 60 * 1000 // 5 minutes
  },
  caps: {
    dailyPoints: 1000,
    interactionPoints: 200
  }
};

// Add localStorage backup to the points manager
interface PointsCache {
  points: number;
  dailyPoints: number;
  multiplier: number;
  streak: number;
  daysActive: number;
  lastUpdate: Date | null;
  recentGain: number;
  history: PointTransaction[];
  cooldowns: Record<string, number>;
  lastSyncTime: number;
}

// Points manager singleton
export class PointsManager {
  private static _instance: PointsManager;
  private config: PointsConfig;
  private transactionHistory: Map<string, PointTransaction[]> = new Map();
  private transactionCallbacks: ((tx: PointTransaction) => void)[] = [];
  private eventEmitter: EventEmitter = new EventEmitter();
  private userPointsCache: Record<string, PointsCache> = {};
  private pendingTransactions: PointTransaction[] = [];
  private syncInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  
  private constructor(config: PointsConfig = DEFAULT_POINTS_CONFIG) {
    this.config = config;
    
    // Auto-sync every 3 seconds
    if (typeof window !== 'undefined') {
      this.syncInterval = setInterval(() => {
        this.processPendingTransactions();
      }, 3000);
      
      // Setup visibility change to sync when page becomes visible
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
      
      // Load cache from localStorage
      this.loadCacheFromStorage();
      
      // Mark as initialized
      this.isInitialized = true;
    }
  }
  
  public static get instance(): PointsManager {
    if (!PointsManager._instance) {
      PointsManager._instance = new PointsManager();
    }
    return PointsManager._instance;
  }
  
  // Update configuration
  public updateConfig(newConfig: Partial<PointsConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      baseValues: {
        ...this.config.baseValues,
        ...(newConfig.baseValues || {}),
        achievement: {
          ...this.config.baseValues.achievement,
          ...(newConfig.baseValues?.achievement || {})
        }
      },
      multipliers: {
        ...this.config.multipliers,
        ...(newConfig.multipliers || {})
      },
      cooldowns: {
        ...this.config.cooldowns,
        ...(newConfig.cooldowns || {})
      },
      caps: {
        ...this.config.caps,
        ...(newConfig.caps || {})
      }
    };
  }
  
  // Get user data
  private async getUserData(walletAddress: string): Promise<User | null> {
    try {
      return await dbService.getUserData(walletAddress);
    } catch (error) {
      console.error('Error getting user data for points:', error);
      return null;
    }
  }
  
  // Add transaction to history
  private addTransaction(tx: PointTransaction): void {
    if (!this.transactionHistory.has(tx.walletAddress)) {
      this.transactionHistory.set(tx.walletAddress, []);
    }
    
    this.transactionHistory.get(tx.walletAddress)?.push(tx);
    
    // Call transaction callbacks
    this.transactionCallbacks.forEach(callback => {
      try {
        callback(tx);
      } catch (error) {
        console.error('Error in points transaction callback:', error);
      }
    });
  }
  
  // Register for transaction notifications
  public onTransaction(callback: (tx: PointTransaction) => void): () => void {
    this.transactionCallbacks.push(callback);
    return () => {
      this.transactionCallbacks = this.transactionCallbacks.filter(cb => cb !== callback);
    };
  }
  
  // Get transaction history for a user
  public getTransactionHistory(walletAddress: string): PointTransaction[] {
    return this.transactionHistory.get(walletAddress) || [];
  }
  
  // Calculate user multiplier
  private calculateMultiplier(user: User): number {
    let multiplier = 1.0;
    
    // Consecutive days multiplier
    if (user.consecutiveDays >= this.config.multipliers.consecutiveDaysMin) {
      const daysOverMin = user.consecutiveDays - this.config.multipliers.consecutiveDaysMin;
      const streakMultiplier = 1 + Math.min(
        daysOverMin * this.config.multipliers.consecutiveDaysMultiplier,
        this.config.multipliers.maxConsecutiveDaysMultiplier - 1
      );
      multiplier *= streakMultiplier;
    }
    
    // Referral multiplier
    if (user.referralCount > 0) {
      const referralMultiplier = 1 + (user.referralCount * this.config.multipliers.referralMultiplier);
      multiplier *= referralMultiplier;
    }
    
    return Math.round(multiplier * 100) / 100; // Round to 2 decimal places
  }
  
  // Check if user is on cooldown for a point source
  private isOnCooldown(user: User, source: PointSource): boolean {
    const now = Date.now();
    const cooldowns = user.cooldowns || {};
    
    if (source === 'interaction' && cooldowns.interaction) {
      return now - cooldowns.interaction < this.config.cooldowns.interaction;
    }
    
    if (source === 'gameplay' && cooldowns.gameplay) {
      return now - cooldowns.gameplay < this.config.cooldowns.gameplay;
    }
    
    return false;
  }
  
  // Set cooldown for a point source
  private setCooldown(user: User, source: PointSource): User {
    const now = Date.now();
    const cooldowns = user.cooldowns || {};
    
    return {
      ...user,
      cooldowns: {
        ...cooldowns,
        [source]: now
      }
    };
  }
  
  // Award points to a user
  public async awardPoints(
    walletAddress: string, 
    amount: number, 
    source: PointSource,
    operation: PointOperation = 'earn',
    metadata: Record<string, any> = {}
  ): Promise<{success: boolean, points: number, total: number, multiplier: number}> {
    try {
      // Get user data
      const user = await this.getUserData(walletAddress);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check cooldowns for certain sources
      if ((source === 'interaction' || source === 'gameplay') && this.isOnCooldown(user, source)) {
        return {
          success: false,
          points: 0,
          total: user.points,
          multiplier: user.multiplier || 1.0
        };
      }
      
      // Calculate multiplier
      const multiplier = this.calculateMultiplier(user);
      const pointsToAdd = Math.floor(amount * multiplier);
      
      // Apply daily cap if applicable
      let adjustedPoints = pointsToAdd;
      const now = new Date();
      const isNewDay = !user.lastPointsUpdate || 
        user.lastPointsUpdate.getDate() !== now.getDate() || 
        user.lastPointsUpdate.getMonth() !== now.getMonth() || 
        user.lastPointsUpdate.getFullYear() !== now.getFullYear();
      
      // Reset daily points if it's a new day
      let dailyPoints = isNewDay ? 0 : (user.dailyPoints || 0);
      
      // Check daily cap for some sources
      if (['gameplay', 'interaction', 'daily'].includes(source)) {
        if (dailyPoints + pointsToAdd > this.config.caps.dailyPoints) {
          adjustedPoints = Math.max(0, this.config.caps.dailyPoints - dailyPoints);
        }
        dailyPoints += adjustedPoints;
      }
      
      // Check interaction cap
      if (source === 'interaction') {
        const interactionPoints = user.cooldowns?.interactionTotal || 0;
        if (interactionPoints + pointsToAdd > this.config.caps.interactionPoints) {
          adjustedPoints = Math.max(0, this.config.caps.interactionPoints - interactionPoints);
        }
      }
      
      // Create transaction record
      const transaction: PointTransaction = {
        walletAddress,
        amount: adjustedPoints,
        operation,
        source,
        timestamp: now,
        metadata
      };
      
      // Add to transaction history
      this.addTransaction(transaction);
      
      // Update user data with new points
      const updatedUser = {
        ...user,
        points: user.points + adjustedPoints,
        dailyPoints,
        lastPointsUpdate: now,
        multiplier,
        recentPointGain: adjustedPoints,
        lastPointGainTime: now
      };
      
      // Set cooldown if applicable
      if (source === 'interaction' || source === 'gameplay') {
        const cooledDownUser = this.setCooldown(updatedUser, source);
        
        // Track total interaction points if needed
        if (source === 'interaction') {
          cooledDownUser.cooldowns = {
            ...cooledDownUser.cooldowns,
            interactionTotal: (cooledDownUser.cooldowns?.interactionTotal || 0) + adjustedPoints
          };
        }
        
        await dbService.updateUserData(walletAddress, cooledDownUser);
        
        // Also update the game state if we're in an active session
        this.updateGameStatePoints(walletAddress, adjustedPoints);
      } else {
        await dbService.updateUserData(walletAddress, updatedUser);
        
        // Also update the game state if we're in an active session
        this.updateGameStatePoints(walletAddress, adjustedPoints);
      }
      
      return {
        success: true,
        points: adjustedPoints,
        total: updatedUser.points,
        multiplier
      };
    } catch (error) {
      console.error('Error awarding points:', error);
      return {
        success: false,
        points: 0,
        total: 0,
        multiplier: 1.0
      };
    }
  }
  
  // Deduct points from a user
  public async deductPoints(
    walletAddress: string, 
    amount: number, 
    source: PointSource,
    metadata: Record<string, any> = {}
  ): Promise<{success: boolean, points: number, total: number}> {
    try {
      // Get user data
      const user = await this.getUserData(walletAddress);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Check if user has enough points
      if (user.points < amount) {
        return {
          success: false,
          points: 0,
          total: user.points
        };
      }
      
      // Create transaction record
      const transaction: PointTransaction = {
        walletAddress,
        amount: -amount, // Negative amount for deduction
        operation: 'spend',
        source,
        timestamp: new Date(),
        metadata
      };
      
      // Add to transaction history
      this.addTransaction(transaction);
      
      // Update user data with new points
      const updatedUser = {
        ...user,
        points: user.points - amount,
        lastPointsUpdate: new Date()
      };
      
      await dbService.updateUserData(walletAddress, updatedUser);
      
      return {
        success: true,
        points: amount,
        total: updatedUser.points
      };
    } catch (error) {
      console.error('Error deducting points:', error);
      return {
        success: false,
        points: 0,
        total: 0
      };
    }
  }
  
  // Award achievement points
  public async awardAchievement(
    walletAddress: string, 
    achievementId: string,
    metadata: Record<string, any> = {}
  ): Promise<{success: boolean, points: number, total: number}> {
    try {
      // Check if achievement exists
      if (!this.config.baseValues.achievement[achievementId]) {
        throw new Error(`Achievement ${achievementId} not found`);
      }
      
      const points = this.config.baseValues.achievement[achievementId];
      
      // Check if user already has this achievement
      const user = await this.getUserData(walletAddress);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Type-safe access to achievements
      const userAchievements = user.cooldowns?.achievements as Record<string, number> | undefined;
      if (userAchievements && userAchievements[achievementId]) {
        return {
          success: false,
          points: 0,
          total: user.points
        };
      }
      
      // Award points
      const result = await this.awardPoints(
        walletAddress, 
        points, 
        'achievement', 
        'earn',
        {
          ...metadata,
          achievementId
        }
      );
      
      if (result.success) {
        // Mark achievement as completed
        const updatedUser = await this.getUserData(walletAddress);
        if (updatedUser) {
          const existingAchievements = updatedUser.cooldowns?.achievements as Record<string, number> | undefined || {};
          const newAchievements = {
            ...existingAchievements,
            [achievementId]: Date.now()
          };
          
          await dbService.updateUserData(walletAddress, {
            ...updatedUser,
            cooldowns: {
              ...updatedUser.cooldowns,
              achievements: newAchievements as any
            }
          });
        }
      }
      
      return {
        success: result.success,
        points: result.points,
        total: result.total
      };
    } catch (error) {
      console.error('Error awarding achievement:', error);
      return {
        success: false,
        points: 0,
        total: 0
      };
    }
  }
  
  // Award daily login bonus
  public async awardDailyBonus(walletAddress: string): Promise<{
    success: boolean,
    points: number,
    total: number,
    daysActive: number,
    streak: number
  }> {
    try {
      // Get user data
      const user = await this.getUserData(walletAddress);
      if (!user) {
        throw new Error('User not found');
      }
      
      const now = new Date();
      const lastActive = user.lastPointsUpdate || new Date(0);
      
      // Check if already claimed today
      if (
        lastActive.getDate() === now.getDate() &&
        lastActive.getMonth() === now.getMonth() &&
        lastActive.getFullYear() === now.getFullYear() &&
        user.cooldowns?.dailyBonus
      ) {
        return {
          success: false,
          points: 0,
          total: user.points,
          daysActive: user.daysActive || 0,
          streak: user.consecutiveDays || 0
        };
      }
      
      // Calculate streak
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const isConsecutive = 
        lastActive.getDate() === yesterday.getDate() &&
        lastActive.getMonth() === yesterday.getMonth() &&
        lastActive.getFullYear() === yesterday.getFullYear();
      
      let consecutiveDays = user.consecutiveDays || 0;
      if (isConsecutive) {
        consecutiveDays++;
      } else {
        consecutiveDays = 1; // Reset streak
      }
      
      // Award points
      const dailyPoints = this.config.baseValues.daily;
      const streakBonus = consecutiveDays >= this.config.multipliers.consecutiveDaysMin
        ? this.config.baseValues.streak
        : 0;
      
      const result = await this.awardPoints(
        walletAddress,
        dailyPoints + streakBonus,
        'daily',
        'earn',
        { isStreakBonus: streakBonus > 0, streak: consecutiveDays }
      );
      
      if (result.success) {
        // Update user streak and active days
        const updatedUser = await this.getUserData(walletAddress);
        if (updatedUser) {
          await dbService.updateUserData(walletAddress, {
            ...updatedUser,
            daysActive: (updatedUser.daysActive || 0) + 1,
            consecutiveDays,
            cooldowns: {
              ...updatedUser.cooldowns,
              dailyBonus: Date.now()
            }
          });
        }
        
        // Check for streak achievements
        if (consecutiveDays === 3) {
          await this.awardAchievement(walletAddress, 'daily_streak_3');
        } else if (consecutiveDays === 7) {
          await this.awardAchievement(walletAddress, 'daily_streak_7');
        } else if (consecutiveDays === 30) {
          await this.awardAchievement(walletAddress, 'daily_streak_30');
        }
      }
      
      return {
        success: result.success,
        points: result.points,
        total: result.total,
        daysActive: user.daysActive || 0,
        streak: consecutiveDays
      };
    } catch (error) {
      console.error('Error awarding daily bonus:', error);
      return {
        success: false,
        points: 0,
        total: 0,
        daysActive: 0,
        streak: 0
      };
    }
  }
  
  // Award gameplay points
  public async awardGameplayPoints(
    walletAddress: string,
    score: number,
    metadata: Record<string, any> = {}
  ): Promise<{success: boolean, points: number, total: number}> {
    try {
      const user = await this.getUserData(walletAddress);
      if (!user) {
        throw new Error('User not found');
      }
      
      // Calculate points from score
      const basePoints = this.config.baseValues.gameplay;
      const scoreMultiplier = Math.max(1, Math.floor(score / 100)); // 1 extra point per 100 score
      const pointsToAward = basePoints * scoreMultiplier;
      
      // Check for first game achievement
      if (user.gamesPlayed === 0) {
        await this.awardAchievement(walletAddress, 'first_game');
      }
      
      // Check for five games achievement
      if (user.gamesPlayed === 4) {
        await this.awardAchievement(walletAddress, 'five_games');
      }
      
      // Award points
      const result = await this.awardPoints(
        walletAddress,
        pointsToAward,
        'gameplay',
        'earn',
        {
          ...metadata,
          score,
          basePoints,
          scoreMultiplier
        }
      );
      
      if (result.success) {
        // Update games played
        const updatedUser = await this.getUserData(walletAddress);
        if (updatedUser) {
          await dbService.updateUserData(walletAddress, {
            ...updatedUser,
            gamesPlayed: (updatedUser.gamesPlayed || 0) + 1,
            score: Math.max(updatedUser.score || 0, score), // Update high score
            lastPlayed: new Date()
          });
        }
      }
      
      return {
        success: result.success,
        points: result.points,
        total: result.total
      };
    } catch (error) {
      console.error('Error awarding gameplay points:', error);
      return {
        success: false,
        points: 0,
        total: 0
      };
    }
  }
  
  // Award points for interaction
  public async awardInteractionPoints(
    walletAddress: string,
    interactionType: string
  ): Promise<{success: boolean, points: number, total: number}> {
    try {
      // Award points
      const interactionPoints = this.config.baseValues.interaction;
      
      return await this.awardPoints(
        walletAddress,
        interactionPoints,
        'interaction',
        'earn',
        { interactionType }
      );
    } catch (error) {
      console.error('Error awarding interaction points:', error);
      return {
        success: false,
        points: 0,
        total: 0
      };
    }
  }
  
  // Award referral points
  public async awardReferralPoints(
    referrerWalletAddress: string,
    referredWalletAddress: string
  ): Promise<{success: boolean, points: number, total: number}> {
    try {
      // Award points to referrer
      const referralPoints = this.config.baseValues.referral;
      
      const result = await this.awardPoints(
        referrerWalletAddress,
        referralPoints,
        'referral',
        'earn',
        { referredWallet: referredWalletAddress }
      );
      
      if (result.success) {
        // Update referral count
        const referrer = await this.getUserData(referrerWalletAddress);
        if (referrer) {
          await dbService.updateUserData(referrerWalletAddress, {
            ...referrer,
            referralCount: (referrer.referralCount || 0) + 1,
            referralPoints: (referrer.referralPoints || 0) + result.points
          });
        }
        
        // Update referred user
        const referred = await this.getUserData(referredWalletAddress);
        if (referred) {
          await dbService.updateUserData(referredWalletAddress, {
            ...referred,
            referredBy: referrerWalletAddress
          });
        }
      }
      
      return {
        success: result.success,
        points: result.points,
        total: result.total
      };
    } catch (error) {
      console.error('Error awarding referral points:', error);
      return {
        success: false,
        points: 0,
        total: 0
      };
    }
  }
  
  // Get user points data
  public async getUserPointsData(walletAddress: string): Promise<{
    points: number;
    dailyPoints: number;
    multiplier: number;
    streak: number;
    daysActive: number;
    lastUpdate: Date | null;
    recentGain: number;
  }> {
    try {
      const user = await this.getUserData(walletAddress);
      if (!user) {
        throw new Error('User not found');
      }
      
      return {
        points: user.points || 0,
        dailyPoints: user.dailyPoints || 0,
        multiplier: user.multiplier || 1.0,
        streak: user.consecutiveDays || 0,
        daysActive: user.daysActive || 0,
        lastUpdate: user.lastPointsUpdate || null,
        recentGain: user.recentPointGain || 0
      };
    } catch (error) {
      console.error('Error getting user points data:', error);
      return {
        points: 0,
        dailyPoints: 0,
        multiplier: 1.0,
        streak: 0,
        daysActive: 0,
        lastUpdate: null,
        recentGain: 0
      };
    }
  }
  
  // Add this new method to the PointsManager class
  private updateGameStatePoints(walletAddress: string, pointsAdded: number): void {
    try {
      // Check if game sync manager has an active session
      if (gameSyncManager.hasActiveSession()) {
        // Update the points in the game state
        gameSyncManager.updateGameState({
          lastPointsUpdate: {
            amount: pointsAdded,
            timestamp: Date.now()
          }
        }, 'userData.points');
      }
    } catch (error) {
      console.error('Error updating game state with points:', error);
    }
  }
  
  // Handle visibility change event
  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      // Page is visible again, process any pending transactions and reload cache
      this.processPendingTransactions();
      this.loadCacheFromStorage();
    } else {
      // Page is being hidden, save cache
      this.saveCacheToStorage();
    }
  };
  
  // Save cache to localStorage
  private saveCacheToStorage() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('points_manager_cache', JSON.stringify({
          userPointsCache: this.userPointsCache,
          pendingTransactions: this.pendingTransactions,
          transactionHistory: this.transactionHistory,
          timestamp: Date.now()
        }));
      } catch (err) {
        console.error('Error saving points cache:', err);
      }
    }
  }
  
  // Load cache from localStorage
  private loadCacheFromStorage() {
    if (typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem('points_manager_cache');
        if (cachedData) {
          const parsed = JSON.parse(cachedData);
          
          // Restore dates from strings
          if (parsed.userPointsCache) {
            Object.keys(parsed.userPointsCache).forEach(key => {
              if (parsed.userPointsCache[key].lastUpdate) {
                parsed.userPointsCache[key].lastUpdate = new Date(parsed.userPointsCache[key].lastUpdate);
              }
            });
            this.userPointsCache = parsed.userPointsCache;
          }
          
          if (parsed.pendingTransactions) {
            this.pendingTransactions = parsed.pendingTransactions.map((tx: any) => ({
              ...tx,
              timestamp: new Date(tx.timestamp)
            }));
          }
          
          if (parsed.transactionHistory) {
            Object.keys(parsed.transactionHistory).forEach(key => {
              this.transactionHistory.set(key, (parsed.transactionHistory[key] || []).map((tx: any) => ({
                ...tx,
                timestamp: new Date(tx.timestamp)
              })))
            });
          }
        }
      } catch (err) {
        console.error('Error loading points cache:', err);
      }
    }
  }

  // Process pending transactions
  private async processPendingTransactions() {
    if (this.pendingTransactions.length === 0) return;
    
    const transactions = [...this.pendingTransactions];
    this.pendingTransactions = [];
    
    for (const tx of transactions) {
      try {
        await this.persistTransaction(tx);
      } catch (err) {
        console.error('Failed to process transaction:', err);
        // Add back to pending if failed
        this.pendingTransactions.push(tx);
      }
    }
    
    // Save updated state
    this.saveCacheToStorage();
  }

  // Persist transaction to database
  private async persistTransaction(transaction: PointTransaction): Promise<boolean> {
    try {
      // Get latest user data
      const userData = await dbService.getUserData(transaction.walletAddress);
      
      if (!userData) {
        return false;
      }
      
      // Create the update object with the correct type
      const updatedUser: Partial<User> = {
        points: userData.points + transaction.amount,
        recentPointGain: transaction.amount,
        lastPointGainTime: new Date(),
        lastPointsUpdate: new Date()
      };
      
      // Update daily points if source is daily
      if (transaction.source === 'daily') {
        updatedUser.dailyPoints = (userData.dailyPoints || 0) + transaction.amount;
      }
      
      // Persist to database
      const success = await dbService.updateUserData(transaction.walletAddress, updatedUser);
      
      // If successful, mark transaction as processed
      if (success) {
        // Set the property using bracket notation since it's optional
        transaction.isProcessed = true;
      }
      
      return success;
    } catch (err) {
      console.error('Error persisting transaction:', err);
      return false;
    }
  }

  // Get referral data for a user
  public async getReferralData(walletAddress: string): Promise<{
    referralCode: string | null;
    referralCount: number;
    totalEarned: number;
  }> {
    try {
      // Since we might not have referral features in the database yet,
      // return mock data for now
      console.log(`Getting referral data for: ${walletAddress}`);
      
      // Generate a temporary referral code based on wallet address
      const tempCode = walletAddress.substring(0, 6) + Math.random().toString(36).substring(2, 6);
      
      return {
        referralCode: tempCode,
        referralCount: 0,
        totalEarned: 0
      };
      
      // Uncomment this when the database supports referrals
      /*
      const userData = await this.getUserData(walletAddress);
      
      if (!userData) {
        return {
          referralCode: null,
          referralCount: 0,
          totalEarned: 0
        };
      }
      
      // Calculate total earned from referrals
      const referralTransactions = this.getTransactionHistory(walletAddress)
        .filter(tx => tx.source === 'referral' && tx.operation === 'earn');
          
      const totalEarned = referralTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      
      return {
        referralCode: userData.referralCode || null,
        referralCount: userData.referralCount || 0,
        totalEarned
      };
      */
    } catch (error) {
      console.error('Error getting referral data:', error);
      return {
        referralCode: null,
        referralCount: 0, 
        totalEarned: 0
      };
    }
  }
  
  // Update referral count for a user
  public async updateReferralCount(walletAddress: string, increment: number = 1): Promise<boolean> {
    try {
      const userData = await this.getUserData(walletAddress);
      
      if (!userData) {
        return false;
      }
      
      const currentCount = userData.referralCount || 0;
      const newCount = currentCount + increment;
      
      // Update user data
      await dbService.updateUserData(walletAddress, {
        referralCount: newCount,
        multiplier: this.calculateMultiplier({
          ...userData,
          referralCount: newCount
        })
      });
      
      // Emit event for UI updates
      this.eventEmitter.emit('referral-updated', {
        walletAddress,
        referralCount: newCount
      });
      
      return true;
    } catch (error) {
      console.error('Error updating referral count:', error);
      return false;
    }
  }
  
  // Validate a referral code and process the referral
  public async validateReferralCode(
    referralCode: string, 
    newUserWalletAddress: string
  ): Promise<{
    valid: boolean;
    referrerWalletAddress?: string;
    pointsAwarded?: number;
  }> {
    try {
      // Since we might not have referral_code in the database,
      // return a basic success response for now
      console.log(`Validating referral code: ${referralCode} for user: ${newUserWalletAddress}`);
      
      // For testing, treat any referral code as valid to avoid errors
      return {
        valid: true,
        referrerWalletAddress: "demo-referrer-address", // Dummy value
        pointsAwarded: 100 // Dummy value
      };
      
      // Uncomment this once the database schema supports referrals
      /*
      // Find user with this referral code
      const users = await dbService.queryUsers({
        referralCode: referralCode
      });
      
      if (users.length === 0) {
        return { valid: false };
      }
      
      const referrer = users[0];
      const referrerWalletAddress = referrer.walletAddress;
      
      // Make sure the referee is not the same as the referrer
      if (referrerWalletAddress === newUserWalletAddress) {
        return { valid: false };
      }
      
      // Check if this new user has already been referred (prevent fraud)
      const newUserData = await this.getUserData(newUserWalletAddress);
      if (newUserData && newUserData.hasBeenReferred) {
        return { valid: false };
      }
      
      // Process the referral
      const result = await this.awardReferralPoints(referrerWalletAddress, newUserWalletAddress);
      
      if (result.success) {
        // Update referral count for referrer
        await this.updateReferralCount(referrerWalletAddress);
        
        // Mark new user as having been referred
        await dbService.updateUserData(newUserWalletAddress, {
          hasBeenReferred: true,
          referredBy: referrerWalletAddress
        });
        
        return {
          valid: true,
          referrerWalletAddress,
          pointsAwarded: result.points
        };
      }
      
      return { valid: false };
      */
    } catch (error) {
      console.error('Error validating referral code:', error);
      return { valid: false };
    }
  }
  
  // Update points directly (for admin or special operations)
  public async updatePoints(walletAddress: string, newPoints: number): Promise<boolean> {
    try {
      const userData = await this.getUserData(walletAddress);
      
      if (!userData) {
        return false;
      }
      
      // Update user data with new points
      await dbService.updateUserData(walletAddress, {
        points: newPoints
      });
      
      // Update cache
      this.userPointsCache[walletAddress] = {
        ...this.userPointsCache[walletAddress] || {},
        points: newPoints,
        lastUpdate: new Date()
      };
      
      // Emit event for UI updates
      this.eventEmitter.emit('points-updated', {
        walletAddress,
        points: newPoints
      });
      
      return true;
    } catch (error) {
      console.error('Error updating points directly:', error);
      return false;
    }
  }
  
  // Claim points (convert to rewards or tokens)
  public async claimPoints(walletAddress: string, amount: number): Promise<boolean> {
    try {
      const userData = await this.getUserData(walletAddress);
      
      if (!userData) {
        return false;
      }
      
      // Make sure user has enough points
      if (userData.points < amount) {
        return false;
      }
      
      // Calculate new points value
      const newPoints = userData.points - amount;
      
      // Create a transaction record
      const transaction: PointTransaction = {
        walletAddress,
        amount: -amount,
        operation: 'spend',
        source: 'purchase',
        timestamp: new Date(),
        metadata: {
          reason: 'point_claim',
          previousBalance: userData.points,
          newBalance: newPoints
        }
      };
      
      // Add transaction to history
      this.addTransaction(transaction);
      
      // Update user data with new points
      await dbService.updateUserData(walletAddress, {
        points: newPoints,
        claimedPoints: (userData.claimedPoints || 0) + amount
      });
      
      // Update cache
      this.userPointsCache[walletAddress] = {
        ...this.userPointsCache[walletAddress] || {},
        points: newPoints,
        lastUpdate: new Date()
      };
      
      // Emit events for UI updates
      this.eventEmitter.emit('points-claimed', {
        walletAddress,
        amount,
        newBalance: newPoints
      });
      
      return true;
    } catch (error) {
      console.error('Error claiming points:', error);
      return false;
    }
  }
}

// Export singleton instance
export const pointsManager = PointsManager.instance; 