import { sql, db } from '@vercel/postgres';
import { User, PetState } from './models';

// Initialize tables if they don't exist
export async function initTables() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        wallet_address TEXT UNIQUE NOT NULL,
        username TEXT,
        score INTEGER DEFAULT 0,
        games_played INTEGER DEFAULT 0,
        last_played TIMESTAMP,
        created_at TIMESTAMP,
        points INTEGER DEFAULT 0,
        daily_points INTEGER DEFAULT 0,
        last_points_update TIMESTAMP,
        days_active INTEGER DEFAULT 0,
        consecutive_days INTEGER DEFAULT 0,
        referral_code TEXT UNIQUE,
        referred_by TEXT,
        referral_count INTEGER DEFAULT 0,
        referral_points INTEGER DEFAULT 0,
        token_balance INTEGER DEFAULT 0,
        multiplier REAL DEFAULT 1.0,
        last_interaction_time TIMESTAMP,
        cooldowns JSONB,
        recent_point_gain INTEGER DEFAULT 0,
        last_point_gain_time TIMESTAMP
      );
    `;

    // Create pet_states table
    await sql`
      CREATE TABLE IF NOT EXISTS pet_states (
        wallet_address TEXT PRIMARY KEY,
        health INTEGER DEFAULT 100,
        happiness INTEGER DEFAULT 100,
        hunger INTEGER DEFAULT 100,
        cleanliness INTEGER DEFAULT 100,
        energy INTEGER DEFAULT 100,
        last_state_update TIMESTAMP,
        quality_score INTEGER DEFAULT 0,
        last_message TEXT,
        last_reaction TEXT,
        is_dead BOOLEAN DEFAULT false,
        last_interaction_time TIMESTAMP,
        FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
      );
    `;
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error initializing database tables:', error);
    
    // For development - if running in Vercel Dev, the error might be about the table already existing
    if (error instanceof Error && 
        error.message.includes('already exists')) {
      console.log('Tables already exist, continuing...');
    } else {
      throw error;
    }
  }
}

// Initialize the database on module load
initTables().catch(console.error);

// User operations
export const users = {
  // Find a user by wallet address
  findOne: async (filter: { walletAddress?: string }) => {
    try {
      if (!filter.walletAddress) return null;
      
      const result = await sql`
        SELECT * FROM users WHERE wallet_address = ${filter.walletAddress}
      `;
      
      if (result.rows.length === 0) return null;
      
      const user = rowToUser(result.rows[0]);
      
      // Get pet state if it exists
      const petState = await sql`
        SELECT * FROM pet_states WHERE wallet_address = ${filter.walletAddress}
      `;
      
      if (petState.rows.length > 0) {
        user.petState = rowToPetState(petState.rows[0]);
      }
      
      return user;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  },
  
  // Insert a new user
  insertOne: async (doc: any) => {
    try {
      const result = await sql`
        INSERT INTO users (
          wallet_address, username, score, games_played, last_played, created_at,
          points, daily_points, last_points_update, days_active, consecutive_days,
          referral_code, referred_by, referral_count, referral_points, token_balance,
          multiplier, last_interaction_time, cooldowns, recent_point_gain, last_point_gain_time
        ) VALUES (
          ${doc.walletAddress},
          ${doc.username || null},
          ${doc.score || 0},
          ${doc.gamesPlayed || 0},
          ${doc.lastPlayed ? new Date(doc.lastPlayed) : new Date()},
          ${doc.createdAt ? new Date(doc.createdAt) : new Date()},
          ${doc.points || 0},
          ${doc.dailyPoints || 0},
          ${doc.lastPointsUpdate ? new Date(doc.lastPointsUpdate) : new Date()},
          ${doc.daysActive || 0},
          ${doc.consecutiveDays || 0},
          ${doc.referralCode || null},
          ${doc.referredBy || null},
          ${doc.referralCount || 0},
          ${doc.referralPoints || 0},
          ${doc.tokenBalance || 0},
          ${doc.multiplier || 1.0},
          ${doc.lastInteractionTime ? new Date(doc.lastInteractionTime) : new Date()},
          ${doc.cooldowns ? JSON.stringify(doc.cooldowns) : '{}'},
          ${doc.recentPointGain || 0},
          ${doc.lastPointGainTime ? new Date(doc.lastPointGainTime) : new Date()}
        )
        RETURNING id
      `;
      
      // Add pet state if provided
      if (doc.petState) {
        await sql`
          INSERT INTO pet_states (
            wallet_address, health, happiness, hunger, cleanliness, energy,
            last_state_update, quality_score, last_message, last_reaction, is_dead, last_interaction_time
          ) VALUES (
            ${doc.walletAddress},
            ${doc.petState.health || 100},
            ${doc.petState.happiness || 100},
            ${doc.petState.hunger || 100},
            ${doc.petState.cleanliness || 100},
            ${doc.petState.energy || 100},
            ${doc.petState.lastStateUpdate ? new Date(doc.petState.lastStateUpdate) : new Date()},
            ${doc.petState.qualityScore || 0},
            ${doc.petState.lastMessage || ''},
            ${doc.petState.lastReaction || 'none'},
            ${doc.petState.isDead || false},
            ${doc.petState.lastInteractionTime ? new Date(doc.petState.lastInteractionTime) : new Date()}
          )
        `;
      }
      
      return { insertedId: result.rows[0]?.id };
    } catch (error) {
      console.error('Error inserting user:', error);
      throw error;
    }
  },
  
  // Update a user
  updateOne: async (filter: any, update: any) => {
    try {
      if (!filter.walletAddress) return { modifiedCount: 0, upsertedCount: 0 };
      
      // Handle $set operator (for MongoDB compatibility)
      const updateData = update.$set || update;
      
      // Build dynamic SQL query
      const setClauses = [];
      const values: any[] = [];
      
      // Process each key in updateData
      for (const key in updateData) {
        // Handle petState separately
        if (key === 'petState') continue;
        
        // Convert camelCase to snake_case for PostgreSQL
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        
        setClauses.push(`${snakeKey} = $${setClauses.length + 1}`);
        
        // Convert dates to proper format
        if (updateData[key] instanceof Date) {
          values.push(updateData[key]);
        } else if (key === 'cooldowns') {
          values.push(JSON.stringify(updateData[key]));
        } else {
          values.push(updateData[key]);
        }
      }
      
      values.push(filter.walletAddress);
      
      let modifiedCount = 0;
      
      if (setClauses.length > 0) {
        const updateSql = `
          UPDATE users 
          SET ${setClauses.join(', ')} 
          WHERE wallet_address = $${values.length}
        `;
        
        const result = await db.query(updateSql, values);
        modifiedCount = result.rowCount || 0;
      }
      
      // Handle pet state separately if present
      if (updateData.petState) {
        const petState = updateData.petState;
        
        // Check if pet state exists
        const existingPet = await sql`
          SELECT 1 FROM pet_states WHERE wallet_address = ${filter.walletAddress}
        `;
        
        if (existingPet.rows.length > 0) {
          // Update existing pet state
          await sql`
            UPDATE pet_states 
            SET 
              health = ${petState.health},
              happiness = ${petState.happiness},
              hunger = ${petState.hunger},
              cleanliness = ${petState.cleanliness},
              energy = ${petState.energy},
              last_state_update = ${petState.lastStateUpdate instanceof Date ? petState.lastStateUpdate : new Date()},
              quality_score = ${petState.qualityScore || 0},
              last_message = ${petState.lastMessage || null},
              last_reaction = ${petState.lastReaction || 'none'},
              is_dead = ${petState.isDead || false},
              last_interaction_time = ${petState.lastInteractionTime instanceof Date ? petState.lastInteractionTime : new Date()}
            WHERE wallet_address = ${filter.walletAddress}
          `;
          
          modifiedCount++;
        } else {
          // Insert new pet state
          await sql`
            INSERT INTO pet_states (
              wallet_address, health, happiness, hunger, cleanliness, energy,
              last_state_update, quality_score, last_message, last_reaction, is_dead, last_interaction_time
            ) VALUES (
              ${filter.walletAddress},
              ${petState.health},
              ${petState.happiness},
              ${petState.hunger},
              ${petState.cleanliness},
              ${petState.energy},
              ${petState.lastStateUpdate instanceof Date ? petState.lastStateUpdate : new Date()},
              ${petState.qualityScore || 0},
              ${petState.lastMessage || null},
              ${petState.lastReaction || 'none'},
              ${petState.isDead || false},
              ${petState.lastInteractionTime instanceof Date ? petState.lastInteractionTime : new Date()}
            )
          `;
          
          modifiedCount++;
        }
      }
      
      return { modifiedCount, upsertedCount: 0 };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
};

// Convert database row to User object
function rowToUser(row: any): User {
  return {
    walletAddress: row.wallet_address,
    username: row.username,
    score: row.score,
    gamesPlayed: row.games_played,
    lastPlayed: row.last_played ? new Date(row.last_played) : new Date(),
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
    points: row.points,
    dailyPoints: row.daily_points,
    lastPointsUpdate: row.last_points_update ? new Date(row.last_points_update) : new Date(),
    daysActive: row.days_active,
    consecutiveDays: row.consecutive_days,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    referralCount: row.referral_count,
    referralPoints: row.referral_points,
    tokenBalance: row.token_balance,
    multiplier: row.multiplier || 1.0,
    lastInteractionTime: row.last_interaction_time ? new Date(row.last_interaction_time) : new Date(),
    cooldowns: row.cooldowns ? row.cooldowns : {},
    recentPointGain: row.recent_point_gain || 0,
    lastPointGainTime: row.last_point_gain_time ? new Date(row.last_point_gain_time) : new Date()
  };
}

// Convert database row to PetState object
function rowToPetState(row: any): PetState {
  return {
    health: row.health,
    happiness: row.happiness,
    hunger: row.hunger,
    cleanliness: row.cleanliness,
    energy: row.energy,
    lastStateUpdate: row.last_state_update ? new Date(row.last_state_update) : new Date(),
    qualityScore: row.quality_score,
    lastMessage: row.last_message,
    lastReaction: row.last_reaction,
    isDead: row.is_dead,
    lastInteractionTime: row.last_interaction_time ? new Date(row.last_interaction_time) : new Date()
  };
}

// Export a compatible interface
const postgresClient = {
  collection: (name: string) => {
    switch(name) {
      case 'users':
        return users;
      default:
        throw new Error(`Collection not implemented: ${name}`);
    }
  },
  sql
};

export default postgresClient; 