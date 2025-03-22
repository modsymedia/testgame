import { LeaderboardEntry } from './models';

/**
 * Centralized mock data for leaderboard to ensure consistency
 * across different parts of the application
 */
export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { walletAddress: '8zJ91ufGPmxrJvVyPEW4CNQciLkzCVPVEZX9LovT9i6S', username: 'CryptoWhale', score: 9850, rank: 1 },
  { walletAddress: 'EJwZgeZrdC8TXTQbQBoL6bfuAnFUUy1PVCMB4DYPzVaS', username: 'SolanaQueen', score: 8720, rank: 2 },
  { walletAddress: '2xnyzLVZVfjtXRXgXYuMj9AR5BygjxYKVKAaQ4pqZhPC', username: 'NFTKing', score: 7645, rank: 3 },
  { walletAddress: '5Bf8iYXqMT3V8289JmyVCDCJJRNfPzERxRnHiwjQ6tha', username: 'BlockchainNinja', score: 6230, rank: 4 },
  { walletAddress: 'Gq8KNmX4jfM3CPwkwwPQXdembCTBdBFZnZ4GhHKqQHSw', username: 'MoonShooter', score: 5890, rank: 5 },
  { walletAddress: 'AX3iM2BK4tN9SVS8NMwXtM2cEktiJkY9D91D9zPVGNjB', username: 'SolGamer', score: 4750, rank: 6 },
  { walletAddress: '7LvFzto5H9v5yvD84HW8RgdZP3hgDTtGLiRDBwKniedK', username: 'Satoshi2023', score: 3980, rank: 7 },
  { walletAddress: 'DaBL4Lx3r6a1CKAaJMxNsGcZcKiHL7WJUNWoBxzDtJcS', username: 'CryptoPunk', score: 3540, rank: 8 },
  { walletAddress: '9MqQDRvMZwrPAvYk8QoAgD9uttRBB9fHz9GZ5HPeAcXJ', username: 'TokenMaster', score: 2870, rank: 9 },
  { walletAddress: '3rTD7kMTyJjYLQfu6rKiN94jEXNfD7USKDmQzYW7hsXa', username: 'AlphaHunter', score: 2340, rank: 10 },
  { walletAddress: 'GH6NctkRUwtsLTqGbq3LYHxCiRvP1eGz3wYVWa5YH2YV', username: 'Web3Developer', score: 1950, rank: 11 },
  { walletAddress: 'BWh85iNST8bMgSAkZ3Jsr4cYj9W9KfNxwT4m6VzCnKgj', username: 'MetaverseExplorer', score: 1780, rank: 12 },
  { walletAddress: 'J2vGa8N9gCBGcRV3VR3WNQsN6MYL9wBkRz5uTVs8D6To', username: 'DAOBuilder', score: 1520, rank: 13 },
  { walletAddress: 'EdEM1ET6V6Vi3uWpK6Xvwgj6HJKLx3GLnXnJwRXf3VVC', username: 'DeFiWizard', score: 1340, rank: 14 },
  { walletAddress: 'FWzeZ5j6PUKvNTXRp9QtsQeanQ5UBD8K85ZKMQjRXytA', username: 'TokenWhisperer', score: 1120, rank: 15 }
];

/**
 * Sample user data for database seeding
 * Includes additional fields needed for the database
 */
export const SAMPLE_USERS = MOCK_LEADERBOARD.map(entry => ({
  walletAddress: entry.walletAddress,
  username: entry.username,
  score: entry.score,
  gamesPlayed: Math.floor(entry.score / 250), // Approximate games played based on score
  lastPlayed: new Date(),
  createdAt: new Date()
})); 