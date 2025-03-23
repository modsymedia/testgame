import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { LeaderboardEntry, PointsLeaderboard } from '@/lib/models';
import { MOCK_LEADERBOARD } from '@/lib/mock-data';

// Default leaderboard size
const DEFAULT_LIMIT = 10;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  
  try {
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('username:password')) {
      // Use mock data for development or if MongoDB is not configured
      const mockPointsLeaderboard: PointsLeaderboard = {
        allTime: MOCK_LEADERBOARD.map((entry, index) => ({
          ...entry,
          points: 10000 - (index * 500),
        })),
        weekly: MOCK_LEADERBOARD.map((entry, index) => ({
          ...entry,
          points: 2000 - (index * 100),
        })),
        daily: MOCK_LEADERBOARD.map((entry, index) => ({
          ...entry,
          points: 500 - (index * 25),
        })),
        referrals: MOCK_LEADERBOARD.map((entry, index) => ({
          ...entry,
          points: 2500 - (index * 150),
        })),
      };
      
      return res.status(200).json({ 
        leaderboard: mockPointsLeaderboard, 
        source: 'mock'
      });
    }
    
    // Get the requested leaderboard limit
    const limit = Math.min(50, parseInt(req.query.limit as string) || DEFAULT_LIMIT);
    
    // Connect to MongoDB
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || 'gochi-game');
    const collection = db.collection('users');
    
    // Get current date information for daily and weekly queries
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate start of the week (considering Monday as the first day)
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff);
    
    // Get all-time leaderboard (total points)
    const allTimeUsers = await collection
      .find({})
      .sort({ points: -1 })
      .limit(limit)
      .toArray();
    
    // Format all-time leaderboard
    const allTime: LeaderboardEntry[] = allTimeUsers.map((user: any, index: number) => ({
      walletAddress: user.walletAddress,
      username: user.username || (user.walletAddress ? user.walletAddress.substring(0, 6) + '...' : 'Unknown'),
      score: user.score || 0,
      points: user.points || 0,
      rank: index + 1
    }));
    
    // Get weekly leaderboard
    // We need to find users who earned points this week by comparing points earned since the start of the week
    // This would require storing point history, but for now, we'll use a simplified approach
    const weeklyUsers = await collection
      .find({ lastPointsUpdate: { $gte: startOfWeek } })
      .sort({ points: -1 })
      .limit(limit)
      .toArray();
    
    // Format weekly leaderboard (simplified version)
    const weekly: LeaderboardEntry[] = weeklyUsers.map((user: any, index: number) => ({
      walletAddress: user.walletAddress,
      username: user.username || (user.walletAddress ? user.walletAddress.substring(0, 6) + '...' : 'Unknown'),
      score: user.score || 0,
      points: user.points || 0,
      rank: index + 1
    }));
    
    // Get daily leaderboard
    const dailyUsers = await collection
      .find({ lastPointsUpdate: { $gte: startOfDay } })
      .sort({ dailyPoints: -1 })
      .limit(limit)
      .toArray();
    
    // Format daily leaderboard
    const daily: LeaderboardEntry[] = dailyUsers.map((user: any, index: number) => ({
      walletAddress: user.walletAddress,
      username: user.username || (user.walletAddress ? user.walletAddress.substring(0, 6) + '...' : 'Unknown'),
      score: user.score || 0,
      points: user.dailyPoints || 0,
      rank: index + 1
    }));
    
    // Get referral leaderboard
    const referralUsers = await collection
      .find({})
      .sort({ referralCount: -1, referralPoints: -1 })
      .limit(limit)
      .toArray();
    
    // Format referral leaderboard
    const referrals: LeaderboardEntry[] = referralUsers.map((user: any, index: number) => ({
      walletAddress: user.walletAddress,
      username: user.username || (user.walletAddress ? user.walletAddress.substring(0, 6) + '...' : 'Unknown'),
      score: user.referralPoints || 0,
      points: user.referralPoints || 0,
      rank: index + 1
    }));
    
    // Combine leaderboards
    const pointsLeaderboard: PointsLeaderboard = {
      allTime,
      weekly,
      daily,
      referrals
    };
    
    return res.status(200).json({ 
      leaderboard: pointsLeaderboard,
      source: 'mongodb'
    });
    
  } catch (error) {
    console.error('Points leaderboard API error:', error);
    
    // Return mock data in case of error
    const mockPointsLeaderboard: PointsLeaderboard = {
      allTime: MOCK_LEADERBOARD.map((entry, index) => ({
        ...entry,
        points: 10000 - (index * 500),
      })),
      weekly: MOCK_LEADERBOARD.map((entry, index) => ({
        ...entry,
        points: 2000 - (index * 100),
      })),
      daily: MOCK_LEADERBOARD.map((entry, index) => ({
        ...entry,
        points: 500 - (index * 25),
      })),
      referrals: MOCK_LEADERBOARD.map((entry, index) => ({
        ...entry,
        points: 2500 - (index * 150),
      })),
    };
    
    return res.status(200).json({ 
      leaderboard: mockPointsLeaderboard,
      source: 'mock-error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
} 