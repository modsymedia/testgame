import { NextApiRequest, NextApiResponse } from 'next';
import sqliteClient, { getDb } from '@/lib/sqlite';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'game.db');

// Get database connection - use the exported getDb function which is a singleton
async function getDatabase() {
  // Use the exported getDb function which maintains a singleton connection
  return await getDb();
}

// Ensure tables have all required columns
async function ensureTables(db: any) {
  try {
    console.log('Ensuring database tables exist...');
    
    // Check if users table exists and create it first (since it's referenced by foreign key)
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
        tokenBalance INTEGER DEFAULT 0,
        multiplier REAL DEFAULT 1.0
      )
    `);
    
    // Now check if pet_states table exists
    const tableExists = await db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='pet_states'");
    
    if (!tableExists) {
      console.log('Creating pet_states table...');
      // Create pet_states table with all columns
      await db.exec(`
        CREATE TABLE IF NOT EXISTS pet_states (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          walletAddress TEXT UNIQUE NOT NULL,
          health INTEGER DEFAULT 30,
          happiness INTEGER DEFAULT 40,
          hunger INTEGER DEFAULT 50,
          cleanliness INTEGER DEFAULT 40,
          energy INTEGER DEFAULT 30,
          isDead INTEGER DEFAULT 0,
          lastStateUpdate TEXT,
          qualityScore INTEGER DEFAULT 0
        )
      `);
    } else {
      // Check for and add missing columns
      const columns = await db.all("PRAGMA table_info(pet_states)");
      const columnNames = columns.map((col: { name: string }) => col.name);
      
      if (!columnNames.includes('energy')) {
        console.log('Adding energy column to pet_states table...');
        await db.exec("ALTER TABLE pet_states ADD COLUMN energy INTEGER DEFAULT 30");
      }
      
      if (!columnNames.includes('isDead')) {
        console.log('Adding isDead column to pet_states table...');
        await db.exec("ALTER TABLE pet_states ADD COLUMN isDead INTEGER DEFAULT 0");
      }
    }
    
    console.log('Database tables initialized successfully');
  } catch (error) {
    console.error('Error ensuring tables:', error);
    throw error;
  }
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
    // Get the SQLite database connection
    const db = await getDatabase();
    
    // GET: Retrieve wallet data for a user
    if (req.method === 'GET') {
      const { publicKey } = req.query;
      
      if (!publicKey || typeof publicKey !== 'string') {
        return res.status(400).json({ success: false, error: 'Valid wallet public key is required' });
      }
      
      try {
        // Get user data
        const user = await db.get('SELECT * FROM users WHERE walletAddress = ?', [publicKey]);
        
        if (!user) {
          // Return default data for new users
          const walletId = publicKey.substring(0, 8);
          return res.status(200).json({
            success: true,
            data: {
              petName: `Pet_${walletId.substring(0, 4)}`,
              points: 0,
              multiplier: 1.0,
              lastLogin: Date.now(),
              daysActive: 0,
              consecutiveDays: 0,
              petStats: {
                food: 50,
                happiness: 40,
                cleanliness: 40,
                energy: 30,
                health: 30,
                isDead: false,
                points: 0
              }
            }
          });
        }
        
        // Get pet state data
        const petState = await db.get('SELECT * FROM pet_states WHERE walletAddress = ?', [publicKey]);
        
        // Return complete wallet data
        return res.status(200).json({
          success: true,
          data: {
            petName: user.username || `Pet_${publicKey.substring(0, 4)}`,
            points: user.points || 0,
            multiplier: user.multiplier || 1.0,
            lastLogin: user.lastPlayed ? new Date(user.lastPlayed).getTime() : Date.now(),
            daysActive: user.daysActive || 0,
            consecutiveDays: user.consecutiveDays || 0,
            petStats: {
              food: petState?.hunger || 50,
              happiness: petState?.happiness || 40,
              cleanliness: petState?.cleanliness || 40,
              energy: petState?.energy || 30,
              health: petState?.health || 30,
              isDead: petState?.isDead === 1 || false,
              points: user.points || 0
            }
          }
        });
      } catch (error) {
        console.error('Error fetching wallet data:', error);
        return res.status(500).json({ success: false, error: 'Database query error', details: String(error) });
      }
    }
    
    // POST: Save wallet data
    if (req.method === 'POST') {
      const { publicKey, data } = req.body;
      
      // Validate input data
      if (!publicKey || typeof publicKey !== 'string') {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid wallet public key is required' 
        });
      }
      
      if (!data || typeof data !== 'object') {
        return res.status(400).json({ 
          success: false, 
          error: 'Valid wallet data object is required' 
        });
      }
      
      try {
        console.log(`Saving wallet data for: ${publicKey.substring(0, 8)}...`);
        const now = new Date();
        
        // Check if user exists
        const existingUser = await db.get('SELECT * FROM users WHERE walletAddress = ?', [publicKey]);
        
        if (!existingUser) {
          console.log('Creating new user record...');
          // Create new user
          await db.run(`
            INSERT INTO users (
              walletAddress, 
              username, 
              points,
              lastPlayed,
              createdAt,
              daysActive,
              consecutiveDays,
              multiplier
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            publicKey,
            data.petName || `Pet_${publicKey.substring(0, 4)}`,
            data.petStats?.points || 0,
            now.toISOString(),
            now.toISOString(),
            data.daysActive || 0,
            data.consecutiveDays || 0,
            data.multiplier || 1.0
          ]);
        } else {
          console.log('Updating existing user record...');
          // Update existing user
          await db.run(`
            UPDATE users SET
              username = ?,
              points = ?,
              lastPlayed = ?,
              daysActive = ?,
              consecutiveDays = ?,
              multiplier = ?
            WHERE walletAddress = ?
          `, [
            data.petName || existingUser.username,
            data.petStats?.points || existingUser.points || 0,
            now.toISOString(),
            data.daysActive || existingUser.daysActive || 0,
            data.consecutiveDays || existingUser.consecutiveDays || 0,
            data.multiplier || existingUser.multiplier || 1.0,
            publicKey
          ]);
        }
        
        // Check if pet state exists
        const existingPetState = await db.get('SELECT * FROM pet_states WHERE walletAddress = ?', [publicKey]);
        
        if (!existingPetState) {
          console.log('Creating new pet state record...');
          // Create new pet state
          await db.run(`
            INSERT INTO pet_states (
              walletAddress,
              health,
              happiness,
              hunger,
              cleanliness,
              energy,
              isDead,
              lastStateUpdate
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            publicKey,
            data.petStats?.health || 30,
            data.petStats?.happiness || 40,
            data.petStats?.food || 50,
            data.petStats?.cleanliness || 40,
            data.petStats?.energy || 30,
            data.petStats?.isDead ? 1 : 0,
            now.toISOString()
          ]);
        } else {
          console.log('Updating existing pet state record...');
          // Update existing pet state
          await db.run(`
            UPDATE pet_states SET
              health = ?,
              happiness = ?,
              hunger = ?,
              cleanliness = ?,
              energy = ?,
              isDead = ?,
              lastStateUpdate = ?
            WHERE walletAddress = ?
          `, [
            data.petStats?.health !== undefined ? data.petStats.health : existingPetState.health,
            data.petStats?.happiness !== undefined ? data.petStats.happiness : existingPetState.happiness,
            data.petStats?.food !== undefined ? data.petStats.food : existingPetState.hunger,
            data.petStats?.cleanliness !== undefined ? data.petStats.cleanliness : existingPetState.cleanliness,
            data.petStats?.energy !== undefined ? data.petStats.energy : existingPetState.energy || 30,
            data.petStats?.isDead ? 1 : 0,
            now.toISOString(),
            publicKey
          ]);
        }
        
        console.log('Wallet data saved successfully');
        return res.status(200).json({
          success: true,
          message: 'Wallet data saved successfully'
        });
      } catch (error) {
        console.error('Error saving wallet data:', error);
        const errorDetails = error instanceof Error ? error.message : String(error);
        return res.status(500).json({ 
          success: false, 
          error: 'Database update error', 
          details: errorDetails 
        });
      }
    }
    
    // Handle PUT method for updates like burnPoints
    if (req.method === 'PUT') {
      const { publicKey, action, amount } = req.body;
      
      if (!publicKey || !action) {
        return res.status(400).json({ 
          success: false, 
          error: 'Wallet public key and action are required' 
        });
      }
      
      try {
        // Handle different actions
        if (action === 'burnPoints') {
          // Get current points
          const user = await db.get('SELECT points FROM users WHERE walletAddress = ?', [publicKey]);
          
          if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
          }
          
          // Calculate remaining points (burn 50%)
          const remainingPoints = Math.floor(user.points * 0.5);
          
          // Update user points
          await db.run(
            'UPDATE users SET points = ? WHERE walletAddress = ?',
            [remainingPoints, publicKey]
          );
          
          return res.status(200).json({
            success: true,
            remainingPoints
          });
        }
        
        if (action === 'updatePoints') {
          if (typeof amount !== 'number') {
            return res.status(400).json({ success: false, error: 'Valid amount is required for updatePoints' });
          }
          
          // Update user points
          await db.run(
            'UPDATE users SET points = ? WHERE walletAddress = ?',
            [amount, publicKey]
          );
          
          return res.status(200).json({
            success: true,
            points: amount
          });
        }
        
        // Unsupported action
        return res.status(400).json({ 
          success: false, 
          error: 'Unsupported action' 
        });
      } catch (error) {
        console.error('Error processing PUT request:', error);
        return res.status(500).json({ success: false, error: 'Database update error', details: String(error) });
      }
    }
    
    // Handle unsupported methods
    return res.status(405).json({ success: false, error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Wallet API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
} 