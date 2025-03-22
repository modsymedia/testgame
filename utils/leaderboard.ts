import { LeaderboardEntry } from '@/lib/models';
import { MOCK_LEADERBOARD } from '@/lib/mock-data';

/**
 * Fetch the leaderboard data
 * @param limit Number of top players to retrieve
 * @returns Array of leaderboard entries
 */
export async function fetchLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
  try {
    // Use relative URL to avoid port/domain issues
    const response = await fetch(`/api/leaderboard?limit=${limit}`, {
      // Add cache control to prevent stale data
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Parse the response body
    const data = await response.json();
    
    // If we got a successful response with leaderboard data, use it
    if (data && data.leaderboard && Array.isArray(data.leaderboard)) {
      return data.leaderboard;
    }
    
    // Otherwise use fallback data
    console.warn('No valid leaderboard data in response, using fallback');
    return MOCK_LEADERBOARD.slice(0, limit);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    // Return fallback data on any error
    return MOCK_LEADERBOARD.slice(0, limit);
  }
}

/**
 * Update a user's score in the leaderboard
 * @param walletAddress The user's wallet address
 * @param score The user's score
 * @returns Success status
 */
export async function updateUserScore(walletAddress: string, score: number): Promise<boolean> {
  try {
    // Don't try to update if missing required data
    if (!walletAddress || typeof score !== 'number') {
      console.warn('Missing wallet address or score for leaderboard update');
      return false;
    }

    // Use relative URL to avoid port/domain issues
    const response = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ walletAddress, score }),
    });
    
    // Parse the response body
    const data = await response.json();
    
    // Check for success in the response
    if (data && data.success === true) {
      return true;
    }
    
    console.warn('Score update failed:', data?.error || 'Unknown error');
    return false;
  } catch (error) {
    console.error('Error updating score:', error);
    return false;
  }
} 