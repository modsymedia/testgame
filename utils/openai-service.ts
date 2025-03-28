// Interfaces for OpenAI interactions - server-side API only
export interface PetBehaviorData {
  petName: string;
  loginCount: number;
  consecutiveLoginDays: number;
  loginsPerDay: number;
  timeSpent: number;
  activityCounts: {
    feed: number;
    play: number;
    clean: number;
    heal: number;
  };
  currentStats: {
    food: number;
    happiness: number;
    cleanliness: number;
    energy: number;
    health: number;
  };
  timeOfDay: string;
  dayOfWeek: string;
}

export interface PetBehaviorResult {
  decayRates: {
    food: number;
    happiness: number;
    cleanliness: number;
    energy: number;
    health: number;
  };
  cooldowns: {
    feed: number;
    play: number;
    clean: number;
    heal: number;
  };
  personality: string[];
  moodDescription: string;
  advice: string;
  pointMultiplier: number;
}

export interface PetMessage {
  message: string;
  reaction: "none" | "happy" | "sad" | "excited" | "sleepy" | "hungry" | "angry" | "sick" | "clean" | "dirty" | string;
  reward: number;
  updatedStats?: {
    food?: number;
    happiness?: number;
    cleanliness?: number;
    energy?: number;
    health?: number;
  };
}

// Default values if API fails
export const DEFAULT_BEHAVIOR: PetBehaviorResult = {
  decayRates: {
    food: 2,
    happiness: 1,
    cleanliness: 1.5,
    energy: 0.5,
    health: 0.2,
  },
  cooldowns: {
    feed: 60,
    play: 45,
    clean: 90,
    heal: 120,
  },
  personality: ["friendly", "playful", "energetic"],
  moodDescription: "Your pet seems content with their life.",
  advice: "Try to maintain a balanced routine of feeding, playing, and cleaning.",
  pointMultiplier: 1.0,
};

// Define the log entry interface for client-side logging
export interface GPTLogEntry {
  timestamp: Date;
  type: 'petBehavior' | 'petMessage';
  prompt: string;
  response?: any;
  error?: string;
}

// Local storage key for logs
const LOGS_STORAGE_KEY = 'gpt_logs_cache';

// Maximum number of logs to keep
const MAX_LOGS = 100;

// Function to add a log entry to client-side storage
export function addClientLogEntry(entry: GPTLogEntry): void {
  if (typeof window === 'undefined') return; // Only run on client side
  
  try {
    // Get existing logs
    const logsJson = localStorage.getItem(LOGS_STORAGE_KEY);
    let logs: GPTLogEntry[] = logsJson ? JSON.parse(logsJson) : [];
    
    // Add new log at the beginning
    logs.unshift(entry);
    
    // Trim to maximum size
    if (logs.length > MAX_LOGS) {
      logs = logs.slice(0, MAX_LOGS);
    }
    
    // Save back to local storage
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(logs));
    
    // Dispatch a custom event so components can listen for log updates
    window.dispatchEvent(new CustomEvent('gptLogUpdated'));
  } catch (error) {
    console.error('Error adding client log entry:', error);
  }
}

/**
 * Get GPT logs from client-side storage
 * @returns Array of GPT log entries
 */
export function getGPTLogs(): GPTLogEntry[] {
  if (typeof window === 'undefined') return []; // Only run on client side
  
  try {
    const logsJson = localStorage.getItem(LOGS_STORAGE_KEY);
    return logsJson ? JSON.parse(logsJson) : [];
  } catch (error) {
    console.error('Error getting GPT logs:', error);
    return [];
  }
}

/**
 * Add a client log entry from API response that contains _logInfo
 * @param response API response with _logInfo property
 */
export function processApiResponseLogs(response: any): void {
  if (!response || !response._logInfo) return;
  
  const logInfo = response._logInfo;
  
  const logEntry: GPTLogEntry = {
    timestamp: new Date(logInfo.timestamp),
    type: logInfo.type,
    prompt: logInfo.prompt,
    response: logInfo.response ? logInfo.response : response,
    error: logInfo.error
  };
  
  addClientLogEntry(logEntry);
  
  // Remove _logInfo from response to keep it clean
  if (typeof response === 'object') {
    delete response._logInfo;
  }
}

/**
 * Gets behavior data for pet based on OpenAI's recommendation
 */
export async function getPetBehavior(petData: PetBehaviorData): Promise<PetBehaviorResult> {
  try {
    const response = await fetch("/api/pet-behavior", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(petData),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Process logs from API response
    processApiResponseLogs(data);
    
    return data.fallback ? data.fallback : data;
  } catch (error) {
    console.error("Error fetching pet behavior:", error);
    
    // Log client-side error
    addClientLogEntry({
      timestamp: new Date(),
      type: "petBehavior",
      prompt: JSON.stringify(petData),
      error: error instanceof Error ? error.message : String(error)
    });
    
    return DEFAULT_BEHAVIOR;
  }
}

/**
 * Get pet message from server API
 */
export async function getPetMessage(
  petName: string, 
  interactionType: "feed" | "play" | "clean" | "heal" | "idle", 
  petStats: {
    food: number;
    happiness: number;
    cleanliness: number;
    energy: number;
    health: number;
  }
): Promise<PetMessage> {
  try {
    const response = await fetch("/api/pet-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ petName, interactionType, petStats }),
    });

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Process logs from API response
    processApiResponseLogs(data);
    
    return data;
  } catch (error) {
    console.error("Error fetching pet message:", error);
    
    // Log client-side error
    addClientLogEntry({
      timestamp: new Date(),
      type: "petMessage",
      prompt: JSON.stringify({ petName, interactionType, petStats }),
      error: error instanceof Error ? error.message : String(error)
    });
    
    // Fall back to default message generator
    return getDefaultPetMessage(petName, interactionType, petStats);
  }
}

/**
 * Determine reaction based on interaction and stats
 */
function determineReaction(
  interactionType: "feed" | "play" | "clean" | "heal" | "idle",
  stats: {
    food: number;
    happiness: number;
    cleanliness: number;
    energy: number;
    health: number;
  }
): string {
  switch (interactionType) {
    case "feed":
      return stats.food > 80 ? "happy" : stats.food < 30 ? "hungry" : "happy";
    case "play":
      return "excited";
    case "clean":
      return stats.cleanliness > 90 ? "angry" : "clean";
    case "heal":
      return stats.health < 50 ? "sick" : "happy";
    case "idle":
      if (stats.food < 30) return "hungry";
      if (stats.happiness < 30) return "sad";
      if (stats.cleanliness < 30) return "dirty";
      if (stats.health < 30) return "sick";
      if (stats.energy < 30) return "sleepy";
      return "happy";
    default:
      return "none";
  }
}

/**
 * Get default pet message if API fails
 */
function getDefaultPetMessage(
  petName: string,
  interactionType: "feed" | "play" | "clean" | "heal" | "idle",
  stats: {
    food: number;
    happiness: number;
    cleanliness: number;
    energy: number;
    health: number;
  }
): PetMessage {
  let message = "";
  let reaction = "none";
  let reward = 0;

  switch (interactionType) {
    case "feed":
      if (stats.food > 80) {
        message = `I'm so full! *burp* Maybe we could play instead?`;
        reaction = "happy";
      } else {
        message = `*munch munch* Thank you for the yummy food! Nom nom!`;
        reaction = stats.food < 30 ? "hungry" : "happy";
      }
      break;
    case "play":
      message = `Wheee! That was fun! I ${stats.happiness > 70 ? "love playing with you!" : "needed that playtime!"}`;
      reaction = "excited";
      break;
    case "clean":
      if (stats.cleanliness > 90) {
        message = `I'm already super clean! Too much cleaning makes me itchy!`;
        reaction = "angry";
      } else {
        message = `Ahh, I feel ${stats.cleanliness < 30 ? "so much better now that I'm clean!" : "fresh and sparkly!"}`;
        reaction = "clean";
      }
      break;
    case "heal":
      message = `${stats.health < 30 ? "Thank you for taking care of me! I feel better already." : "I appreciate the checkup! Health is important!"}`;
      reaction = stats.health < 50 ? "sick" : "happy";
      break;
    case "idle":
      if (stats.food < 30) {
        message = "My tummy is rumbling... could I have a snack please?";
        reaction = "hungry";
      } else if (stats.happiness < 30) {
        message = "I'm feeling a bit lonely... can we play together?";
        reaction = "sad";
      } else if (stats.cleanliness < 30) {
        message = "I feel icky and sticky... could you help clean me up?";
        reaction = "dirty";
      } else if (stats.health < 30) {
        message = "I don't feel so good... I might need some medicine.";
        reaction = "sick";
      } else if (stats.energy < 30) {
        message = "I'm getting sleepy... *yawn*";
        reaction = "sleepy";
      } else {
        message = `Hi there! What should we do today?`;
        reaction = "happy";
      }
      break;
  }

  if (stats.food > 70 && stats.happiness > 70 && stats.cleanliness > 70 && stats.health > 70) {
    reward = Math.round(Math.random() * 10);
  }

  return {
    message,
    reaction,
    reward,
  };
}
