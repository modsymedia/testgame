import { sql } from '@vercel/postgres';

/**
 * Database schema and migration management for the application
 * This file centralizes all database schema definitions and migrations
 */

// Application database version
export const DB_VERSION = 1;

// Database tables
export const TABLES = {
  USERS: 'users',
  PET_STATES: 'pet_states',
  USER_ACTIVITIES: 'user_activities',
  USER_DATA: 'user_data',
  SYNC_LOG: 'sync_log',
  GAME_SESSIONS: 'game_sessions',
  DB_METADATA: 'db_metadata'
};

/**
 * Initializes the database schema
 * Creates all required tables if they don't exist
 */
export async function initDatabase() {
  try {
    console.log("Database initialization starting...");
    
    // Create metadata table to track schema version
    await createMetadataTable();

    // Create all application tables
    await createUsersTable();
    await createPetStatesTable();
    await createUserActivitiesTable();
    await createUserDataTable();
    await createSyncLogTable();
    await createGameSessionsTable();
    
    // Update schema version
    await updateSchemaVersion();
    
    console.log('Database initialization completed successfully');
    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    return false;
  }
}

// Create metadata table to track schema version
async function createMetadataTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS db_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// Update schema version in metadata table
async function updateSchemaVersion() {
  await sql`
    INSERT INTO db_metadata (key, value, updated_at)
    VALUES ('schema_version', ${DB_VERSION.toString()}, NOW())
    ON CONFLICT (key) 
    DO UPDATE SET value = ${DB_VERSION.toString()}, updated_at = NOW()
  `;
}

// Create users table
async function createUsersTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT UNIQUE NOT NULL,
      username TEXT,
      score INTEGER DEFAULT 0,
      games_played INTEGER DEFAULT 0,
      last_played TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
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
      cooldowns JSONB DEFAULT '{}'::jsonb,
      recent_point_gain INTEGER DEFAULT 0,
      last_point_gain_time TIMESTAMP
    )
  `;
  
  // Create index on wallet_address for faster lookups
  await sql`CREATE INDEX IF NOT EXISTS idx_users_wallet_address ON users (wallet_address)`;
}

// Create pet_states table
async function createPetStatesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS pet_states (
      wallet_address TEXT PRIMARY KEY,
      health INTEGER DEFAULT 100,
      happiness INTEGER DEFAULT 100,
      hunger INTEGER DEFAULT 100,
      cleanliness INTEGER DEFAULT 100,
      energy INTEGER DEFAULT 100,
      last_interaction_time TIMESTAMP,
      last_state_update TIMESTAMP,
      quality_score INTEGER DEFAULT 0,
      last_message TEXT,
      last_reaction TEXT,
      is_dead BOOLEAN DEFAULT false,
      FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
    )
  `;
}

// Create user_activities table
async function createUserActivitiesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_activities (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      activity_id TEXT UNIQUE NOT NULL,
      activity_type TEXT NOT NULL,
      name TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      timestamp TIMESTAMP NOT NULL,
      FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
    )
  `;
  
  // Create indexes for better query performance
  await sql`CREATE INDEX IF NOT EXISTS idx_activities_wallet ON user_activities (wallet_address)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON user_activities (timestamp)`;
}

// Create user_data table for custom data storage
async function createUserDataTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS user_data (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
    )
  `;
  
  // Create index on wallet_address
  await sql`CREATE INDEX IF NOT EXISTS idx_user_data_wallet ON user_data (wallet_address)`;
}

// Create sync_log table for tracking synchronization status
async function createSyncLogTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS sync_log (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      status TEXT NOT NULL,
      data JSONB,
      error TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// Create game_sessions table
async function createGameSessionsTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS game_sessions (
      id SERIAL PRIMARY KEY,
      wallet_address TEXT NOT NULL,
      session_id TEXT UNIQUE NOT NULL,
      start_time TIMESTAMP NOT NULL,
      end_time TIMESTAMP,
      score INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT false,
      data JSONB,
      FOREIGN KEY (wallet_address) REFERENCES users(wallet_address) ON DELETE CASCADE
    )
  `;
  
  // Create index on wallet_address for faster lookups
  await sql`CREATE INDEX IF NOT EXISTS idx_sessions_wallet ON game_sessions (wallet_address)`;
} 