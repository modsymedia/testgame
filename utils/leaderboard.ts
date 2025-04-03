import { LeaderboardEntry } from '@/lib/models';

/**
 * Fetch the leaderboard data with pagination support
 * @param limit Number of entries per page
 * @param page Page number (1-based)
 * @returns Object containing entries array and metadata
 */
export async function fetchLeaderboard(limit = 6, page = 1): Promise<{
  entries: LeaderboardEntry[];
  total: number;
}> {
  try {
    // Calculate offset for pagination (consistently 6 entries per page)
    const offset = (page - 1) * limit;
    
    // Use relative URL to avoid port/domain issues
    const response = await fetch(`/api/leaderboard?limit=${limit}&offset=${offset}`, {
      // Add cache control to prevent stale data
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`Leaderboard fetch failed with status: ${response.status}`);
      return { entries: [], total: 0 };
    }
    
    // Parse the response body
    const data = await response.json();
    
    // If we got a successful response with leaderboard data, use it
    if (data && data.success && data.data && Array.isArray(data.data)) {
      return { 
        entries: data.data,
        total: data.meta?.total || data.data.length
      };
    }
    
    // Return empty array if no data available
    console.warn('No valid leaderboard data in response');
    return { entries: [], total: 0 };
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    // Return empty array on error
    return { entries: [], total: 0 };
  }
}

/**
 * Update a user's score in the leaderboard
 * @param walletAddress The user's wallet address
 * @param score The user's score
 * @returns Success status
 */
export async function updateUserScore(walletAddress: string, score: number): Promise<boolean> {
  // Skip if no wallet address
  if (!walletAddress) {
    console.warn('Cannot update leaderboard without wallet address');
    return false;
  }
  
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

/**
 * Fetch a specific user's leaderboard data and rank
 * @param walletAddress The wallet address to check
 * @returns Object containing user data and rank
 */
export async function fetchUserRank(walletAddress: string): Promise<{
  rank: number;
  userData: any;
  success: boolean;
  totalUsers: number;
}> {
  try {
    if (!walletAddress) {
      console.warn('Cannot fetch user rank without wallet address');
      return { rank: 0, userData: null, success: false, totalUsers: 0 };
    }
    
    // Use relative URL to avoid port/domain issues
    const response = await fetch(`/api/leaderboard/rank?wallet=${walletAddress}`, {
      cache: 'no-cache',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.warn(`User rank fetch failed with status: ${response.status}`);
      return { rank: 0, userData: null, success: false, totalUsers: 0 };
    }
    
    // Parse the response body
    const data = await response.json();
    
    if (data && data.success && data.rank) {
      return { 
        rank: data.rank,
        userData: data.userData || null,
        success: true,
        totalUsers: data.totalUsers || 0
      };
    }
    
    console.warn('No valid user rank data in response');
    return { rank: 0, userData: null, success: false, totalUsers: 0 };
  } catch (error) {
    console.error('Error fetching user rank:', error);
    return { rank: 0, userData: null, success: false, totalUsers: 0 };
  }
} 