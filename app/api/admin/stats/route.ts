import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';

// Create a SQL client with your connection string
const sql = neon(process.env.DATABASE_URL || '');

export async function GET() {
  try {
    // Get total users count
    const totalUsersResult = await sql`SELECT COUNT(*) as count FROM users`;
    const totalUsers = totalUsersResult[0]?.count || 0;
    
    // Get total points
    const totalPointsResult = await sql`SELECT SUM(points) as total FROM users`;
    const totalPoints = totalPointsResult[0]?.total || 0;
    
    // Get active and dead pets counts
    const activePetsResult = await sql`
      SELECT COUNT(*) as count FROM pet_states WHERE is_dead = false
    `;
    const activePets = activePetsResult[0]?.count || 0;
    
    const deadPetsResult = await sql`
      SELECT COUNT(*) as count FROM pet_states WHERE is_dead = true
    `;
    const deadPets = deadPetsResult[0]?.count || 0;
    
    // Get average health
    const avgHealthResult = await sql`
      SELECT AVG(health) as avg FROM pet_states WHERE is_dead = false
    `;
    const averageHealth = Math.round(avgHealthResult[0]?.avg || 0);
    
    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalPoints,
        activePets,
        deadPets,
        averageHealth
      }
    });
  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      message: error.message 
    }, { status: 500 });
  }
} 