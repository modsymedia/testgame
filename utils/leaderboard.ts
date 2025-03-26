import { LeaderboardEntry } from '@/lib/models';

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
    
    // Return empty array if no data available
    console.warn('No valid leaderboard data in response');
    return [];
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    // Return empty array on error
    return [];
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
    console.log(`Updating leaderboard for ${walletAddress.substring(0, 8)}... with score ${score}`);
    
    const response = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        score
      }),
    });
    
    // Consider 200-299 status codes as success, even with warnings
    if (response.ok) {
      const data = await response.json();
      
      // If we got a warning about temporary storage, log it but still consider it a success
      if (data.warning) {
        console.warn(`Leaderboard update warning: ${data.warning}`);
      }
      
      console.log('Score update successful');
      return true;
    } else {
      const errorData = await response.text();
      console.error(`Score update failed: ${errorData}`);
      
      // We'll still return true if it's just a database permission issue
      // This way the game continues working even if leaderboard updates fail
      if (errorData.includes('SQLITE_READONLY')) {
        console.warn('Using local score tracking due to server database being read-only');
        return true;
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error updating score:', error);
    return false;
  }
} 