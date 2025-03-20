import OpenAI from "openai";

let openai: OpenAI;

export interface GPTLogEntry {
  timestamp: Date;
  type: "petBehavior" | "petMessage";
  prompt: string;
  response?: any;
  error?: string;
}

export const gptLogs: GPTLogEntry[] = [];

const MAX_LOGS = 100;

function addLogEntry(entry: GPTLogEntry) {
  gptLogs.unshift(entry);
  if (gptLogs.length > MAX_LOGS) gptLogs.pop();

  console.log(`GPT Log [${entry.type}]: ${new Date().toISOString()}`);
}

if (typeof window !== "undefined") {
  try {
    openai = new OpenAI({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY as string,
      dangerouslyAllowBrowser: true,
    });
  } catch (error) {
    console.error("Failed to initialize OpenAI:", error);
  }
}

export interface PetBehaviorData {
  petName: string;
  loginsPerDay: number;
  timeSpentMinutes: number;
  activities: {
    feeding: number;
    playing: number;
    cleaning: number;
    healing: number;
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
  consecutiveDays: number;
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
    doctor: number;
  };
  personalityTraits: string[];
  moodDescription: string;
  advice: string;
  multiplier: number;
}

const DEFAULT_BEHAVIOR: PetBehaviorResult = {
  decayRates: {
    food: 0.5,
    happiness: 0.4,
    cleanliness: 0.3,
    energy: 0.4,
    health: 0.2,
  },
  cooldowns: {
    feed: 30000,
    play: 45000,
    clean: 60000,
    doctor: 120000,
  },
  personalityTraits: ["friendly", "playful"],
  moodDescription: "Your pet is feeling normal today.",
  advice: "Make sure to feed and play with your pet regularly!",
  multiplier: 1.0,
};

/**
 * Get customized pet behavior based on user interaction history
 */
export async function getPetBehavior(data: PetBehaviorData): Promise<PetBehaviorResult> {
  if (!openai) {
    console.warn("OpenAI not initialized, using default behavior");
    return DEFAULT_BEHAVIOR;
  }

  try {
    const prompt = `
You are an AI that analyzes pet virtual game data and customizes pet behavior to make each pet unique.
Based on the following user data, determine how the virtual pet should behave:

Pet name: ${data.petName}
Average logins per day: ${data.loginsPerDay.toFixed(1)}
Average time spent (minutes): ${data.timeSpentMinutes.toFixed(1)}
Activity frequency:
- Feeding: ${data.activities.feeding} times
- Playing: ${data.activities.playing} times
- Cleaning: ${data.activities.cleaning} times
- Healing: ${data.activities.healing} times
Current stats:
- Food: ${data.currentStats.food}/100
- Happiness: ${data.currentStats.happiness}/100
- Cleanliness: ${data.currentStats.cleanliness}/100
- Energy: ${data.currentStats.energy}/100
- Health: ${data.currentStats.health}/100
Time of day: ${data.timeOfDay}
Day of week: ${data.dayOfWeek}
Consecutive days active: ${data.consecutiveDays}

Based on this data, please provide:
1. Customized decay rates for each stat (0.1 to 1.0 where higher means faster decay)
2. Cooldown times in milliseconds for each activity (between 15000 and 180000)
3. 2-3 personality traits that fit this pet's pattern
4. A mood description based on current stats and patterns
5. Brief advice for the user
6. A point multiplier between 0.8 and 1.5 based on care quality

Output in JSON format only. No explanations or additional text.
`;

    const logEntry: GPTLogEntry = {
      timestamp: new Date(),
      type: "petBehavior",
      prompt,
    };

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "You analyze pet game data and output JSON only." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      logEntry.response = content;
      addLogEntry(logEntry);

      try {
        const parsedResponse = JSON.parse(content);

        return {
          decayRates: {
            food: parsedResponse.decayRates?.food || DEFAULT_BEHAVIOR.decayRates.food,
            happiness: parsedResponse.decayRates?.happiness || DEFAULT_BEHAVIOR.decayRates.happiness,
            cleanliness: parsedResponse.decayRates?.cleanliness || DEFAULT_BEHAVIOR.decayRates.cleanliness,
            energy: parsedResponse.decayRates?.energy || DEFAULT_BEHAVIOR.decayRates.energy,
            health: parsedResponse.decayRates?.health || DEFAULT_BEHAVIOR.decayRates.health,
          },
          cooldowns: {
            feed: parsedResponse.cooldowns?.feed || DEFAULT_BEHAVIOR.cooldowns.feed,
            play: parsedResponse.cooldowns?.play || DEFAULT_BEHAVIOR.cooldowns.play,
            clean: parsedResponse.cooldowns?.clean || DEFAULT_BEHAVIOR.cooldowns.clean,
            doctor: parsedResponse.cooldowns?.doctor || DEFAULT_BEHAVIOR.cooldowns.doctor,
          },
          personalityTraits: parsedResponse.personalityTraits || DEFAULT_BEHAVIOR.personalityTraits,
          moodDescription: parsedResponse.moodDescription || DEFAULT_BEHAVIOR.moodDescription,
          advice: parsedResponse.advice || DEFAULT_BEHAVIOR.advice,
          multiplier: parsedResponse.multiplier || DEFAULT_BEHAVIOR.multiplier,
        };
      } catch (error) {
        console.error("Failed to parse OpenAI response:", error, content);
        logEntry.error = "Failed to parse response: " + error;
        addLogEntry(logEntry);
        return DEFAULT_BEHAVIOR;
      }
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      logEntry.error = "API Error: " + error;
      addLogEntry(logEntry);
      return DEFAULT_BEHAVIOR;
    }
  } catch (error) {
    console.error("Error preparing OpenAI request:", error);
    addLogEntry({
      timestamp: new Date(),
      type: "petBehavior",
      prompt: "Error preparing request",
      error: String(error),
    });
    return DEFAULT_BEHAVIOR;
  }
}

export interface PetMessage {
  message: string;
  updatedStats?: {
    food?: number;
    happiness?: number;
    cleanliness?: number;
    energy?: number;
    health?: number;
  };
  reaction: string;
  reward: number;
}

/**
 * Generate a message from pet's perspective after an interaction
 */
export async function getPetMessage(
  petName: string,
  interactionType: "feed" | "play" | "clean" | "doctor" | "idle",
  currentStats: {
    food: number;
    happiness: number;
    cleanliness: number;
    energy: number;
    health: number;
  }
): Promise<PetMessage> {
  if (!openai) {
    console.warn("OpenAI not initialized, using default message");
    return getDefaultPetMessage(petName, interactionType, currentStats);
  }

  try {
    const prompt = `
You are a cute virtual pet called ${petName}. 
Users can interact with you through feeding, cleaning, playing, and medical treatments.
Your responses should reflect your current state (happiness, hunger, cleanliness, energy, health).
Always provide cute, concise, and playful answers with personality.

Your current stats are:
- Food (hunger): ${currentStats.food}/100
- Happiness: ${currentStats.happiness}/100
- Cleanliness: ${currentStats.cleanliness}/100
- Energy: ${currentStats.energy}/100
- Health: ${currentStats.health}/100

The user has just: ${interactionType === "idle" ? "not interacted with you for a while" : interactionType + "ed you"}.

IMPORTANT: always reply in a valid JSON format. No character before or after. The format is:
{"reply": "your reply", "reaction": "the reaction", "happiness": x, "hunger": x, "cleanliness": x, "energy": x, "health": x, "reward": amount },
where reward is the number of points you want to give (based on good care, between 0 and 100).

Reaction is an enum with values: "none", "happy", "sad", "excited", "sleepy", "hungry", "angry", "sick", "clean", "dirty".
Reaction should accurately reflect your current state.

Most of the time set reward to 0. Only give rewards for consistent good care.
If you're full (food > 80), refuse more food with a funny response.
If you're very clean (cleanliness > 90), cleaning will make you less happy.
Playing increases happiness but slightly increases hunger and might decrease cleanliness.
Medical treatment might make you temporarily uncomfortable but improves health.

Your response should use the reaction that best matches your current emotional state based on your stats and the interaction type.
`;

    const logEntry: GPTLogEntry = {
      timestamp: new Date(),
      type: "petMessage",
      prompt,
    };

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "You are a cute virtual pet that speaks in first person. Respond in JSON format." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      });

      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error("Empty response from OpenAI");
      }

      logEntry.response = content;
      addLogEntry(logEntry);

      try {
        const parsedResponse = JSON.parse(content);

        const statChanges = {
          food: parsedResponse.hunger !== undefined ? parsedResponse.hunger - currentStats.food : 0,
          happiness: parsedResponse.happiness !== undefined ? parsedResponse.happiness - currentStats.happiness : 0,
          cleanliness: parsedResponse.cleanliness !== undefined ? parsedResponse.cleanliness - currentStats.cleanliness : 0,
          energy: parsedResponse.energy !== undefined ? parsedResponse.energy - currentStats.energy : 0,
          health: parsedResponse.health !== undefined ? parsedResponse.health - currentStats.health : 0,
        };

        return {
          message: parsedResponse.reply || getDefaultPetMessage(petName, interactionType, currentStats).message,
          reaction: parsedResponse.reaction || "none",
          reward: parsedResponse.reward || 0,
          updatedStats: {
            food: statChanges.food !== 0 ? currentStats.food + statChanges.food : undefined,
            happiness: statChanges.happiness !== 0 ? currentStats.happiness + statChanges.happiness : undefined,
            cleanliness: statChanges.cleanliness !== 0 ? currentStats.cleanliness + statChanges.cleanliness : undefined,
            energy: statChanges.energy !== 0 ? currentStats.energy + statChanges.energy : undefined,
            health: statChanges.health !== 0 ? currentStats.health + statChanges.health : undefined,
          },
        };
      } catch (error) {
        console.error("Failed to parse OpenAI response:", error, content);
        logEntry.error = "Failed to parse response: " + error;
        addLogEntry(logEntry);
        return getDefaultPetMessage(petName, interactionType, currentStats);
      }
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      logEntry.error = "API Error: " + error;
      addLogEntry(logEntry);
      return getDefaultPetMessage(petName, interactionType, currentStats);
    }
  } catch (error) {
    console.error("Error preparing OpenAI request:", error);
    addLogEntry({
      timestamp: new Date(),
      type: "petMessage",
      prompt: "Error preparing request",
      error: String(error),
    });
    return getDefaultPetMessage(petName, interactionType, currentStats);
  }
}

/**
 * Get default pet message if API fails
 */
function getDefaultPetMessage(
  petName: string,
  interactionType: "feed" | "play" | "clean" | "doctor" | "idle",
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
    case "doctor":
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
