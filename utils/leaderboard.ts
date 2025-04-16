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
 * @param points The user's points
 * @returns Success status
 */
export async function updateUserPoints(walletAddress: string, points: number): Promise<boolean> {
  // Skip if no wallet address
  if (!walletAddress) {
    console.warn('Cannot update leaderboard without wallet address');
    return false;
  }
  
  try {
    console.log(`Updating leaderboard for ${walletAddress.substring(0, 8)}... with points ${points}`);
    
    // Use the new dedicated API endpoint for leaderboard updates
    const response = await fetch('/api/leaderboard/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress,
        points
      }),
    });
    
    // Consider 200-299 status codes as success, even with warnings
    if (response.ok) {
      const data = await response.json();
      
      // If we got a warning, log it but still consider it a success
      if (data.warning) {
        console.warn(`Leaderboard update warning: ${data.warning}`);
      }
      
      console.log('Points update successful');
      
      // Return the new rank if available
      if (data.rank) {
        console.log(`New rank: ${data.rank}`);
      }
      
      return true;
    } else {
      // Try to parse error response
      let errorMessage = 'Unknown error';
      const responseText = await response.text(); // Read body as text first
      try {
        const errorData = JSON.parse(responseText); // Try parsing the text
        errorMessage = errorData.error || errorData.message || 'Unknown error';
      } catch {
        // If JSON parse fails, use the raw text
        errorMessage = responseText || 'Failed to read error response';
      }
      
      console.error(`Points update failed: ${errorMessage}`);
      
      // Always return true for non-critical features to ensure game continues
      // But add a console warning
      console.warn('Continuing without leaderboard update');
      return true;
    }
  } catch (error) {
    console.error('Error updating points:', error);
    // Don't fail the game just because leaderboard update failed
    return true;
  }
}

/**
 * Fetch a specific user's leaderboard data and rank
 * @param walletAddress The wallet address to check
 * @returns Object containing user data and rank
 */
export const fetchUserRank = async (identifier: string) => {
  try {
    // Always use the standard leaderboard/rank endpoint
    const response = await fetch(`/api/leaderboard/rank?wallet=${encodeURIComponent(identifier)}`, {
      cache: 'no-cache', // Ensure fresh data
       headers: {
         'Content-Type': 'application/json',
       },
    });
    
    if (!response.ok) {
      console.warn(`fetchUserRank failed with status: ${response.status} for identifier: ${identifier}`);
      // Return a standard error object matching the expected structure
       return {
         success: false,
         message: `User not found or error fetching rank (status: ${response.status})`,
         rank: 0,
         userData: null,
         totalUsers: 0,
       };
    }
    
    const data = await response.json();
    
    // Ensure the response format is consistent
    return {
      success: data.success ?? false,
      message: data.message,
      rank: data.rank ?? 0,
      userData: data.userData ?? null,
      totalUsers: data.totalUsers ?? 0
    };

  } catch (error) {
    console.error('Error in fetchUserRank:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error fetching user rank',
      rank: 0,
      userData: null,
      totalUsers: 0,
    };
  }
}; 