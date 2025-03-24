/**
 * Reward Pool Management Script
 * 
 * This script handles:
 * 1. Creation of daily reward pools based on trading volume
 * 2. Hourly distribution of rewards to participants
 * 3. Maintenance of reward reserve fund
 * 
 * To run:
 * 1. Make sure your MongoDB connection is set in .env.local
 * 2. Run: node scripts/manage-reward-pools.js [command]
 *    - create-pool: Create a new daily pool (run once per day)
 *    - distribute-rewards: Calculate and distribute hourly rewards (run hourly)
 *    - check-status: Check current pool status
 */

require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');

// Configuration
const TAX_RATE = 0.05; // 5% tax
const RESERVE_FUND_RATE = 0.10; // 10% of taxes go to reserve fund
const MIN_REWARD_THRESHOLD = 0.001; // Minimum SOL reward (0.001 SOL)
const MAX_REWARD_PERCENT = 0.05; // Maximum 5% of pool for any single user

// Mock trading volume for development (remove in production)
// In production, this would come from an exchange API or blockchain indexer
function getMockTradingVolume() {
  // Return a random volume between $2M and $10M (in SOL at $100/SOL)
  return Math.floor(Math.random() * 8000) + 2000;
}

// Calculate token holding multiplier (0.2 to 8.0)
function calculateHoldingMultiplier(tokensHeld) {
  if (tokensHeld === 0) return 0.2;
  
  // Using the formula: min(0.2 + (TokensHeld ÷ 10,000)^0.7, 8.0)
  const multiplier = 0.2 + Math.pow(tokensHeld / 10000, 0.7);
  return Math.min(8.0, multiplier);
}

// Calculate user's weighted points
function calculateWeightedPoints(basePoints, tokensHeld) {
  return basePoints * calculateHoldingMultiplier(tokensHeld);
}

// Calculate user's SOL reward from a pool
function calculateUserSolReward(userWeightedPoints, totalWeightedPoints, hourlyPoolAmount) {
  // Calculate share of the pool
  const share = userWeightedPoints / totalWeightedPoints;
  
  // Calculate raw reward
  const rawReward = share * hourlyPoolAmount;
  
  // Apply minimum threshold and maximum cap (5% of pool)
  const maxReward = hourlyPoolAmount * MAX_REWARD_PERCENT;
  return Math.max(MIN_REWARD_THRESHOLD, Math.min(maxReward, rawReward));
}

// Create a new daily reward pool
async function createDailyPool(client) {
  const db = client.db('Cluster0');
  const rewardPoolsCollection = db.collection('rewardPools');
  const reserveFundCollection = db.collection('reserveFund');
  
  // Get today's date (without time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if pool already exists for today
  const existingPool = await rewardPoolsCollection.findOne({ date: today });
  
  if (existingPool) {
    console.log(`Pool already exists for ${today.toDateString()}`, existingPool);
    return existingPool;
  }
  
  // In production, get actual trading volume from exchange API or blockchain indexer
  // For development, use mock data
  const dailyVolume = getMockTradingVolume(); // SOL amount
  
  // Calculate daily rewards (5% of volume)
  const dailyRewards = dailyVolume * TAX_RATE;
  
  // Add to reserve fund (10% of taxes)
  const reserveAmount = dailyRewards * RESERVE_FUND_RATE;
  
  // Update reserve fund
  await reserveFundCollection.updateOne(
    { id: 'main' },
    { $inc: { balance: reserveAmount } },
    { upsert: true }
  );
  
  // Calculate distributable rewards
  const distributableRewards = dailyRewards - reserveAmount;
  
  // Create hourly pools (equal distribution for now)
  const hourlyAmount = distributableRewards / 24;
  const hourlyPools = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    poolAmount: hourlyAmount,
    distributedAmount: 0,
    participants: 0,
    status: i === new Date().getHours() ? 'active' : 'pending'
  }));
  
  // Create the pool
  const pool = {
    date: today,
    hourlyPools,
    totalDailyVolume: dailyVolume,
    totalDailyRewards: dailyRewards,
    createdAt: new Date()
  };
  
  await rewardPoolsCollection.insertOne(pool);
  
  console.log(`Created new reward pool for ${today.toDateString()}`);
  console.log(`Daily volume: ${dailyVolume} SOL`);
  console.log(`Daily rewards: ${dailyRewards} SOL`);
  console.log(`Reserve fund: ${reserveAmount} SOL`);
  console.log(`Hourly rewards: ${hourlyAmount} SOL`);
  
  return pool;
}

// Distribute rewards for the current hour
async function distributeHourlyRewards(client) {
  const db = client.db('Cluster0');
  const rewardPoolsCollection = db.collection('rewardPools');
  const userRewardsCollection = db.collection('userRewards');
  
  // Get today's date and current hour
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentHour = now.getHours();
  
  // Get current day's reward pool
  const currentPool = await rewardPoolsCollection.findOne({ date: today });
  
  if (!currentPool) {
    console.log('No reward pool found for today. Run create-pool command first.');
    return;
  }
  
  // Find current hour's pool
  const hourlyPoolIndex = currentPool.hourlyPools.findIndex(pool => pool.hour === currentHour);
  
  if (hourlyPoolIndex === -1) {
    console.log(`No pool found for hour ${currentHour}`);
    return;
  }
  
  const hourlyPool = currentPool.hourlyPools[hourlyPoolIndex];
  
  // Skip if already distributed or not active
  if (hourlyPool.status === 'distributed') {
    console.log(`Rewards for hour ${currentHour} already distributed`);
    return;
  }
  
  if (hourlyPool.status !== 'active') {
    console.log(`Pool for hour ${currentHour} is not active (status: ${hourlyPool.status})`);
    return;
  }
  
  // Get all participants for this hour
  const participants = await userRewardsCollection.find({
    poolDate: today,
    poolHour: currentHour,
    amount: 0 // Only those not yet processed
  }).toArray();
  
  console.log(`Found ${participants.length} participants for hour ${currentHour}`);
  
  if (participants.length === 0) {
    // Mark as distributed with no participants
    await rewardPoolsCollection.updateOne(
      { date: today },
      { $set: { [`hourlyPools.${hourlyPoolIndex}.status`]: 'distributed' } }
    );
    
    console.log(`No participants for hour ${currentHour}, marked as distributed`);
    return;
  }
  
  // Calculate total weighted points
  const totalWeightedPoints = participants.reduce(
    (total, participant) => total + participant.weightedPoints, 
    0
  );
  
  console.log(`Total weighted points: ${totalWeightedPoints}`);
  
  // Calculate and assign rewards
  let totalDistributed = 0;
  
  for (const participant of participants) {
    // Calculate reward
    const reward = calculateUserSolReward(
      participant.weightedPoints,
      totalWeightedPoints,
      hourlyPool.poolAmount
    );
    
    // Update user reward
    await userRewardsCollection.updateOne(
      { _id: participant._id },
      { $set: { amount: reward } }
    );
    
    totalDistributed += reward;
    
    console.log(`Awarded ${reward.toFixed(6)} SOL to ${participant.walletAddress} (${participant.weightedPoints} weighted points)`);
  }
  
  // Update pool status
  await rewardPoolsCollection.updateOne(
    { date: today },
    { 
      $set: { 
        [`hourlyPools.${hourlyPoolIndex}.status`]: 'distributed',
        [`hourlyPools.${hourlyPoolIndex}.distributedAmount`]: totalDistributed
      }
    }
  );
  
  // Mark next hour as active if it exists
  if (hourlyPoolIndex < 23) {
    await rewardPoolsCollection.updateOne(
      { date: today },
      { $set: { [`hourlyPools.${hourlyPoolIndex + 1}.status`]: 'active' } }
    );
  }
  
  console.log(`Successfully distributed ${totalDistributed.toFixed(6)} SOL to ${participants.length} participants`);
}

// Check the status of the reward pools
async function checkPoolStatus(client) {
  const db = client.db('Cluster0');
  const rewardPoolsCollection = db.collection('rewardPools');
  const reserveFundCollection = db.collection('reserveFund');
  const userRewardsCollection = db.collection('userRewards');
  
  // Get reserve fund balance
  const reserveFund = await reserveFundCollection.findOne({ id: 'main' });
  const reserveBalance = reserveFund ? reserveFund.balance : 0;
  
  console.log(`Reserve fund balance: ${reserveBalance.toFixed(6)} SOL`);
  
  // Get today's pool
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentPool = await rewardPoolsCollection.findOne({ date: today });
  
  if (!currentPool) {
    console.log('No reward pool for today');
    return;
  }
  
  console.log(`\nToday's pool (${today.toDateString()}):`);
  console.log(`Total volume: ${currentPool.totalDailyVolume.toFixed(2)} SOL`);
  console.log(`Total rewards: ${currentPool.totalDailyRewards.toFixed(6)} SOL`);
  
  // Current hour status
  const currentHour = now.getHours();
  const currentHourPool = currentPool.hourlyPools.find(pool => pool.hour === currentHour);
  
  if (currentHourPool) {
    console.log(`\nCurrent hour (${currentHour}:00):`);
    console.log(`Status: ${currentHourPool.status}`);
    console.log(`Pool amount: ${currentHourPool.poolAmount.toFixed(6)} SOL`);
    console.log(`Distributed: ${currentHourPool.distributedAmount.toFixed(6)} SOL`);
    console.log(`Participants: ${currentHourPool.participants}`);
  }
  
  // Get overall stats
  const totalParticipantsCount = await userRewardsCollection.countDocuments({
    poolDate: today
  });
  
  const totalDistributed = await userRewardsCollection.aggregate([
    { $match: { poolDate: today } },
    { $group: { _id: null, total: { $sum: '$amount' } } }
  ]).toArray();
  
  console.log(`\nStats for today:`);
  console.log(`Total participants: ${totalParticipantsCount}`);
  console.log(`Total distributed: ${totalDistributed.length > 0 ? totalDistributed[0].total.toFixed(6) : 0} SOL`);
  
  // Get hourly distribution
  console.log('\nHourly pools:');
  
  for (let i = 0; i < 24; i++) {
    const hourPool = currentPool.hourlyPools.find(pool => pool.hour === i);
    if (hourPool) {
      console.log(`Hour ${i.toString().padStart(2, '0')}:00: ${hourPool.status.padEnd(12)} ${hourPool.participants} participants, ${hourPool.distributedAmount.toFixed(6)} / ${hourPool.poolAmount.toFixed(6)} SOL`);
    }
  }
}

// Main function to run the script
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log('Please provide a command: create-pool, distribute-rewards, or check-status');
    process.exit(1);
  }
  
  // Check for MongoDB connection string
  if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('username:password')) {
    console.error('MongoDB connection string not found or using placeholder.');
    console.error('Please update your .env.local file with a valid MongoDB connection string.');
    process.exit(1);
  }
  
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB server');
    
    switch (command) {
      case 'create-pool':
        await createDailyPool(client);
        break;
      
      case 'distribute-rewards':
        await distributeHourlyRewards(client);
        break;
      
      case 'check-status':
        await checkPoolStatus(client);
        break;
      
      default:
        console.log(`Unknown command: ${command}`);
        console.log('Available commands: create-pool, distribute-rewards, check-status');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
    console.log('MongoDB connection closed');
  }
}

// Run the script
main().catch(console.error); 