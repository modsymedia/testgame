import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { User, PetState } from './models';

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'game.db');

// Singleton DB connection
let _db: Database | null = null;

/**
 * Get a database connection, creating/initializing it if needed
 */
async function getDb(): Promise<Database> {
  if (!_db) {
    // Initialize database
    _db = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });
    
    // Enable foreign keys
    await _db.exec('PRAGMA foreign_keys = ON');
    
    // Create tables if they don't exist
    await initDb(_db);
  }
  
  return _db;
}

/**
 * Initialize the database schema
 */
async function initDb(db: Database): Promise<void> {
  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      walletAddress TEXT UNIQUE NOT NULL,
      username TEXT,
      score INTEGER DEFAULT 0,
      gamesPlayed INTEGER DEFAULT 0,
      lastPlayed TEXT,
      createdAt TEXT,
      points INTEGER DEFAULT 0,
      dailyPoints INTEGER DEFAULT 0,
      lastPointsUpdate TEXT,
      daysActive INTEGER DEFAULT 0,
      consecutiveDays INTEGER DEFAULT 0,
      referralCode TEXT UNIQUE,
      referredBy TEXT,
      referralCount INTEGER DEFAULT 0,
      referralPoints INTEGER DEFAULT 0,
      tokenBalance INTEGER DEFAULT 0
    )
  `);
  
  // Pet states table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS pet_states (
      walletAddress TEXT PRIMARY KEY,
      health INTEGER DEFAULT 100,
      happiness INTEGER DEFAULT 100,
      hunger INTEGER DEFAULT 100,
      cleanliness INTEGER DEFAULT 100,
      lastStateUpdate TEXT,
      qualityScore INTEGER DEFAULT 0,
      FOREIGN KEY (walletAddress) REFERENCES users (walletAddress) ON DELETE CASCADE
    )
  `);
  
  // Game results table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS game_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      walletAddress TEXT NOT NULL,
      score INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (walletAddress) REFERENCES users (walletAddress) ON DELETE CASCADE
    )
  `);
  
  // Reward pools table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS reward_pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT UNIQUE NOT NULL,
      totalDailyVolume INTEGER DEFAULT 0,
      totalDailyRewards INTEGER DEFAULT 0
    )
  `);
  
  // Hourly pools table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS hourly_pools (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      rewardPoolId INTEGER NOT NULL,
      hour INTEGER NOT NULL,
      poolAmount INTEGER DEFAULT 0,
      distributedAmount INTEGER DEFAULT 0,
      participants INTEGER DEFAULT 0,
      status TEXT DEFAULT 'pending',
      FOREIGN KEY (rewardPoolId) REFERENCES reward_pools (id) ON DELETE CASCADE,
      UNIQUE(rewardPoolId, hour)
    )
  `);
  
  // User rewards table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_rewards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      walletAddress TEXT NOT NULL,
      amount INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      claimed BOOLEAN DEFAULT 0,
      claimTimestamp TEXT,
      poolDate TEXT NOT NULL,
      poolHour INTEGER NOT NULL,
      multiplier REAL DEFAULT 1.0,
      basePoints INTEGER NOT NULL,
      weightedPoints INTEGER NOT NULL,
      FOREIGN KEY (walletAddress) REFERENCES users (walletAddress) ON DELETE CASCADE
    )
  `);
}

/**
 * Convert DB row to User object
 */
function rowToUser(row: any): User {
  return {
    walletAddress: row.walletAddress,
    username: row.username,
    score: row.score,
    gamesPlayed: row.gamesPlayed,
    lastPlayed: new Date(row.lastPlayed),
    createdAt: new Date(row.createdAt),
    points: row.points,
    dailyPoints: row.dailyPoints,
    lastPointsUpdate: row.lastPointsUpdate ? new Date(row.lastPointsUpdate) : new Date(),
    daysActive: row.daysActive,
    consecutiveDays: row.consecutiveDays,
    referralCode: row.referralCode,
    referredBy: row.referredBy,
    referralCount: row.referralCount,
    referralPoints: row.referralPoints,
    tokenBalance: row.tokenBalance
  };
}

// User API
const users = {
  findOne: async (filter: any) => {
    const db = await getDb();
    let user;
    
    if (filter.walletAddress) {
      user = await db.get('SELECT * FROM users WHERE walletAddress = ?', filter.walletAddress);
    } else if (filter.referralCode) {
      user = await db.get('SELECT * FROM users WHERE referralCode = ?', filter.referralCode);
    } else {
      return null;
    }
    
    if (!user) return null;
    
    // Get pet state
    const petState = await db.get('SELECT * FROM pet_states WHERE walletAddress = ?', user.walletAddress);
    
    if (petState) {
      user.petState = {
        health: petState.health,
        happiness: petState.happiness,
        hunger: petState.hunger,
        cleanliness: petState.cleanliness,
        lastStateUpdate: new Date(petState.lastStateUpdate),
        qualityScore: petState.qualityScore
      };
    }
    
    return rowToUser(user);
  },
  
  insertOne: async (doc: any) => {
    const db = await getDb();
    
    const insertData = {
      walletAddress: doc.walletAddress,
      username: doc.username,
      score: doc.score || 0,
      gamesPlayed: doc.gamesPlayed || 0,
      lastPlayed: doc.lastPlayed ? doc.lastPlayed.toISOString() : new Date().toISOString(),
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
      points: doc.points || 0,
      dailyPoints: doc.dailyPoints || 0,
      lastPointsUpdate: doc.lastPointsUpdate ? doc.lastPointsUpdate.toISOString() : new Date().toISOString(),
      daysActive: doc.daysActive || 0,
      consecutiveDays: doc.consecutiveDays || 0,
      referralCode: doc.referralCode,
      referredBy: doc.referredBy,
      referralCount: doc.referralCount || 0,
      referralPoints: doc.referralPoints || 0,
      tokenBalance: doc.tokenBalance || 0
    };
    
    const result = await db.run(`
      INSERT INTO users (
        walletAddress, username, score, gamesPlayed, lastPlayed, createdAt,
        points, dailyPoints, lastPointsUpdate, daysActive, consecutiveDays,
        referralCode, referredBy, referralCount, referralPoints, tokenBalance
      ) VALUES (
        $walletAddress, $username, $score, $gamesPlayed, $lastPlayed, $createdAt,
        $points, $dailyPoints, $lastPointsUpdate, $daysActive, $consecutiveDays,
        $referralCode, $referredBy, $referralCount, $referralPoints, $tokenBalance
      )
    `, insertData);
    
    // Add pet state if provided
    if (doc.petState) {
      await db.run(`
        INSERT INTO pet_states (
          walletAddress, health, happiness, hunger, cleanliness, lastStateUpdate, qualityScore
        ) VALUES (
          $walletAddress, $health, $happiness, $hunger, $cleanliness, $lastStateUpdate, $qualityScore
        )
      `, {
        walletAddress: doc.walletAddress,
        health: doc.petState.health || 100,
        happiness: doc.petState.happiness || 100,
        hunger: doc.petState.hunger || 100,
        cleanliness: doc.petState.cleanliness || 100,
        lastStateUpdate: doc.petState.lastStateUpdate ? doc.petState.lastStateUpdate.toISOString() : new Date().toISOString(),
        qualityScore: doc.petState.qualityScore || 0
      });
    }
    
    return { insertedId: result.lastID };
  },
  
  updateOne: async (filter: any, update: any) => {
    const db = await getDb();
    
    if (!filter.walletAddress) return { modifiedCount: 0, upsertedCount: 0 };
    
    // Handle $set operator (for MongoDB compatibility)
    const updateData = update.$set || update;
    
    // Build SQL update statement dynamically
    const fields = [];
    const params: any = { walletAddress: filter.walletAddress };
    
    // Process each key in updateData
    for (const key in updateData) {
      // Handle petState separately
      if (key === 'petState') continue;
      
      fields.push(`${key} = $${key}`);
      
      // Convert dates to ISO strings
      if (updateData[key] instanceof Date) {
        params[key] = updateData[key].toISOString();
      } else {
        params[key] = updateData[key];
      }
    }
    
    let modifiedCount = 0;
    
    if (fields.length > 0) {
      const updateSql = `UPDATE users SET ${fields.join(', ')} WHERE walletAddress = $walletAddress`;
      const result = await db.run(updateSql, params);
      modifiedCount = result.changes || 0;
      
      // Handle petState update
      if (updateData.petState) {
        const petState = updateData.petState;
        
        // Check if pet state exists
        const existingPet = await db.get('SELECT 1 FROM pet_states WHERE walletAddress = ?', filter.walletAddress);
        
        if (existingPet) {
          // Update existing pet state
          const result = await db.run(`
            UPDATE pet_states SET
              health = $health,
              happiness = $happiness,
              hunger = $hunger,
              cleanliness = $cleanliness,
              lastStateUpdate = $lastStateUpdate,
              qualityScore = $qualityScore
            WHERE walletAddress = $walletAddress
          `, {
            walletAddress: filter.walletAddress,
            health: petState.health,
            happiness: petState.happiness,
            hunger: petState.hunger,
            cleanliness: petState.cleanliness,
            lastStateUpdate: petState.lastStateUpdate.toISOString(),
            qualityScore: petState.qualityScore
          });
          
          if (result.changes) modifiedCount++;
        } else {
          // Insert new pet state
          await db.run(`
            INSERT INTO pet_states (
              walletAddress, health, happiness, hunger, cleanliness, lastStateUpdate, qualityScore
            ) VALUES (
              $walletAddress, $health, $happiness, $hunger, $cleanliness, $lastStateUpdate, $qualityScore
            )
          `, {
            walletAddress: filter.walletAddress,
            health: petState.health,
            happiness: petState.happiness,
            hunger: petState.hunger,
            cleanliness: petState.cleanliness,
            lastStateUpdate: petState.lastStateUpdate.toISOString(),
            qualityScore: petState.qualityScore
          });
          
          modifiedCount++;
        }
      }
    }
    
    return { modifiedCount, upsertedCount: 0 };
  },
  
  updateWithInc: async (filter: any, update: any) => {
    const db = await getDb();
    
    if (!filter.walletAddress || !update.$inc) return { modifiedCount: 0 };
    
    // First get current values
    const user = await db.get('SELECT * FROM users WHERE walletAddress = ?', filter.walletAddress);
    if (!user) return { modifiedCount: 0 };
    
    // Build update statement
    const fields = [];
    const params: any = { walletAddress: filter.walletAddress };
    
    for (const key in update.$inc) {
      const newValue = (user[key] || 0) + update.$inc[key];
      fields.push(`${key} = $${key}`);
      params[key] = newValue;
    }
    
    if (fields.length > 0) {
      const updateSql = `UPDATE users SET ${fields.join(', ')} WHERE walletAddress = $walletAddress`;
      const result = await db.run(updateSql, params);
      
      return { modifiedCount: result.changes || 0 };
    }
    
    return { modifiedCount: 0 };
  },
  
  find: async (filter: any = {}) => {
    const db = await getDb();
    
    // Build where clause
    const clauses = [];
    const params: any = {};
    
    if (filter.walletAddress) {
      clauses.push('walletAddress = $walletAddress');
      params.walletAddress = filter.walletAddress;
    }
    
    if (filter.lastPointsUpdate && filter.lastPointsUpdate.$gte) {
      clauses.push('lastPointsUpdate >= $minPointsUpdate');
      params.minPointsUpdate = filter.lastPointsUpdate.$gte.toISOString();
    }
    
    // Construct query
    let query = 'SELECT * FROM users';
    if (clauses.length > 0) {
      query += ' WHERE ' + clauses.join(' AND ');
    }
    
    // Create a MongoDB-like cursor object
    const cursor = {
      _query: query,
      _params: { ...params },
      _orderBy: '',
      _limit: '',
      
      sort: (sortSpec: any) => {
        let orderBy = '';
        for (const field in sortSpec) {
          const direction = sortSpec[field] === -1 ? 'DESC' : 'ASC';
          orderBy += (orderBy ? ', ' : ' ORDER BY ') + field + ' ' + direction;
        }
        
        cursor._orderBy = orderBy;
        return cursor;
      },
      
      limit: (n: number) => {
        cursor._limit = ` LIMIT ${n}`;
        return cursor;
      },
      
      toArray: async () => {
        const finalQuery = cursor._query + cursor._orderBy + cursor._limit;
        const rows = await db.all(finalQuery, cursor._params);
        
        // Convert rows to User objects
        return Promise.all(rows.map(async (row) => {
          const user = rowToUser(row);
          
          // Get pet state
          const petState = await db.get('SELECT * FROM pet_states WHERE walletAddress = ?', row.walletAddress);
          if (petState) {
            user.petState = {
              health: petState.health,
              happiness: petState.happiness,
              hunger: petState.hunger,
              cleanliness: petState.cleanliness,
              lastStateUpdate: new Date(petState.lastStateUpdate),
              qualityScore: petState.qualityScore
            };
          }
          
          return user;
        }));
      }
    };
    
    return cursor;
  }
};

// Reward pools API
const rewardPools = {
  findOne: async (filter: any) => {
    const db = await getDb();
    
    if (!filter.date) return null;
    
    const dateStr = filter.date instanceof Date ? filter.date.toISOString().split('T')[0] : filter.date;
    
    const pool = await db.get('SELECT * FROM reward_pools WHERE date = ?', dateStr);
    
    if (!pool) return null;
    
    // Get hourly pools
    const hourlyPools = await db.all('SELECT * FROM hourly_pools WHERE rewardPoolId = ?', pool.id);
    
    return {
      _id: pool.id,
      date: new Date(pool.date),
      totalDailyVolume: pool.totalDailyVolume,
      totalDailyRewards: pool.totalDailyRewards,
      hourlyPools: hourlyPools.map((hp) => ({
        hour: hp.hour,
        poolAmount: hp.poolAmount,
        distributedAmount: hp.distributedAmount,
        participants: hp.participants,
        status: hp.status
      }))
    };
  },
  
  insertOne: async (doc: any) => {
    const db = await getDb();
    
    const dateStr = doc.date instanceof Date ? doc.date.toISOString().split('T')[0] : doc.date;
    
    // Insert reward pool
    const result = await db.run(`
      INSERT INTO reward_pools (date, totalDailyVolume, totalDailyRewards)
      VALUES ($date, $totalDailyVolume, $totalDailyRewards)
    `, {
      date: dateStr,
      totalDailyVolume: doc.totalDailyVolume || 0,
      totalDailyRewards: doc.totalDailyRewards || 0
    });
    
    const poolId = result.lastID;
    
    // Insert hourly pools if provided
    if (doc.hourlyPools && Array.isArray(doc.hourlyPools)) {
      for (const hp of doc.hourlyPools) {
        await db.run(`
          INSERT INTO hourly_pools (rewardPoolId, hour, poolAmount, distributedAmount, participants, status)
          VALUES ($rewardPoolId, $hour, $poolAmount, $distributedAmount, $participants, $status)
        `, {
          rewardPoolId: poolId,
          hour: hp.hour,
          poolAmount: hp.poolAmount || 0,
          distributedAmount: hp.distributedAmount || 0,
          participants: hp.participants || 0,
          status: hp.status || 'pending'
        });
      }
    }
    
    return { insertedId: poolId };
  },
  
  updateOne: async (filter: any, update: any) => {
    const db = await getDb();
    
    if (!filter.date) return { modifiedCount: 0 };
    
    const dateStr = filter.date instanceof Date ? filter.date.toISOString().split('T')[0] : filter.date;
    
    // Get pool ID
    const pool = await db.get('SELECT id FROM reward_pools WHERE date = ?', dateStr);
    if (!pool) return { modifiedCount: 0 };
    
    // Handle $set operator
    const updateData = update.$set || update;
    
    // Build SQL update statement for reward_pools
    const fields = [];
    const params: any = { id: pool.id };
    
    for (const key in updateData) {
      if (key === 'hourlyPools') continue; // Handle separately
      if (key === 'date') continue; // Don't update the date (primary key)
      
      fields.push(`${key} = $${key}`);
      params[key] = updateData[key];
    }
    
    let modifiedCount = 0;
    
    if (fields.length > 0) {
      const updateSql = `UPDATE reward_pools SET ${fields.join(', ')} WHERE id = $id`;
      const result = await db.run(updateSql, params);
      modifiedCount += result.changes || 0;
    }
    
    // Update hourly pools if needed
    if (updateData.hourlyPools && Array.isArray(updateData.hourlyPools)) {
      for (const hp of updateData.hourlyPools) {
        const result = await db.run(`
          UPDATE hourly_pools 
          SET poolAmount = $poolAmount, 
              distributedAmount = $distributedAmount,
              participants = $participants,
              status = $status
          WHERE rewardPoolId = $rewardPoolId AND hour = $hour
        `, {
          rewardPoolId: pool.id,
          hour: hp.hour,
          poolAmount: hp.poolAmount,
          distributedAmount: hp.distributedAmount,
          participants: hp.participants,
          status: hp.status
        });
        
        if (result.changes) {
          modifiedCount++;
        }
      }
    }
    
    return { modifiedCount };
  }
};

// User rewards API
const userRewards = {
  insertOne: async (doc: any) => {
    const db = await getDb();
    
    const result = await db.run(`
      INSERT INTO user_rewards (
        walletAddress, amount, timestamp, claimed, claimTimestamp,
        poolDate, poolHour, multiplier, basePoints, weightedPoints
      ) VALUES (
        $walletAddress, $amount, $timestamp, $claimed, $claimTimestamp,
        $poolDate, $poolHour, $multiplier, $basePoints, $weightedPoints
      )
    `, {
      walletAddress: doc.walletAddress,
      amount: doc.amount,
      timestamp: doc.timestamp.toISOString(),
      claimed: doc.claimed ? 1 : 0,
      claimTimestamp: doc.claimTimestamp ? doc.claimTimestamp.toISOString() : null,
      poolDate: doc.poolDate.toISOString().split('T')[0],
      poolHour: doc.poolHour,
      multiplier: doc.multiplier || 1.0,
      basePoints: doc.basePoints,
      weightedPoints: doc.weightedPoints
    });
    
    return { insertedId: result.lastID };
  },
  
  find: async (filter: any = {}) => {
    const db = await getDb();
    
    // Build where clause
    const clauses = [];
    const params: any = {};
    
    if (filter.walletAddress) {
      clauses.push('walletAddress = $walletAddress');
      params.walletAddress = filter.walletAddress;
    }
    
    if (filter.poolDate) {
      clauses.push('poolDate = $poolDate');
      params.poolDate = filter.poolDate instanceof Date 
        ? filter.poolDate.toISOString().split('T')[0] 
        : filter.poolDate;
    }
    
    if (filter.poolHour !== undefined) {
      clauses.push('poolHour = $poolHour');
      params.poolHour = filter.poolHour;
    }
    
    if (filter.claimed !== undefined) {
      clauses.push('claimed = $claimed');
      params.claimed = filter.claimed ? 1 : 0;
    }
    
    // Construct query
    let query = 'SELECT * FROM user_rewards';
    if (clauses.length > 0) {
      query += ' WHERE ' + clauses.join(' AND ');
    }
    
    // Create a MongoDB-like cursor
    const cursor = {
      _query: query,
      _params: { ...params },
      _orderBy: '',
      _limit: '',
      
      sort: (sortSpec: any) => {
        let orderBy = '';
        for (const field in sortSpec) {
          const direction = sortSpec[field] === -1 ? 'DESC' : 'ASC';
          orderBy += (orderBy ? ', ' : ' ORDER BY ') + field + ' ' + direction;
        }
        
        cursor._orderBy = orderBy;
        return cursor;
      },
      
      limit: (n: number) => {
        cursor._limit = ` LIMIT ${n}`;
        return cursor;
      },
      
      toArray: async () => {
        const finalQuery = cursor._query + cursor._orderBy + cursor._limit;
        const rows = await db.all(finalQuery, cursor._params);
        
        return rows.map((row) => ({
          _id: row.id,
          walletAddress: row.walletAddress,
          amount: row.amount,
          timestamp: new Date(row.timestamp),
          claimed: !!row.claimed,
          claimTimestamp: row.claimTimestamp ? new Date(row.claimTimestamp) : undefined,
          poolDate: new Date(row.poolDate),
          poolHour: row.poolHour,
          multiplier: row.multiplier,
          basePoints: row.basePoints,
          weightedPoints: row.weightedPoints
        }));
      }
    };
    
    return cursor;
  }
};

// Export a compatible interface
const sqliteClient = {
  collection: (name: string) => {
    switch(name) {
      case 'users':
        return users;
      case 'rewardPools':
        return rewardPools;
      case 'userRewards':
        return userRewards;
      default:
        throw new Error(`Collection not implemented: ${name}`);
    }
  }
};

export default sqliteClient; 