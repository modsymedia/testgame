import { NextResponse } from 'next/server';
import { getReadConnection, getWriteConnection } from '@/lib/db-connection';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { twitterId, username, petStats } = body;
    
    if (!twitterId) {
      return NextResponse.json({ error: 'Twitter ID is required' }, { status: 400 });
    }

    const db = getWriteConnection();
    
    // Check if user already exists
    const userResult = await db(`
      SELECT u.*, ps.*
      FROM users u
      LEFT JOIN pet_states ps ON u.id = ps.user_id
      WHERE u.wallet_address = $1
    `, [twitterId]);

    let user = userResult.rows[0];

    if (user) {
      // Update existing user
      const updateResult = await db(`
        UPDATE users
        SET username = $1, last_login = NOW()
        WHERE wallet_address = $2
        RETURNING *
      `, [username || user.username, twitterId]);
      
      user = {
        ...updateResult.rows[0],
        petState: user.pet_state
      };
    } else {
      // Create new user
      const defaultUsername = username || `User_${Math.floor(Math.random() * 100000)}`;
      
      // Insert user
      const newUserResult = await db(`
        INSERT INTO users (wallet_address, username, last_login)
        VALUES ($1, $2, NOW())
        RETURNING *
      `, [twitterId, defaultUsername]);
      
      const newUser = newUserResult.rows[0];
      
      // Insert pet state
      const petStateResult = await db(`
        INSERT INTO pet_states (
          user_id, 
          hunger, 
          happiness, 
          cleanliness, 
          energy, 
          health, 
          is_dead
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7
        )
        RETURNING *
      `, [
        newUser.id,
        petStats?.food ?? 50,
        petStats?.happiness ?? 40,
        petStats?.cleanliness ?? 40,
        petStats?.energy ?? 30,
        petStats?.health ?? 30,
        petStats?.isDead ?? false
      ]);
      
      user = {
        ...newUser,
        petState: petStateResult.rows[0]
      };
    }

    // Format the response to match the wallet API
    const formattedResponse = {
      success: true,
      userData: {
        uid: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        points: user.points || 0,
        petState: {
          hunger: user.petState?.hunger ?? 50,
          happiness: user.petState?.happiness ?? 40,
          cleanliness: user.petState?.cleanliness ?? 40,
          energy: user.petState?.energy ?? 30,
          health: user.petState?.health ?? 30,
          isDead: user.petState?.is_dead ?? false,
        },
        daysActive: user.days_active || 0,
        multiplier: user.multiplier || 1.0,
        consecutiveDays: user.consecutive_days || 0,
      },
      rank: 0, // Set rank as needed
      totalUsers: 0 // Set total users as needed
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error('Error handling Twitter user:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process Twitter user',
      userData: null,
      rank: 0,
      totalUsers: 0
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const twitterId = request.nextUrl.searchParams.get('twitterId');
    
    if (!twitterId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Twitter ID is required',
        userData: null,
        rank: 0,
        totalUsers: 0
      }, { status: 400 });
    }

    const db = getReadConnection();
    
    // Find user by Twitter ID
    const result = await db(`
      SELECT u.*, ps.*
      FROM users u
      LEFT JOIN pet_states ps ON u.id = ps.user_id
      WHERE u.wallet_address = $1
    `, [twitterId]);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'User not found',
        userData: null,
        rank: 0,
        totalUsers: 0
      }, { status: 404 });
    }

    const user = result.rows[0];

    // Format the response to match the wallet API
    const formattedResponse = {
      success: true,
      userData: {
        uid: user.id,
        walletAddress: user.wallet_address,
        username: user.username,
        points: user.points || 0,
        petState: {
          hunger: user.hunger ?? 50,
          happiness: user.happiness ?? 40,
          cleanliness: user.cleanliness ?? 40,
          energy: user.energy ?? 30,
          health: user.health ?? 30,
          isDead: user.is_dead ?? false,
        },
        daysActive: user.days_active || 0,
        multiplier: user.multiplier || 1.0,
        consecutiveDays: user.consecutive_days || 0,
      },
      rank: 0, // Set rank as needed
      totalUsers: 0 // Set total users as needed
    };

    return NextResponse.json(formattedResponse);
  } catch (error) {
    console.error('Error fetching Twitter user:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch Twitter user',
      userData: null,
      rank: 0,
      totalUsers: 0
    }, { status: 500 });
  }
} 