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

// Add this after the imports
interface Migration {
  version: number;
  up: (db: Database) => Promise<void>;
  down: (db: Database) => Promise<void>;
}

// Add this after the Migration interface
async function columnExists(db: Database, table: string, column: string): Promise<boolean> {
  try {
    // Query the table info to check if the column exists
    const tableInfo = await db.all(`PRAGMA table_info(${table})`);
    return tableInfo.some(col => col.name === column);
  } catch (error) {
    console.error(`Error checking if column ${column} exists in ${table}:`, error);
    return false;
  }
}

/**
 * Get a database connection, creating/initializing it if needed
 */
async function getDb(): Promise<Database> {
  if (!_db) {
    try {
      // Try to create data directory if it doesn't exist
      if (!fs.existsSync(DATA_DIR)) {
        try {
          fs.mkdirSync(DATA_DIR, { recursive: true });
        } catch (err: any) {
          console.warn(`Warning: Could not create data directory: ${err.message}`);
        }
      }
      
      // Check if we can write to the data directory
      let canWrite = false;
      try {
        // Try to write a test file to check permissions
        const testFile = path.join(DATA_DIR, '.write-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile); // Remove test file
        canWrite = true;
      } catch (err: any) {
        console.warn(`Warning: Data directory is not writable: ${err.message}`);
      }
      
      if (canWrite) {
        // Initialize file-based database if directory is writable
        try {
          _db = await open({
            filename: DB_PATH,
            driver: sqlite3.Database,
          });
          console.log(`SQLite database opened at ${DB_PATH}`);
        } catch (err: any) {
          console.warn(`Warning: Could not open database file: ${err.message}`);
          // Fall back to in-memory database
          _db = await createInMemoryDb();
        }
      } else {
        // Fall back to in-memory database if directory is not writable
        _db = await createInMemoryDb();
      }
      
      // Enable foreign keys
      await _db.exec('PRAGMA foreign_keys = ON');
      
      // Create tables if they don't exist
      await initDb(_db);
    } catch (error: any) {
      console.error('Database initialization error:', error.message);
      // Last resort fallback - in-memory db with minimal setup
      _db = await createInMemoryDb(true);
    }
  }
  
  return _db;
}

/**
 * Create an in-memory database as a fallback
 */
async function createInMemoryDb(minimal: boolean = false): Promise<Database> {
  console.log('Creating in-memory SQLite database as fallback');
  const db = await open({
    filename: ':memory:',
    driver: sqlite3.Database,
  });
  
  if (!minimal) {
    await initDb(db);
  } else {
    // Minimal table creation for emergency fallback
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        walletAddress TEXT UNIQUE NOT NULL,
        points INTEGER DEFAULT 0
      )
    `);
  }
  
  return db;
}

// Modify the migrations to use this helper
async function runMigrations(db: Database): Promise<void> {
  // Create migrations table if it doesn't exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  // Get current version
  const currentVersion = await db.get('SELECT MAX(version) as version FROM migrations');
  const currentVersionNumber = currentVersion?.version || 0;

  // Define migrations
  const migrations: Migration[] = [
    {
      version: 1,
      up: async (db) => {
        // Check if multiplier column exists before adding it
        const hasMultiplier = await columnExists(db, 'users', 'multiplier');
        if (!hasMultiplier) {
          console.log('Adding multiplier column to users table...');
          await db.exec(`
            ALTER TABLE users ADD COLUMN multiplier REAL DEFAULT 1.0;
          `);
        } else {
          console.log('Multiplier column already exists, skipping...');
        }
      },
      down: async (db) => {
        // We'll leave this as is for now
        await db.exec(`
          ALTER TABLE users DROP COLUMN multiplier;
        `);
      }
    },
    {
      version: 2,
      up: async (db) => {
        // Add interaction tracking columns to users table
        const columns = [
          { name: 'lastInteractionTime', type: 'TEXT' },
          { name: 'cooldowns', type: 'TEXT' },
          { name: 'recentPointGain', type: 'INTEGER DEFAULT 0' },
          { name: 'lastPointGainTime', type: 'TEXT' }
        ];
        
        for (const col of columns) {
          const exists = await columnExists(db, 'users', col.name);
          if (!exists) {
            console.log(`Adding ${col.name} column to users table...`);
            await db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type};`);
          } else {
            console.log(`Column ${col.name} already exists, skipping...`);
          }
        }
      },
      down: async (db) => {
        // We'll leave this as is for now
        await db.exec(`
          ALTER TABLE users DROP COLUMN lastInteractionTime;
          ALTER TABLE users DROP COLUMN cooldowns;
          ALTER TABLE users DROP COLUMN recentPointGain;
          ALTER TABLE users DROP COLUMN lastPointGainTime;
        `);
      }
    },
    {
      version: 3,
      up: async (db) => {
        // Add new columns to pet_states table
        const columns = [
          { name: 'lastMessage', type: 'TEXT' },
          { name: 'lastReaction', type: 'TEXT' },
          { name: 'isDead', type: 'BOOLEAN DEFAULT 0' },
          { name: 'lastInteractionTime', type: 'TEXT' }
        ];
        
        for (const col of columns) {
          const exists = await columnExists(db, 'pet_states', col.name);
          if (!exists) {
            console.log(`Adding ${col.name} column to pet_states table...`);
            await db.exec(`ALTER TABLE pet_states ADD COLUMN ${col.name} ${col.type};`);
          } else {
            console.log(`Column ${col.name} already exists, skipping...`);
          }
        }
      },
      down: async (db) => {
        // We'll leave this as is for now
        await db.exec(`
          ALTER TABLE pet_states DROP COLUMN lastMessage;
          ALTER TABLE pet_states DROP COLUMN lastReaction;
          ALTER TABLE pet_states DROP COLUMN isDead;
          ALTER TABLE pet_states DROP COLUMN lastInteractionTime;
        `);
      }
    }
  ];

  // Run pending migrations with improved error handling
  for (const migration of migrations) {
    if (migration.version > currentVersionNumber) {
      console.log(`Running migration ${migration.version}...`);
      try {
        await migration.up(db);
        await db.run(
          'INSERT INTO migrations (version, applied_at) VALUES (?, ?)',
          [migration.version, new Date().toISOString()]
        );
        console.log(`Migration ${migration.version} completed successfully`);
      } catch (error) {
        console.error(`Error in migration ${migration.version}:`, error);
        // Don't throw, just log and continue with next migration
      }
    }
  }
}

/**
 * Initialize the database schema
 */
async function initDb(db: Database): Promise<void> {
  // Create tables if they don't exist
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
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS pet_states (
      walletAddress TEXT PRIMARY KEY,
      health INTEGER DEFAULT 100,
      happiness INTEGER DEFAULT 100,
      hunger INTEGER DEFAULT 100,
      cleanliness INTEGER DEFAULT 100,
      energy INTEGER DEFAULT 100,
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

  // Run migrations after creating base tables
  await runMigrations(db);
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
    tokenBalance: row.tokenBalance,
    multiplier: row.multiplier || 1.0,
    lastInteractionTime: row.lastInteractionTime ? new Date(row.lastInteractionTime) : new Date(),
    cooldowns: row.cooldowns ? JSON.parse(row.cooldowns) : {},
    recentPointGain: row.recentPointGain || 0,
    lastPointGainTime: row.lastPointGainTime ? new Date(row.lastPointGainTime) : new Date()
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
        energy: petState.energy,
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
      tokenBalance: doc.tokenBalance || 0,
      multiplier: doc.multiplier || 1.0,
      lastInteractionTime: doc.lastInteractionTime ? doc.lastInteractionTime.toISOString() : new Date().toISOString(),
      cooldowns: doc.cooldowns ? JSON.stringify(doc.cooldowns) : '{}',
      recentPointGain: doc.recentPointGain || 0,
      lastPointGainTime: doc.lastPointGainTime ? doc.lastPointGainTime.toISOString() : new Date().toISOString()
    };
    
    const result = await db.run(`
      INSERT INTO users (
        walletAddress, username, score, gamesPlayed, lastPlayed, createdAt,
        points, dailyPoints, lastPointsUpdate, daysActive, consecutiveDays,
        referralCode, referredBy, referralCount, referralPoints, tokenBalance, multiplier,
        lastInteractionTime, cooldowns, recentPointGain, lastPointGainTime
      ) VALUES (
        $walletAddress, $username, $score, $gamesPlayed, $lastPlayed, $createdAt,
        $points, $dailyPoints, $lastPointsUpdate, $daysActive, $consecutiveDays,
        $referralCode, $referredBy, $referralCount, $referralPoints, $tokenBalance, $multiplier,
        $lastInteractionTime, $cooldowns, $recentPointGain, $lastPointGainTime
      )
    `, insertData);
    
    // Add pet state if provided
    if (doc.petState) {
      await db.run(`
        INSERT INTO pet_states (
          walletAddress, health, happiness, hunger, cleanliness, energy,
          lastStateUpdate, qualityScore, lastMessage, lastReaction, isDead, lastInteractionTime
        ) VALUES (
          $walletAddress, $health, $happiness, $hunger, $cleanliness, $energy,
          $lastStateUpdate, $qualityScore, $lastMessage, $lastReaction, $isDead, $lastInteractionTime
        )
      `, {
        walletAddress: doc.walletAddress,
        health: doc.petState.health || 100,
        happiness: doc.petState.happiness || 100,
        hunger: doc.petState.hunger || 100,
        cleanliness: doc.petState.cleanliness || 100,
        energy: doc.petState.energy || 100,
        lastStateUpdate: doc.petState.lastStateUpdate ? doc.petState.lastStateUpdate.toISOString() : new Date().toISOString(),
        qualityScore: doc.petState.qualityScore || 0,
        lastMessage: doc.petState.lastMessage || '',
        lastReaction: doc.petState.lastReaction || 'none',
        isDead: doc.petState.isDead ? 1 : 0,
        lastInteractionTime: doc.petState.lastInteractionTime ? doc.petState.lastInteractionTime.toISOString() : new Date().toISOString()
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
              energy = $energy,
              lastStateUpdate = $lastStateUpdate,
              qualityScore = $qualityScore
            WHERE walletAddress = $walletAddress
          `, {
            walletAddress: filter.walletAddress,
            health: petState.health,
            happiness: petState.happiness,
            hunger: petState.hunger,
            cleanliness: petState.cleanliness,
            energy: petState.energy,
            lastStateUpdate: petState.lastStateUpdate.toISOString(),
            qualityScore: petState.qualityScore
          });
          
          if (result.changes) modifiedCount++;
        } else {
          // Insert new pet state
          await db.run(`
            INSERT INTO pet_states (
              walletAddress, health, happiness, hunger, cleanliness, energy, lastStateUpdate, qualityScore
            ) VALUES (
              $walletAddress, $health, $happiness, $hunger, $cleanliness, $energy, $lastStateUpdate, $qualityScore
            )
          `, {
            walletAddress: filter.walletAddress,
            health: petState.health,
            happiness: petState.happiness,
            hunger: petState.hunger,
            cleanliness: petState.cleanliness,
            energy: petState.energy,
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
              energy: petState.energy,
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

// Export the getDb function for direct database access
export { getDb };

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
  },
  // Also expose getDb through the client
  getDb
};

export default sqliteClient;