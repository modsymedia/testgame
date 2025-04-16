import { PetBehaviorData } from "./openai-service";
import { dbService } from "@/lib/database-service";
import { UserActivity as UserActivityLogData, User } from '@/lib/models'; // Add User import

// Export activity type for consistent use across the app
export type UserActivityType = 'login' | 'logout' | 'feed' | 'play' | 'clean' | 'heal'; // Renamed local type

interface ActivityLog {
  timestamp: number;
  type: UserActivityType; // Use renamed local type
  duration?: number; // For login/logout pairs
}

interface UserBehaviorStore {
  userId: string;
  petName: string;
  firstLogin: number;
  lastLogin: number;
  loginDays: string[]; // YYYY-MM-DD format
  sessionLogs: ActivityLog[];
  activityCounts: {
    feeding: number;
    playing: number;
    cleaning: number;
    healing: number;
  };
  totalTimeSpent: number; // in minutes
  sessionEvents: Record<string, any>[];
  eventCounts: Record<string, number>;
  lastActive: number;
}

// Constants
const MAX_EVENTS_PER_SESSION = 100;
const DEFAULT_RETENTION_DAYS = 30;

// Data store for user behavior
const userBehaviorStore: Record<string, UserBehaviorStore> = {};

// Function to log user activity (e.g., login, interaction)
// Changed: Accepts UID instead of walletAddress
export const logUserActivity = async (uid: string, type: string, name: string, points: number = 0): Promise<void> => {
  if (!uid) {
    console.warn('logUserActivity: Missing UID, cannot log activity.');
    return;
  }

  try {
    // Create a unique ID for the activity log entry
    const activityId = generateUniqueId(); // Reuse existing helper or implement one

    const activity: UserActivityLogData = { // Use renamed imported type
      id: activityId,
      type,
      name,
      points,
      timestamp: Date.now(),
    };

    // Call the refactored service method
    const success = await dbService.saveUserActivity(uid, activity);

    if (success) {
      console.log(`Behavior data for ${type} saved to database for UID: ${uid}`);
    } else {
      console.warn(`Failed to save behavior data to database for UID: ${uid}`);
      // Consider offline queuing strategy if critical
    }
  } catch (error) {
    console.error('Failed to save behavior data to database:', error);
  }
};

/**
 * Gets behavior data for AI processing
 */
export async function getBehaviorData(userId: string, petName: string, currentStats: PetBehaviorData['currentStats']): Promise<PetBehaviorData> {
  // Default data for when we can't access the database
  const defaultData = {
    petName,
    loginCount: 1,
    consecutiveLoginDays: 1,
    loginsPerDay: 1,
    timeSpent: 0,
    activityCounts: {
      feed: 0,
      play: 0,
      clean: 0,
      heal: 0
    },
    currentStats,
    timeOfDay: getTimeOfDay(),
    dayOfWeek: getDayOfWeek()
  };
  
  // Only run on client side with valid userId
  if (typeof window === 'undefined' || !userId) {
    return defaultData;
  }

  try {
    // Get data from database
    const userData = await dbService.getUserByWalletAddress(userId); // Use getUserByWalletAddress
    const uid = userData?.uid;

    if (!uid) {
      return defaultData;
    }
    
    const behaviorData: UserBehaviorStore = (userData as any).behaviorData;
    
    // Calculate metrics
    const loginDays = behaviorData.loginDays?.length || 1;
    const totalLogins = behaviorData.sessionLogs?.length || 1;
    const loginsPerDay = totalLogins / loginDays;
    
    // Calculate consecutive login days
    let consecutiveDays = 1;
    const sortedDates = [...(behaviorData.loginDays || [])]
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    if (sortedDates.length > 1) {
      let currentDate = new Date(sortedDates[0]);
      for (let i = 1; i < sortedDates.length; i++) {
        const previousDate = new Date(sortedDates[i]);
        const dayDiff = daysBetween(previousDate.getTime(), currentDate.getTime());
        if (dayDiff === 1) {
          consecutiveDays++;
          currentDate = previousDate;
        } else {
          break;
        }
      }
    }
    
    // Calculate time spent (based on login/logout pairs)
    const timeSpent = Math.floor(behaviorData.totalTimeSpent || 0);
    
    // Map activity counts from storage format to API format
    const activityCounts = {
      feed: behaviorData.activityCounts?.feeding || 0,
      play: behaviorData.activityCounts?.playing || 0,
      clean: behaviorData.activityCounts?.cleaning || 0,
      heal: behaviorData.activityCounts?.healing || 0
    };
    
    return {
      petName: behaviorData.petName || petName,
      loginCount: totalLogins,
      consecutiveLoginDays: consecutiveDays,
      loginsPerDay,
      timeSpent,
      activityCounts,
      currentStats,
      timeOfDay: getTimeOfDay(),
      dayOfWeek: getDayOfWeek()
    };
  } catch (error) {
    console.error('Error getting behavior data from database:', error);
    return defaultData;
  }
}

// Helper functions
function daysBetween(date1: number, date2: number): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const diffDays = Math.round(Math.abs((date2 - date1) / oneDay));
  return Math.max(1, diffDays); // Ensure at least 1 day
}

function getTimeOfDay(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getDayOfWeek(): string {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];
}

// Helper to generate unique IDs (if not already present)
function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * @param uid - User ID.
 */
async function loadBehaviorData(uid: string): Promise<UserBehaviorStore> {
  // Correctly define defaultData to match UserBehaviorStore interface
  const defaultData: UserBehaviorStore = {
    userId: uid, // Initialize with provided uid
    petName: '', // Default empty values
    firstLogin: Date.now(),
    lastLogin: Date.now(),
    loginDays: [], 
    sessionLogs: [],
    activityCounts: {
      feeding: 0,
      playing: 0,
      cleaning: 0,
      healing: 0
    },
    totalTimeSpent: 0,
    sessionEvents: [],
    eventCounts: {},
    lastActive: Date.now(),
  };

  try {
    const userData = await dbService.getUserByUid(uid);
    const behaviorData = (userData as any)?.behaviorData as UserBehaviorStore | undefined;

    if (!userData || !behaviorData) { 
      return defaultData;
    }
        
    // Clean up old session events from the loaded data
    const retentionThreshold = Date.now() - DEFAULT_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    behaviorData.sessionEvents = (behaviorData.sessionEvents || []).filter(
      (event: any) => event.timestamp >= retentionThreshold // Add type 'any' for event temporarily if needed
    );
    behaviorData.eventCounts = behaviorData.eventCounts || {};
    behaviorData.sessionLogs = behaviorData.sessionLogs || []; // Ensure all fields exist
    behaviorData.activityCounts = behaviorData.activityCounts || { feeding: 0, playing: 0, cleaning: 0, healing: 0 };
    behaviorData.loginDays = behaviorData.loginDays || [];

    return { ...defaultData, ...behaviorData }; // Merge loaded data with defaults

  } catch (error) {
    console.error('Error loading user behavior data:', error);
    return defaultData;
  }
}

/**
 * @param uid - User ID.
 * @param data - Behavior data to save.
 */
async function saveBehaviorData(
  uid: string,
  data: UserBehaviorStore
): Promise<void> {
  try {
    // User type is now imported, cast should work
    await dbService.updateUserData(uid, { behaviorData: data } as Partial<User>); 
    console.log(`Behavior data for ${uid} saved to database.`);
  } catch (error) {
    console.error('Error saving user behavior data:', error);
  }
}

/**
 * Tracks a specific user event.
 * @param userId - User identifier (wallet address or UID).
 * @param eventType - Type of event (e.g., 'login', 'click', 'purchase').
 * @param eventData - Additional data associated with the event.
 */
export async function trackEvent(
  userId: string,
  eventType: string,
  eventData: Record<string, any> = {}
): Promise<void> {
  try {
    const userData = await dbService.getUserByWalletAddress(userId);
    const uid = userData?.uid;

    if (!uid) {
      console.warn(`User UID not found for identifier: ${userId}, cannot track event.`);
      return;
    }

    const userKey = uid; 

    if (!userBehaviorStore[userKey]) {
      userBehaviorStore[userKey] = await loadBehaviorData(userKey);
    }

    const store = userBehaviorStore[userKey];

    // Add event to session events
    store.sessionEvents.push({
      type: eventType,
      timestamp: Date.now(),
      data: eventData,
    });

    // Trim session events if exceeding max count
    if (store.sessionEvents.length > MAX_EVENTS_PER_SESSION) {
      store.sessionEvents.shift(); // Remove oldest event
    }

    // Update last active timestamp
    store.lastActive = Date.now();

    // Aggregate event counts
    store.eventCounts[eventType] = (store.eventCounts[eventType] || 0) + 1;

    // Save data to database (using UID)
    await saveBehaviorData(userKey, store);
    
  } catch (error) {
    console.error('Error tracking user behavior:', error);
  }
} 