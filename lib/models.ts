// Import other necessary types

export interface User {
  _id?: string;
  walletAddress: string;
  username?: string;
  score: number;
  gamesPlayed: number;
  lastPlayed: Date;
  createdAt: Date;
  // Points system additions
  points: number;
  dailyPoints: number;
  lastPointsUpdate: Date;
  daysActive: number;
  consecutiveDays: number;
  referralCode: string;
  referredBy?: string;
  referralCount: number;
  referralPoints: number;
  // Token holdings (for post-launch)
  tokenBalance?: number;
  // Multiplier for points
  multiplier?: number;
  // Interaction tracking
  lastInteractionTime?: Date;
  cooldowns?: Record<string, number>;
  recentPointGain?: number;
  lastPointGainTime?: Date;
  // Pet state metrics
  petState?: PetState;
  // Version for sync
  version?: number;
}

export interface PetState {
  health: number;
  happiness: number;
  hunger: number;
  cleanliness: number;
  energy: number;
  lastStateUpdate: Date;
  qualityScore: number; // AI-evaluated score of pet condition
  lastMessage?: string;
  lastReaction?: string;
  isDead?: boolean;
  lastInteractionTime?: Date;
  version?: number;
}

export interface LeaderboardEntry {
  walletAddress: string;
  username?: string;
  score: number;
  rank: number;
  points?: number; // For points leaderboard
}

export interface PointsLeaderboard {
  allTime: LeaderboardEntry[];
  weekly: LeaderboardEntry[];
  daily: LeaderboardEntry[];
  referrals: LeaderboardEntry[];
}

export interface GameResult {
  walletAddress: string;
  score: number;
  timestamp: Date;
}

// For post-launch SOL reward system
export interface RewardPool {
  _id?: string;
  date: Date;
  hourlyPools: HourlyPool[];
  totalDailyVolume: number;
  totalDailyRewards: number;
}

export interface HourlyPool {
  hour: number;
  poolAmount: number;
  distributedAmount: number;
  participants: number;
  status: 'pending' | 'active' | 'distributed';
}

export interface UserReward {
  _id?: string;
  walletAddress: string;
  amount: number;
  timestamp: Date;
  claimed: boolean;
  claimTimestamp?: Date;
  poolDate: Date;
  poolHour: number;
  multiplier: number;
  basePoints: number;
  weightedPoints: number;
}

// New interfaces for improved data synchronization
export interface GameSession {
  walletAddress: string;
  sessionId: string;
  startedAt: Date;
  lastActive: Date;
  gameState: any;
  isActive: boolean;
  version: number;
}

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

export type SyncOperation = 'create' | 'update' | 'delete';

export interface SyncRecord {
  walletAddress: string;
  operation: SyncOperation;
  entityType: string;
  entityId: string;
  timestamp: Date;
  clientVersion: number;
  serverVersion: number;
  conflict: boolean;
  resolution?: string;
}

export interface DataChangeEvent {
  entityType: string;
  entityId: string;
  operation: SyncOperation;
  data: any;
} 