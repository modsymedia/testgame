import { NextResponse } from 'next/server';
import { initializeDb } from '@/lib/neon-init';

export async function GET() {
  try {
    // In production, you'd want to check for an API key or admin auth
    // For now, we'll leave it open for development
    
    // Run database initialization
    const success = await initializeDb();
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Database tables created successfully'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Failed to create database tables'
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Error initializing database:', error);
    return NextResponse.json({
      success: false,
      error: 'Server error',
      message: error.message
    }, { status: 500 });
  }
} 