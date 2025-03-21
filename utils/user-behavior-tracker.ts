import { PetBehaviorData } from "./openai-service";

// Export activity type for consistent use across the app
export type UserActivity = 'login' | 'logout' | 'feed' | 'play' | 'clean' | 'heal';

interface ActivityLog {
  timestamp: number;
  type: UserActivity;
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
}

const STORAGE_KEY_PREFIX = 'pet_behavior_';

// Create or update user behavior data
export function logUserActivity(userId: string, petName: string, activityType: UserActivity, duration?: number): void {
  if (typeof window === 'undefined') return; // Only run on client

  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  let behaviorData: UserBehaviorStore;
  
  // Get existing data or create new
  try {
    const existingData = localStorage.getItem(storageKey);
    if (existingData) {
      behaviorData = JSON.parse(existingData);
    } else {
      const now = Date.now();
      behaviorData = {
        userId,
        petName,
        firstLogin: now,
        lastLogin: now,
        loginDays: [getDateString(now)],
        sessionLogs: [],
        activityCounts: {
          feeding: 0,
          playing: 0,
          cleaning: 0,
          healing: 0
        },
        totalTimeSpent: 0
      };
    }
  } catch (error) {
    console.error('Error parsing behavior data:', error);
    return;
  }
  
  const now = Date.now();
  
  // Update behavior data based on activity type
  switch (activityType) {
    case 'login':
      behaviorData.lastLogin = now;
      // Add today to login days if not already there
      const todayString = getDateString(now);
      if (!behaviorData.loginDays.includes(todayString)) {
        behaviorData.loginDays.push(todayString);
      }
      break;
      
    case 'logout':
      // If duration provided, add to total time spent
      if (duration) {
        behaviorData.totalTimeSpent += duration / 60000; // Convert ms to minutes
      }
      break;
      
    case 'feed':
      behaviorData.activityCounts.feeding++;
      break;
      
    case 'play':
      behaviorData.activityCounts.playing++;
      break;
      
    case 'clean':
      behaviorData.activityCounts.cleaning++;
      break;
      
    case 'heal':
      behaviorData.activityCounts.healing++;
      break;
  }
  
  // Add to session logs
  behaviorData.sessionLogs.push({
    timestamp: now,
    type: activityType,
    duration
  });
  
  // Limit session logs to last 100 entries
  if (behaviorData.sessionLogs.length > 100) {
    behaviorData.sessionLogs = behaviorData.sessionLogs.slice(-100);
  }
  
  // Save updated data
  localStorage.setItem(storageKey, JSON.stringify(behaviorData));
}

/**
 * Gets behavior data for AI processing
 */
export function getBehaviorData(userId: string, petName: string, currentStats: PetBehaviorData['currentStats']): PetBehaviorData {
  // Only run on client side
  if (typeof window === 'undefined') {
    return {
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
  }

  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  const storedData = localStorage.getItem(storageKey);
  
  if (!storedData) {
    return {
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
  }
  
  try {
    const behaviorData: UserBehaviorStore = JSON.parse(storedData);
    const now = Date.now();
    
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
    console.error('Error getting behavior data:', error);
    return {
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
  }
}

// Helper functions
function getDateString(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

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