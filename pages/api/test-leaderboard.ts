import { NextApiRequest, NextApiResponse } from 'next';
import { MOCK_LEADERBOARD } from '@/lib/mock-data';

/**
 * This is a test endpoint to verify the leaderboard functionality
 * It always returns mock data regardless of database configuration
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Always return a successful response with mock data
    return res.status(200).json({
      leaderboard: MOCK_LEADERBOARD,
      source: 'test-endpoint',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test leaderboard error:', error);
    
    // Still return mock data even on error
    return res.status(200).json({
      leaderboard: MOCK_LEADERBOARD,
      source: 'test-endpoint-error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 