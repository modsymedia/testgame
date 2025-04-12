import { NextResponse } from 'next/server';
import { initializeDb } from '@/lib/neon-init';

// This API route is secured with a simple API key in the header
// In production, you would want to use a more robust auth solution

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('x-api-key');
    
    // Very simple auth check - in production use a proper auth system
    if (!authHeader || authHeader !== process.env.ADMIN_API_KEY) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized access'
      }, { status: 401 });
    }

    // Run the database initialization
    const success = await initializeDb();
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Database migration completed successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Database migration failed'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error in database migration API:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error',
      message: error.message
    }, { status: 500 });
  }
} 