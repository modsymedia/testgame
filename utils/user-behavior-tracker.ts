import { PetBehaviorData } from "./openai-service";

interface ActivityLog {
  timestamp: number;
  type: 'login' | 'logout' | 'feed' | 'play' | 'clean' | 'heal';
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
export function logUserActivity(userId: string, petName: string, activityType: ActivityLog['type'], duration?: number): void {
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

// Get behavior data for AI processing
export function getBehaviorData(userId: string, currentStats: PetBehaviorData['currentStats']): PetBehaviorData | null {
  if (typeof window === 'undefined') return null; // Only run on client
  
  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  
  try {
    const storedData = localStorage.getItem(storageKey);
    if (!storedData) return null;
    
    const behaviorData: UserBehaviorStore = JSON.parse(storedData);
    const now = Date.now();
    
    // Calculate metrics for AI
    const daysSinceFirst = Math.max(1, daysBetween(behaviorData.firstLogin, now));
    const loginsPerDay = behaviorData.loginDays.length / daysSinceFirst;
    
    // Calculate consecutive days
    let consecutiveDays = 0;
    const sortedDays = [...behaviorData.loginDays].sort();
    if (sortedDays.length > 0) {
      consecutiveDays = 1;
      let prevDate = new Date(sortedDays[sortedDays.length - 1]);
      
      for (let i = sortedDays.length - 2; i >= 0; i--) {
        const currDate = new Date(sortedDays[i]);
        const diffDays = daysBetween(currDate.getTime(), prevDate.getTime());
        
        if (diffDays === 1) {
          consecutiveDays++;
          prevDate = currDate;
        } else {
          break;
        }
      }
    }
    
    // Build pet behavior data object
    return {
      petName: behaviorData.petName,
      loginsPerDay,
      timeSpentMinutes: behaviorData.totalTimeSpent / daysSinceFirst,
      activities: behaviorData.activityCounts,
      currentStats,
      timeOfDay: getTimeOfDay(),
      dayOfWeek: getDayOfWeek(),
      consecutiveDays
    };
    
  } catch (error) {
    console.error('Error getting behavior data:', error);
    return null;
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