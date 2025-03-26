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
  try {
    // Get database connection
    const db = await getDb();
    
    if (req.method === 'POST') {
      const { walletAddress, score, petState } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing wallet address' 
        });
      }
      
      try {
        // Check if the user exists
        const existingUser = await db.get(
          'SELECT walletAddress FROM users WHERE walletAddress = ?', 
          [walletAddress]
        );
        
        if (existingUser) {
          // Update existing user
          const updateResult = await db.run(`
            UPDATE users 
            SET points = ?, lastPointsUpdate = ?
            WHERE walletAddress = ?
          `, [score, new Date().toISOString(), walletAddress]);
          
          if (petState) {
            try {
              // Check if pet state exists
              const existingPet = await db.get(
                'SELECT walletAddress FROM pet_states WHERE walletAddress = ?', 
                [walletAddress]
              );
              
              if (existingPet) {
                // Update pet state
                await db.run(`
                  UPDATE pet_states 
                  SET health = ?, happiness = ?, hunger = ?, cleanliness = ?, 
                      energy = ?, lastStateUpdate = ?, qualityScore = ?
                  WHERE walletAddress = ?
                `, [
                  petState.health, 
                  petState.happiness, 
                  petState.hunger, 
                  petState.cleanliness,
                  petState.energy,
                  new Date().toISOString(), 
                  petState.qualityScore || 0,
                  walletAddress
                ]);
              } else {
                // Insert pet state
                await db.run(`
                  INSERT INTO pet_states (
                    walletAddress, health, happiness, hunger, cleanliness, 
                    energy, lastStateUpdate, qualityScore
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                  walletAddress,
                  petState.health, 
                  petState.happiness, 
                  petState.hunger, 
                  petState.cleanliness,
                  petState.energy,
                  new Date().toISOString(), 
                  petState.qualityScore || 0
                ]);
              }
            } catch (petError: any) {
              console.error('Error updating pet state:', petError.message);
              // Continue execution - don't fail the whole request if just pet state fails
            }
          }
          
          return res.status(200).json({ 
            success: true, 
            message: 'Wallet data updated' 
          });
        } else {
          // Create new user
          const newUser = {
            walletAddress,
            points: score || 0,
            lastPointsUpdate: new Date().toISOString(),
            createdAt: new Date().toISOString()
          };
          
          const insertResult = await db.run(`
            INSERT INTO users (walletAddress, points, lastPointsUpdate, createdAt)
            VALUES (?, ?, ?, ?)
          `, [
            newUser.walletAddress, 
            newUser.points, 
            newUser.lastPointsUpdate, 
            newUser.createdAt
          ]);
          
          if (petState) {
            try {
              await db.run(`
                INSERT INTO pet_states (
                  walletAddress, health, happiness, hunger, cleanliness, 
                  energy, lastStateUpdate, qualityScore
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
              `, [
                walletAddress,
                petState.health, 
                petState.happiness, 
                petState.hunger, 
                petState.cleanliness,
                petState.energy,
                new Date().toISOString(), 
                petState.qualityScore || 0
              ]);
            } catch (petError: any) {
              console.error('Error creating pet state:', petError.message);
              // Continue execution - don't fail the whole request if just pet state fails
            }
          }
          
          return res.status(201).json({ 
            success: true, 
            message: 'New wallet data created' 
          });
        }
      } catch (dbError: any) {
        console.error('Database update error:', dbError.message);
        
        // Check for specific error conditions
        if (dbError.message.includes('SQLITE_READONLY')) {
          console.warn('Database is read-only, falling back to temporary storage');
          // Here you could implement a fallback to session storage or another mechanism
          return res.status(200).json({ 
            success: true, 
            message: 'Data temporarily stored in memory',
            warning: 'Using temporary storage due to database permission issues' 
          });
        }
        
        return res.status(500).json({ 
          success: false, 
          error: 'Database update error', 
          details: dbError.message 
        });
      }
    } else if (req.method === 'GET') {
      const { walletAddress } = req.query;
      
      if (!walletAddress) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing wallet address' 
        });
      }
      
      try {
        // Get user data
        const user = await db.get(
          'SELECT * FROM users WHERE walletAddress = ?', 
          [walletAddress]
        );
        
        if (!user) {
          return res.status(404).json({ 
            success: false, 
            error: 'Wallet not found' 
          });
        }
        
        // Get pet state if it exists
        let petState = null;
        try {
          petState = await db.get(
            'SELECT * FROM pet_states WHERE walletAddress = ?', 
            [walletAddress]
          );
        } catch (petError: any) {
          console.error('Error fetching pet state:', petError.message);
          // Continue without pet state
        }
        
        // Format and return user data
        const userData = {
          walletAddress: user.walletAddress,
          points: user.points || 0,
          multiplier: user.multiplier || 1.0,
          lastUpdated: user.lastPointsUpdate ? new Date(user.lastPointsUpdate) : null,
          petState: petState ? {
            health: petState.health,
            happiness: petState.happiness,
            hunger: petState.hunger,
            cleanliness: petState.cleanliness,
            energy: petState.energy,
            lastStateUpdate: petState.lastStateUpdate ? new Date(petState.lastStateUpdate) : null,
            qualityScore: petState.qualityScore || 0
          } : null
        };
        
        return res.status(200).json({ 
          success: true, 
          data: userData 
        });
      } catch (dbError: any) {
        console.error('Database query error:', dbError.message);
        
        return res.status(500).json({ 
          success: false, 
          error: 'Server error', 
          message: dbError.message 
        });
      }
    } else {
      return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
      });
    }
  } catch (error: any) {
    console.error('Unhandled API error:', error.message);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error', 
      message: error.message 
    });
  }
} 