import { NextApiRequest, NextApiResponse } from 'next';
import { dbService } from '../../lib/database-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if the request has a wallet address
  const walletAddress = req.query.walletAddress as string || req.body?.walletAddress;
  
  if (!walletAddress) {
    return res.status(400).json({ success: false, message: 'Wallet address is required' });
  }
  
  try {
    switch (req.method) {
      case 'GET':
        // Get game session details
        await handleGetSession(req, res);
        break;
      
      case 'POST':
        // Create a new game session
        await handleCreateSession(req, res);
        break;
      
      case 'PUT':
        // Update game session
        await handleUpdateSession(req, res);
        break;
      
      case 'DELETE':
        // End game session
        await handleEndSession(req, res);
        break;
      
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Game session API error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Handle GET request to retrieve session details
async function handleGetSession(req: NextApiRequest, res: NextApiResponse) {
  const sessionId = req.query.sessionId as string;
  
  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'Session ID is required' });
  }
  
  const session = await dbService.getGameSession(sessionId);
  
  if (!session) {
    return res.status(404).json({ success: false, message: 'Game session not found' });
  }
  
  return res.status(200).json({ 
    success: true, 
    data: session 
  });
}

// Handle POST request to create a new session
async function handleCreateSession(req: NextApiRequest, res: NextApiResponse) {
  const walletAddress = req.body.walletAddress as string;
  
  if (!walletAddress) {
    return res.status(400).json({ success: false, message: 'Wallet address is required' });
  }
  
  // Create a new session
  const sessionId = await dbService.createGameSession(walletAddress);
  
  if (!sessionId) {
    return res.status(500).json({ success: false, message: 'Failed to create game session' });
  }
  
  // Get the created session
  const session = await dbService.getGameSession(sessionId);
  
  return res.status(201).json({
    success: true,
    message: 'Game session created successfully',
    data: session
  });
}

// Handle PUT request to update session
async function handleUpdateSession(req: NextApiRequest, res: NextApiResponse) {
  const sessionId = req.query.sessionId as string || req.body.sessionId;
  const gameState = req.body.gameState;
  
  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'Session ID is required' });
  }
  
  if (!gameState) {
    return res.status(400).json({ success: false, message: 'Game state is required' });
  }
  
  // Verify session exists
  const existingSession = await dbService.getGameSession(sessionId);
  
  if (!existingSession) {
    return res.status(404).json({ success: false, message: 'Game session not found' });
  }
  
  // Check if the wallet address in the request matches the session owner
  const walletAddress = req.query.walletAddress as string || req.body.walletAddress;
  
  if (walletAddress && existingSession.walletAddress !== walletAddress) {
    return res.status(403).json({ success: false, message: 'Not authorized to update this session' });
  }
  
  // Update the session
  const updated = await dbService.updateGameSession(sessionId, gameState);
  
  if (!updated) {
    return res.status(500).json({ success: false, message: 'Failed to update game session' });
  }
  
  // Get the updated session
  const updatedSession = await dbService.getGameSession(sessionId);
  
  return res.status(200).json({
    success: true,
    message: 'Game session updated successfully',
    data: updatedSession
  });
}

// Handle DELETE request to end session
async function handleEndSession(req: NextApiRequest, res: NextApiResponse) {
  const sessionId = req.query.sessionId as string;
  
  if (!sessionId) {
    return res.status(400).json({ success: false, message: 'Session ID is required' });
  }
  
  // Verify session exists
  const existingSession = await dbService.getGameSession(sessionId);
  
  if (!existingSession) {
    return res.status(404).json({ success: false, message: 'Game session not found' });
  }
  
  // Check if the wallet address in the request matches the session owner
  const walletAddress = req.query.walletAddress as string || req.body.walletAddress;
  
  if (walletAddress && existingSession.walletAddress !== walletAddress) {
    return res.status(403).json({ success: false, message: 'Not authorized to end this session' });
  }
  
  // End the session
  const ended = await dbService.endGameSession(sessionId);
  
  if (!ended) {
    return res.status(500).json({ success: false, message: 'Failed to end game session' });
  }
  
  return res.status(200).json({
    success: true,
    message: 'Game session ended successfully'
  });
} 