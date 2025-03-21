import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';
import { PetMessage } from '@/utils/openai-service';

// Initialize OpenAI API with server environment variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse and validate request
    const { petName, interactionType, petStats } = req.body;
    
    if (!petName || !interactionType || !petStats) {
      return res.status(400).json({ 
        error: 'Missing required parameters',
        _logInfo: {
          prompt: JSON.stringify({ petName, interactionType, petStats }),
          error: 'Missing required parameters in pet message request',
          timestamp: new Date(),
          type: 'petMessage' as const
        }
      });
    }

    // Construct the prompt based on pet and interaction type
    const prompt = `
Generate a short message (max 150 characters) from a virtual pet named ${petName} after the owner has ${interactionType === 'idle' ? 'checked on them' : interactionType + 'ed them'}.

Current pet stats (out of 100):
- Food: ${petStats.food}
- Happiness: ${petStats.happiness}
- Cleanliness: ${petStats.cleanliness}
- Energy: ${petStats.energy}
- Health: ${petStats.health}

The pet should respond in a cute way based on the interaction type and their current stats.
For feeding: hungrier pets are more grateful
For playing: happier pets are more excited
For cleaning: dirtier pets express more relief
For healing: sicker pets show more gratitude
For idle checking: base response on the lowest stat

Also include:
1. An appropriate reaction emoji type (one of: none, happy, sad, excited, sleepy, hungry, angry, sick, clean, dirty)
2. A small random reward amount (0-5) for the owner based on how appropriate the action was for the pet's needs

Return your response as valid JSON with this structure:
{
  "message": "The pet's message here",
  "reaction": "appropriate_reaction_type",
  "reward": reward_amount
}
`;

    console.log(`Generating message for pet: ${petName} after ${interactionType}`);

    // Make request to OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a virtual pet that responds to owner interactions. You only respond with short, cute messages that reflect your personality and current state. Always respond in valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    // Check if we got a response
    if (!completion.choices || completion.choices.length === 0 || !completion.choices[0].message) {
      console.error("Empty response from OpenAI");
      return res.status(500).json({ 
        error: "Empty response from AI",
        message: `*confused pet noises*`,
        reaction: "none",
        reward: 0,
        _logInfo: {
          prompt,
          error: "Empty response from OpenAI",
          timestamp: new Date(),
          type: 'petMessage' as const
        }
      });
    }

    // Parse the response
    const responseContent = completion.choices[0].message.content || "{}";
    
    try {
      // Try to parse the response as JSON
      const petMessage: PetMessage = JSON.parse(responseContent);
      
      // Add log info to the response for client-side logging
      const responseWithLog = {
        ...petMessage,
        _logInfo: {
          prompt,
          response: petMessage,
          timestamp: new Date(),
          type: 'petMessage' as const
        }
      };
      
      return res.status(200).json(responseWithLog);
    } catch (error) {
      // Handle JSON parsing error
      console.error("Error parsing OpenAI response:", error);
      return res.status(500).json({ 
        error: "Error parsing response",
        message: `*confused pet noises*`,
        reaction: "none",
        reward: 0,
        _logInfo: {
          prompt,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date(),
          type: 'petMessage' as const
        }
      });
    }
  } catch (error) {
    // Handle any other errors
    console.error("Error in pet message API:", error);
    return res.status(500).json({ 
      error: "Server error",
      message: `*confused pet noises*`,
      reaction: "none",
      reward: 0,
      _logInfo: {
        prompt: "Error occurred before prompt generation",
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date(),
        type: 'petMessage' as const
      }
    });
  }
} 