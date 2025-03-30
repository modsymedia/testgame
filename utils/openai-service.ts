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

// Add type definitions at the top of the file 
export interface PetState {
  health: number;
  happiness: number;
  hunger: number;
  cleanliness: number;
  energy?: number;
}

export interface PetBehaviorResponse {
  personality: {
    name: string;
    traits: string[];
    likes: string[];
    dislikes: string[];
    description: string;
  };
  advice: string;
  message: string;
  reaction: string;
  reward: number;
  updatedStats: any;
  pointMultiplier: number;
  cooldowns: {
    feed: number;
    play: number;
    clean: number;
    heal: number;
  };
  decayRates: {
    food: number;
    happiness: number;
    cleanliness: number;
    energy: number;
    health: number;
  };
  isOfflineMode?: boolean;
}

/**
 * Gets behavior data for pet based on OpenAI's recommendation
 */
export async function getPetBehavior(petName: string, walletAddress: string, petState: PetState, action?: string): Promise<PetBehaviorResponse> {
  try {
    // Add client-side caching for AI responses using localStorage if available
    const cacheKey = `pet_behavior_${action || 'idle'}_${Math.floor(petState.health / 10)}_${Math.floor(petState.happiness / 10)}_${Math.floor(petState.hunger / 10)}_${Math.floor(petState.cleanliness / 10)}`;
    
    // Check if we have this response cached
    if (typeof window !== 'undefined') {
      try {
        const cachedResponse = localStorage.getItem(cacheKey);
        if (cachedResponse) {
          const parsedResponse = JSON.parse(cachedResponse);
          console.log('Using cached pet behavior response');
          return parsedResponse;
        }
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    
    // Try server request
    try {
      const response = await fetch('/api/pet-behavior', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          petName,
          walletAddress,
          petState,
          action
        }),
      });
      
      if (!response.ok) {
        console.error(`Server returned ${response.status}: ${await response.text()}`);
        throw new Error(`Server returned ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache successful response in localStorage
      if (typeof window !== 'undefined' && data) {
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch (e) {
          // Ignore localStorage errors
        }
      }
      
      return data;
    } catch (serverError) {
      console.error('OpenAI service error:', serverError);
      // Fall back to offline mode with pre-defined responses
      return generateOfflinePetBehavior(petName, petState, action);
    }
  } catch (error) {
    console.error('Failed to get pet behavior:', error);
    // Return fallback behavior data
    return generateOfflinePetBehavior(petName, petState, action);
  }
}

// Helper function to generate fallback pet behavior when server is unavailable
function generateOfflinePetBehavior(petName: string, petState: PetState, action?: string): PetBehaviorResponse {
  const lowHealth = petState.health < 30;
  const lowHappiness = petState.happiness < 30;
  const lowFood = petState.hunger < 30;
  const lowCleanliness = petState.cleanliness < 30;
  
  // Default personality
  const personality = {
    name: petName,
    traits: ["playful", "curious"],
    likes: ["treats", "toys"],
    dislikes: ["baths", "loneliness"],
    description: "A friendly and sociable pet who enjoys company."
  };
  
  // Default advice
  let advice = "Your pet is doing fine! Regular care keeps your pet happy.";
  let reaction = "happy";
  
  if (lowHealth) {
    advice = "Your pet needs medical attention soon. Health is getting low.";
    reaction = "sick";
  } else if (lowFood) {
    advice = "Your pet is hungry! Time for a meal.";
    reaction = "hungry";
  } else if (lowHappiness) {
    advice = "Your pet seems a bit sad. Some playtime would help!";
    reaction = "sad";
  } else if (lowCleanliness) {
    advice = "Your pet could use some grooming. Cleanliness affects health.";
    reaction = "dirty";
  }
  
  // Messages based on action
  let message = "";
  let updatedStats = null;
  let reward = 0;
  
  switch(action) {
    case 'feed':
      message = `Thanks for the food! Yum!`;
      reaction = "happy";
      break;
    case 'play':
      message = `Playing games is so fun! Let's do this more often!`;
      reaction = "excited";
      break;
    case 'clean':
      message = `I feel so fresh and clean now!`;
      reaction = "clean";
      break;
    case 'heal':
      message = `I'm feeling much better after seeing the doctor.`;
      reaction = "happy";
      break;
    case 'idle':
      if (lowFood) message = `I'm getting hungry...`;
      else if (lowHappiness) message = `I'm feeling a bit lonely...`;
      else if (lowCleanliness) message = `I could use a bath...`;
      else if (lowHealth) message = `I'm not feeling well...`;
      else message = `*purrs contentedly*`;
      break;
    default:
      message = `*looks at you curiously*`;
  }
  
  return {
    personality,
    advice,
    message,
    reaction,
    reward,
    updatedStats,
    pointMultiplier: 1.0,
    cooldowns: {
      feed: 10,
      play: 15,
      clean: 20,
      heal: 30
    },
    decayRates: {
      food: 0.5,
      happiness: 0.4,
      cleanliness: 0.3,
      energy: 0.4,
      health: 0.2
    },
    isOfflineMode: true
  };
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
