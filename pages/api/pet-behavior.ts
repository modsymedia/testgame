import { NextApiRequest, NextApiResponse } from "next";
import { OpenAI } from "openai";
import { DEFAULT_BEHAVIOR, PetBehaviorData, PetBehaviorResult } from "@/utils/openai-service";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const petData: PetBehaviorData = req.body;

    if (!petData || !petData.petName) {
      return res.status(400).json({ error: "Invalid pet data" });
    }

    const petName = petData.petName;
    const currentStats = petData.currentStats || {
      food: 50,
      happiness: 50,
      cleanliness: 50,
      energy: 50,
      health: 50
    };
    
    const prompt = `
    Based on the following pet information, generate a custom behavior profile. 

    Pet name: ${petName}
    Time spent: ${petData.timeSpent || 0} minutes
    Time of day: ${petData.timeOfDay || 'day'}
    Day of week: ${petData.dayOfWeek || 'Monday'}
    
    Current stats:
    - Food: ${currentStats.food || 50}/100
    - Happiness: ${currentStats.happiness || 50}/100
    - Cleanliness: ${currentStats.cleanliness || 50}/100
    - Energy: ${currentStats.energy || 50}/100
    - Health: ${currentStats.health || 50}/100
    
    Activity counts:
    - Feeding: ${petData.activityCounts?.feed || 0} times
    - Playing: ${petData.activityCounts?.play || 0} times
    - Cleaning: ${petData.activityCounts?.clean || 0} times
    - Healing: ${petData.activityCounts?.heal || 0} times

    Based on this information, please generate:

    1. Custom decay rates (0.1-1.0) for each stat based on the pet's history and current situation
    2. Custom cooldown times (in seconds, 5-30) for each action based on the pet's personality
    3. 3-5 personality traits that describe this pet
    4. A short mood description based on current stats
    5. A piece of advice for the pet owner
    6. A point multiplier (0.8-1.5) based on how well the owner is taking care of their pet

    Format your response as a valid JSON object with the following structure:
    {
      "decayRates": {
        "food": number,
        "happiness": number,
        "cleanliness": number,
        "energy": number,
        "health": number
      },
      "cooldowns": {
        "feed": number,
        "play": number,
        "clean": number,
        "heal": number
      },
      "personality": string[],
      "moodDescription": string,
      "advice": string,
      "pointMultiplier": number
    }
    `;

    console.log(`Generating behavior for pet: ${petName}`);

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an AI pet behavior analyst that creates custom behavior profiles for virtual pets. Always respond with valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message) {
      console.error("Empty response from OpenAI");
      return res.status(500).json({ 
        error: "Empty response from AI", 
        fallback: DEFAULT_BEHAVIOR,
        _logInfo: {
          prompt,
          error: "Empty response from OpenAI",
          timestamp: new Date(),
          type: 'petBehavior' as const
        }
      });
    }

    const responseContent = completion.choices[0].message.content || "{}";
    
    try {
      const behaviorData: PetBehaviorResult = JSON.parse(responseContent);
      
      if (behaviorData.cooldowns) {
        Object.keys(behaviorData.cooldowns).forEach((key) => {
          const k = key as keyof typeof behaviorData.cooldowns;
          behaviorData.cooldowns[k] = Math.min(behaviorData.cooldowns[k], 30);
        });
      }
      
      const responseWithLog = {
        ...behaviorData,
        _logInfo: {
          prompt,
          timestamp: new Date(),
          type: 'petBehavior' as const
        }
      };
      
      return res.status(200).json(responseWithLog);
    } catch (error) {
      console.error("Error parsing OpenAI response:", error);
      return res.status(500).json({ 
        error: "Error parsing response", 
        fallback: DEFAULT_BEHAVIOR,
        _logInfo: {
          prompt,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          type: 'petBehavior' as const
        }
      });
    }
  } catch (error) {
    console.error("Error in pet behavior API:", error);
    return res.status(500).json({ 
      error: "Server error", 
      fallback: DEFAULT_BEHAVIOR,
      _logInfo: {
        prompt: "Error occurred before prompt generation",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        type: 'petBehavior' as const
      }
    });
  }
}
