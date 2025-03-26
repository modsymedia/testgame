import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/clientPromise';
import { HourlyPool, RewardPool, UserReward } from '@/lib/models';
import { 
  calculateHoldingMultiplier, 
  calculateWeightedPoints,
  calculateUserSolReward
} from '@/lib/utils';

// Define types for the collections to help with TypeScript
interface RewardPoolsCollection {
  findOne: (filter: any) => Promise<any>;
  insertOne: (doc: any) => Promise<any>;
  updateOne: (filter: any, update: any) => Promise<any>;
}

interface UsersCollection {
  findOne: (filter: any) => Promise<any>;
  updateOne: (filter: any, update: any) => Promise<any>;
}

interface UserRewardsCollection {
  findOne: (filter: any) => Promise<any>;
  insertOne: (doc: any) => Promise<any>;
  updateOne: (filter: any, update: any) => Promise<any>;
  find: (filter: any) => Promise<{
    sort: (sortSpec: any) => any;
    limit: (n: number) => any;
    toArray: () => Promise<any[]>;
  }>;
}

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
    const client = await clientPromise;
    
    // Get the collections with appropriate type assertions
    const rewardPoolsCollection = client.collection('rewardPools') as unknown as RewardPoolsCollection;
    const usersCollection = client.collection('users') as unknown as UsersCollection;
    const userRewardsCollection = client.collection('userRewards') as unknown as UserRewardsCollection;
    
    // GET: Get user rewards or reward pool info
    if (req.method === 'GET') {
      const { walletAddress, poolInfo } = req.query;
      
      // If poolInfo is requested, return current reward pool info
      if (poolInfo === 'true') {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        // Get current day's reward pool
        let currentPool = await rewardPoolsCollection.findOne({ date: today });
        
        if (!currentPool) {
          // Return empty pool data if no pool exists for today
          return res.status(200).json({
            success: true,
            poolExists: false,
            date: today,
            totalDailyVolume: 0,
            totalDailyRewards: 0,
            currentHour: now.getHours(),
            currentHourPool: {
              hour: now.getHours(),
              poolAmount: 0,
              distributedAmount: 0,
              participants: 0,
              status: 'pending'
            }
          });
        }
        
        // Return pool information
        const currentHour = now.getHours();
        const currentHourPool = currentPool.hourlyPools.find((pool: HourlyPool) => pool.hour === currentHour) || {
          hour: currentHour,
          poolAmount: 0,
          distributedAmount: 0,
          participants: 0,
          status: 'pending'
        };
        
        return res.status(200).json({
          success: true,
          poolExists: true,
          date: currentPool.date,
          totalDailyVolume: currentPool.totalDailyVolume,
          totalDailyRewards: currentPool.totalDailyRewards,
          currentHour,
          currentHourPool
        });
      }
      
      // If walletAddress is provided, return user's rewards
      if (walletAddress) {
        // Get user data
        const user = await usersCollection.findOne({ walletAddress });
        
        if (!user) {
          return res.status(404).json({ success: false, error: 'User not found' });
        }
        
        // Get unclaimed rewards
        const unclaimedRewardsCursor = await userRewardsCollection.find({ walletAddress, claimed: false });
        const unclaimedRewards = await unclaimedRewardsCursor.toArray();
        
        // Calculate total unclaimed amount
        const totalUnclaimed = unclaimedRewards.reduce(
          (total: number, reward: any) => total + (reward.amount || 0), 
          0
        );
        
        // Get recent claimed rewards (last 10)
        const recentClaimedCursor = await userRewardsCollection.find({ walletAddress, claimed: true });
        const recentClaimedSorted = await recentClaimedCursor
          .sort({ claimTimestamp: -1 })
          .limit(10)
          .toArray();
        
        // Return user rewards information
        return res.status(200).json({
          success: true,
          walletAddress,
          tokenBalance: user.tokenBalance || 0,
          holdingMultiplier: calculateHoldingMultiplier(user.tokenBalance || 0),
          totalUnclaimed,
          unclaimedRewards,
          recentClaimed: recentClaimedSorted
        });
      }
      
      return res.status(400).json({ success: false, error: 'Missing required parameters' });
    }
    
    // POST: Process participation in current hour's reward pool
    if (req.method === 'POST') {
      const { walletAddress, basePoints, tokenBalance } = req.body;
      
      if (!walletAddress || typeof basePoints !== 'number') {
        return res.status(400).json({ 
          success: false, 
          error: 'Wallet address and base points are required' 
        });
      }
      
      // Get user data
      const user = await usersCollection.findOne({ walletAddress });
      
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      // Get or update tokenBalance if provided
      const currentTokenBalance = tokenBalance !== undefined ? tokenBalance : (user.tokenBalance || 0);
      
      // If tokenBalance was provided, update the user record
      if (tokenBalance !== undefined) {
        await usersCollection.updateOne(
          { walletAddress },
          { $set: { tokenBalance: currentTokenBalance } }
        );
      }
      
      // Calculate user's weighted points based on token holdings
      const holdingMultiplier = calculateHoldingMultiplier(currentTokenBalance);
      const weightedPoints = calculateWeightedPoints(basePoints, currentTokenBalance);
      
      // Get current hour's reward pool
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const currentHour = now.getHours();
      
      // Get or create current day's reward pool
      let currentPool = await rewardPoolsCollection.findOne({ date: today });
      
      // If no pool exists for today, return an informative response
      if (!currentPool) {
        return res.status(200).json({
          success: false,
          error: 'No reward pool available for today',
          message: 'SOL rewards are not active yet or no trading volume today',
          tokenBalance: currentTokenBalance,
          holdingMultiplier,
          basePoints,
          weightedPoints
        });
      }
      
      // Find current hour's pool
      const hourlyPoolIndex = currentPool.hourlyPools.findIndex((pool: HourlyPool) => pool.hour === currentHour);
      
      // If hourly pool not found or not active, return an error
      if (hourlyPoolIndex === -1 || currentPool.hourlyPools[hourlyPoolIndex].status !== 'active') {
        return res.status(200).json({
          success: false,
          error: 'Current hour pool not active',
          message: hourlyPoolIndex === -1 ? 'Pool for this hour not found' : 'Pool is not in active state',
          tokenBalance: currentTokenBalance,
          holdingMultiplier,
          basePoints,
          weightedPoints
        });
      }
      
      // Check if user already participated in this hour's pool
      const existingParticipation = await userRewardsCollection.findOne({
        walletAddress,
        poolDate: today,
        poolHour: currentHour
      });
      
      if (existingParticipation) {
        return res.status(200).json({
          success: false,
          error: 'Already participated',
          message: 'You have already participated in this hour\'s reward pool',
          existingReward: existingParticipation
        });
      }
      
      // Record user's participation (will calculate actual reward amount later in batch process)
      const userReward: UserReward = {
        walletAddress,
        amount: 0, // Will be calculated in batch process
        timestamp: now,
        claimed: false,
        poolDate: today,
        poolHour: currentHour,
        multiplier: holdingMultiplier,
        basePoints,
        weightedPoints
      };
      
      await userRewardsCollection.insertOne(userReward);
      
      // Update hourly pool participants count
      currentPool.hourlyPools[hourlyPoolIndex].participants++;
      
      await rewardPoolsCollection.updateOne(
        { date: today },
        { 
          $set: { [`hourlyPools.${hourlyPoolIndex}.participants`]: currentPool.hourlyPools[hourlyPoolIndex].participants }
        }
      );
      
      // Return success
      return res.status(200).json({
        success: true,
        message: 'Successfully recorded participation in reward pool',
        walletAddress,
        tokenBalance: currentTokenBalance,
        holdingMultiplier,
        basePoints,
        weightedPoints,
        currentHour,
        status: 'pending'
      });
    }
    
    // PUT: Claim rewards
    if (req.method === 'PUT') {
      const { walletAddress, claim } = req.body;
      
      if (!walletAddress || !claim) {
        return res.status(400).json({ 
          success: false, 
          error: 'Wallet address and claim operation are required' 
        });
      }
      
      // Get user data
      const user = await usersCollection.findOne({ walletAddress });
      
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      // If claiming rewards
      if (claim === 'rewards') {
        // Get unclaimed rewards
        const unclaimedRewardsCursor = await userRewardsCollection.find({ 
          walletAddress, 
          claimed: false,
          amount: { $gt: 0 } // Only claim rewards that have an amount greater than 0
        });
        const unclaimedRewards = await unclaimedRewardsCursor.toArray();
        
        // Calculate total amount to claim
        const totalAmount = unclaimedRewards.reduce(
          (total: number, reward: any) => total + (reward.amount || 0), 
          0
        );
        
        if (totalAmount <= 0) {
          return res.status(200).json({
            success: false,
            error: 'No rewards to claim',
            message: 'You have no unclaimed rewards that can be claimed at this time'
          });
        }
        
        // Mark rewards as claimed
        const now = new Date();
        for (const reward of unclaimedRewards) {
          await userRewardsCollection.updateOne(
            { _id: reward._id },
            { 
              $set: { 
                claimed: true,
                claimTimestamp: now
              }
            }
          );
        }
        
        // Update user's token balance
        const newBalance = (user.tokenBalance || 0) + totalAmount;
        await usersCollection.updateOne(
          { walletAddress },
          { $set: { tokenBalance: newBalance } }
        );
        
        return res.status(200).json({
          success: true,
          message: 'Successfully claimed rewards',
          claimedAmount: totalAmount,
          newBalance,
          claimedRewards: unclaimedRewards.length
        });
      }
      
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid claim operation'
      });
    }
    
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('SOL Rewards API error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
} 