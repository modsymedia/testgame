import { NextApiRequest, NextApiResponse } from 'next';

// Shared log storage across API endpoints
interface GPTLogEntry {
  timestamp: Date;
  type: 'petBehavior' | 'petMessage';
  prompt: string;
  response?: any;
  error?: string;
}

// In a production app, you'd use a more robust storage solution
// like a database. For this demo, we'll use a simple in-memory solution.
// This is a workaround for the module import issue
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // For security, only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'This endpoint is only available in development mode' });
  }

  try {
    // Due to how NextJS API routes work, we can't easily share data between routes
    // In a real app, you would use a database or Redis to store logs
    // For this demo, we'll just return a message explaining the limitation
    
    return res.status(200).json({
      message: "Log retrieval is limited in this demo version. In a production app, logs would be stored in a database for proper retrieval across API routes.",
      logs: []
    });
  } catch (error) {
    console.error("Error retrieving GPT logs:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
} 