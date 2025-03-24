import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';
import { User, PetState } from '@/lib/models';
import { 
  calculateHourlyPoints, 
  calculateQualityMultiplier,
  calculateStreakMultiplier,
  calculateDailyPointsCap,
  calculateTotalPointsCap
} from '@/lib/utils';
import { ObjectId, Document } from 'mongodb';
import crypto from 'crypto';

// Base rate for points earning (10 points per hour)
const BASE_RATE = 10;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('username:password')) {
      return res.status(200).json({ 
        success: false, 
        error: 'MongoDB not properly configured',
        source: 'config'
      });
    }
    
    const client = await clientPromise;
    const db = client.db('Cluster0');
    const collection = db.collection('users');
    
    // GET: Retrieve user's points
    if (req.method === 'GET') {
      const { walletAddress } = req.query;
      
      if (!walletAddress) {
        return res.status(400).json({ success: false, error: 'Wallet address is required' });
      }
      
      const user = await collection.findOne({ walletAddress });
      
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      // Return user points information
      return res.status(200).json({
        success: true,
        points: user.points || 0,
        dailyPoints: user.dailyPoints || 0,
        dailyCap: calculateDailyPointsCap(user.daysActive || 0),
        totalCap: calculateTotalPointsCap(user.referralCount || 0),
        daysActive: user.daysActive || 0,
        consecutiveDays: user.consecutiveDays || 0,
        referralCode: user.referralCode || '',
        referralCount: user.referralCount || 0,
        referralPoints: user.referralPoints || 0
      });
    }
    
    // POST: Update points based on pet care
    if (req.method === 'POST') {
      const { walletAddress, petState } = req.body;
      
      if (!walletAddress || !petState) {
        return res.status(400).json({ 
          success: false, 
          error: 'Wallet address and pet state are required' 
        });
      }
      
      // Find or initialize user
      let user = await collection.findOne({ walletAddress });
      const now = new Date();
      
      if (!user) {
        // Create new user with referral code
        const referralCode = crypto.randomBytes(4).toString('hex');
        
        const newUser: Document = {
          walletAddress,
          score: 0,
          points: 0,
          dailyPoints: 0,
          gamesPlayed: 0,
          lastPlayed: now,
          createdAt: now,
          lastPointsUpdate: now,
          daysActive: 1,
          consecutiveDays: 1,
          referralCode,
          referralCount: 0,
          referralPoints: 0
        };
        
        // Check if user was referred
        if (req.body.referralCode && req.body.referralCode !== referralCode) {
          const referrer = await collection.findOne({ referralCode: req.body.referralCode });
          
          if (referrer) {
            newUser.referredBy = referrer.walletAddress;
          }
        }
        
        await collection.insertOne(newUser);
        user = await collection.findOne({ walletAddress });
        
        if (!user) {
          return res.status(500).json({ 
            success: false, 
            error: 'Failed to create user'
          });
        }
      } else {
        // Check for daily login streak
        const lastUpdate = user.lastPointsUpdate || user.createdAt;
        const daysSinceLastUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
        
        // If it's been more than a day but less than two days, increase consecutive days
        if (daysSinceLastUpdate === 1) {
          user.consecutiveDays = (user.consecutiveDays || 0) + 1;
          user.daysActive = (user.daysActive || 0) + 1;
        } 
        // If it's been more than 2 days, reset consecutive days
        else if (daysSinceLastUpdate > 1) {
          user.consecutiveDays = 1;
          user.daysActive = (user.daysActive || 0) + 1;
        }
        
        // If it's a new day, reset daily points
        if (daysSinceLastUpdate >= 1 || 
            lastUpdate.getDate() !== now.getDate() || 
            lastUpdate.getMonth() !== now.getMonth() || 
            lastUpdate.getFullYear() !== now.getFullYear()) {
          user.dailyPoints = 0;
        }
      }
      
      // Calculate points based on pet state
      const pointsState: PetState = {
        health: Math.max(0, Math.min(100, petState.health || 0)),
        happiness: Math.max(0, Math.min(100, petState.happiness || 0)),
        hunger: Math.max(0, Math.min(100, petState.hunger || 0)),
        cleanliness: Math.max(0, Math.min(100, petState.cleanliness || 0)),
        lastStateUpdate: now,
        qualityScore: 0 // Will be calculated below
      };
      
      // Calculate quality score
      pointsState.qualityScore = Math.floor(calculateQualityMultiplier(pointsState) * 100);
      
      // Calculate hourly points
      const hourlyPoints = Math.floor(
        calculateHourlyPoints(BASE_RATE, pointsState, user.consecutiveDays || 0)
      );
      
      // Calculate time since last update in hours (minimum 0.1 hours = 6 minutes)
      const hoursSinceLastUpdate = Math.max(
        0.1, 
        (now.getTime() - (user.lastPointsUpdate?.getTime() || user.createdAt.getTime())) / (1000 * 60 * 60)
      );
      
      // Calculate points earned since last update
      const pointsEarned = Math.floor(hourlyPoints * hoursSinceLastUpdate);
      
      // Apply daily cap
      const dailyCap = calculateDailyPointsCap(user.daysActive || 0);
      const newDailyPoints = (user.dailyPoints || 0) + pointsEarned;
      const cappedDailyPoints = Math.min(newDailyPoints, dailyCap);
      const actualPointsEarned = cappedDailyPoints - (user.dailyPoints || 0);
      
      // Apply total cap
      const totalCap = calculateTotalPointsCap(user.referralCount || 0);
      const newTotalPoints = (user.points || 0) + actualPointsEarned;
      const cappedTotalPoints = Math.min(newTotalPoints, totalCap);
      
      // Update user
      await collection.updateOne(
        { walletAddress },
        { 
          $set: { 
            lastPointsUpdate: now,
            petState: pointsState,
            dailyPoints: cappedDailyPoints,
            points: cappedTotalPoints,
            consecutiveDays: user.consecutiveDays,
            daysActive: user.daysActive
          }
        }
      );
      
      // Update referrer if this user was referred and earning their first 100 points
      if (user.referredBy && (user.points || 0) < 100 && cappedTotalPoints >= 100) {
        // Give 10% of points to referrer (up to 1000 points per referral)
        const referralBonus = Math.min(1000, Math.floor(cappedTotalPoints * 0.1));
        
        await collection.updateOne(
          { walletAddress: user.referredBy },
          {
            $inc: { 
              referralPoints: referralBonus,
              points: referralBonus
            }
          }
        );
      }
      
      // Return updated points info
      return res.status(200).json({
        success: true,
        points: cappedTotalPoints,
        dailyPoints: cappedDailyPoints,
        pointsEarned: actualPointsEarned,
        dailyCap,
        totalCap,
        hourlyRate: hourlyPoints,
        qualityMultiplier: calculateQualityMultiplier(pointsState),
        streakMultiplier: calculateStreakMultiplier(user.consecutiveDays || 0),
        daysActive: user.daysActive,
        consecutiveDays: user.consecutiveDays,
        qualityScore: pointsState.qualityScore
      });
    }
    
    // Handle unsupported methods
    return res.status(405).json({ success: false, error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Points API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
} 