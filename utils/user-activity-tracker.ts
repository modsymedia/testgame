import { dbService } from '@/lib/database-service';

// Constants
const ACTIVITY_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes in milliseconds
const INACTIVITY_DECAY_RATE = {
  FOOD: 0.5,       // Food decay per hour of inactivity
  HAPPINESS: 0.3,  // Happiness decay per hour of inactivity
  CLEANLINESS: 0.2, // Cleanliness decay per hour of inactivity
  ENERGY: 0.1      // Energy decay per hour of inactivity
};

// Track user's last activity
let activityInterval: NodeJS.Timeout | null = null;

/**
 * Initialize activity tracking for a user
 * @param publicKey The user's wallet public key
 */
export function initializeActivityTracking(publicKey: string): void {
  if (!publicKey) return;
  
  // Record initial activity
  updateLastOnlineTime(publicKey);
  
  // Clear any existing interval
  if (activityInterval) {
    clearInterval(activityInterval);
  }
  
  // Set up periodic updates
  activityInterval = setInterval(() => {
    updateLastOnlineTime(publicKey);
  }, ACTIVITY_UPDATE_INTERVAL);
  
  // Set up event listeners for page visibility and unload
  if (typeof window !== 'undefined') {
    // When user leaves the page
    window.addEventListener('beforeunload', () => {
      updateLastOnlineTime(publicKey);
      if (activityInterval) {
        clearInterval(activityInterval);
        activityInterval = null;
      }
    });
    
    // Handle visibility change (tab switching/minimizing)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // User switched away from tab
        updateLastOnlineTime(publicKey);
      } else {
        // User returned to tab - check for inactivity
        checkInactivityAndUpdatePet(publicKey);
      }
    });
  }
}

/**
 * Update the user's last online timestamp in the database
 * @param publicKey The user's wallet public key
 */
async function updateLastOnlineTime(publicKey: string): Promise<void> {
  if (!publicKey) return;
  
  try {
    const now = Date.now();
    await dbService.updateUserLastOnline(publicKey, now);
  } catch (error) {
    console.error('Error updating last online time:', error);
  }
}

/**
 * Stop activity tracking for a user
 */
export function stopActivityTracking(): void {
  if (activityInterval) {
    clearInterval(activityInterval);
    activityInterval = null;
  }
  
  // Remove event listeners if we're in a browser
  if (typeof window !== 'undefined') {
    window.removeEventListener('beforeunload', () => {});
    document.removeEventListener('visibilitychange', () => {});
  }
}

/**
 * Check for inactivity and update pet status if needed
 * @param publicKey The user's wallet public key
 * @returns The inactivity duration in hours, or null if not inactive
 */
export async function checkInactivityAndUpdatePet(publicKey: string): Promise<number | null> {
  if (!publicKey) return null;
  
  try {
    // Get user data including last online time and pet stats
    const userData = await dbService.getWalletByPublicKey(publicKey);
    if (!userData) return null;
    
    const now = Date.now();
    const lastOnline = userData.lastOnline || now;
    const inactivityDuration = now - lastOnline;
    
    // If inactive for less than 5 minutes, ignore
    if (inactivityDuration < ACTIVITY_UPDATE_INTERVAL) {
      return null;
    }
    
    // Calculate inactivity in hours
    const inactivityHours = inactivityDuration / (1000 * 60 * 60);
    
    // Update pet stats based on inactivity
    if (userData.petStats) {
      const updatedPetStats = {
        ...userData.petStats,
        food: Math.max(0, userData.petStats.food - (INACTIVITY_DECAY_RATE.FOOD * inactivityHours)),
        happiness: Math.max(0, userData.petStats.happiness - (INACTIVITY_DECAY_RATE.HAPPINESS * inactivityHours)),
        cleanliness: Math.max(0, userData.petStats.cleanliness - (INACTIVITY_DECAY_RATE.CLEANLINESS * inactivityHours)),
        energy: Math.max(0, userData.petStats.energy - (INACTIVITY_DECAY_RATE.ENERGY * inactivityHours))
      };
      
      // Recalculate health
      updatedPetStats.health = calculateHealth(
        updatedPetStats.food,
        updatedPetStats.happiness,
        updatedPetStats.cleanliness,
        updatedPetStats.energy
      );
      
      // Check if pet died during inactivity
      if (updatedPetStats.health === 0 || updatedPetStats.food === 0) {
        updatedPetStats.isDead = true;
      }
      
      // Save updated pet stats
      await dbService.updatePetState(publicKey, updatedPetStats);
    }
    
    // Update last online time to now
    await updateLastOnlineTime(publicKey);
    
    return inactivityHours;
  } catch (error) {
    console.error('Error checking inactivity:', error);
    return null;
  }
}

/**
 * Calculate health based on various stats (copied from stats-helpers.ts)
 */
function calculateHealth(food: number, happiness: number, cleanliness: number, energy: number): number {
  let newHealth = (food * 0.4) + (happiness * 0.2) + (cleanliness * 0.2) + (energy * 0.2);
  
  // Apply penalty for overfeeding
  if (food > 100) {
    newHealth -= (food - 100) * 0.1;
  }
  
  return Math.max(newHealth, 0);
} 