import { ObjectId } from 'mongodb';

export interface User {
  _id?: ObjectId;
  walletAddress: string;
  username?: string;
  score: number;
  gamesPlayed: number;
  lastPlayed: Date;
  createdAt: Date;
}

export interface LeaderboardEntry {
  walletAddress: string;
  username?: string;
  score: number;
  rank: number;
}

export interface GameResult {
  walletAddress: string;
  score: number;
  timestamp: Date;
} 