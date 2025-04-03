import { NextApiRequest, NextApiResponse } from 'next';
import { pointsManager, PointSource, PointOperation } from '../../lib/points-manager';
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
        // Get points data
        await handleGetPoints(req, res);
        break;
      
      case 'POST':
        // Award points
        await handleAwardPoints(req, res);
        break;
      
      case 'PUT':
        // Deduct points
        await handleDeductPoints(req, res);
        break;
      
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT']);
        res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('Points API error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
}

// Handle GET request to retrieve points data
async function handleGetPoints(req: NextApiRequest, res: NextApiResponse) {
  const walletAddress = req.query.walletAddress as string;
  
  if (!walletAddress) {
    return res.status(400).json({ success: false, message: 'Wallet address is required' });
  }
  
  // Get transaction history if requested
  const includeHistory = req.query.includeHistory === 'true';
  
  // Get points data
  const pointsData = await pointsManager.getUserPointsData(walletAddress);
  
  // Get user from DB to get additional info
  const user = await dbService.getUserData(walletAddress);
  if (!user) {
    return res.status(404).json({ success: false, message: 'User not found' });
  }
  
  // Prepare response
  const response: any = {
    success: true,
    data: {
      ...pointsData,
      referralCount: user.referralCount || 0,
      referralPoints: user.referralPoints || 0,
      referralCode: user.referralCode || null,
      achievements: (user.cooldowns?.achievements ? 
        Object.keys(user.cooldowns.achievements).length : 0)
    }
  };
  
  // Include transaction history if requested
  if (includeHistory) {
    response.data.history = pointsManager.getTransactionHistory(walletAddress);
  }
  
  return res.status(200).json(response);
}

// Handle POST request to award points
async function handleAwardPoints(req: NextApiRequest, res: NextApiResponse) {
  const walletAddress = req.body.walletAddress as string;
  const amount = parseInt(req.body.amount as string || '0', 10);
  const source = req.body.source as PointSource;
  const operation = req.body.operation as PointOperation || 'earn';
  const metadata = req.body.metadata || {};
  
  // Validate request
  if (!walletAddress) {
    return res.status(400).json({ success: false, message: 'Wallet address is required' });
  }
  
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid amount is required' });
  }
  
  if (!source || !['gameplay', 'daily', 'achievement', 'referral', 'streak', 'interaction', 'purchase'].includes(source)) {
    return res.status(400).json({ success: false, message: 'Valid source is required' });
  }
  
  // Handle specific point types
  let result;
  
  switch (source) {
    case 'daily':
      result = await pointsManager.awardDailyBonus(walletAddress);
      break;
      
    case 'achievement':
      if (!req.body.achievementId) {
        return res.status(400).json({ success: false, message: 'Achievement ID is required' });
      }
      result = await pointsManager.awardAchievement(walletAddress, req.body.achievementId, metadata);
      break;
      
    case 'gameplay':
      const score = parseInt(req.body.score as string || '0', 10);
      if (isNaN(score) || score < 0) {
        return res.status(400).json({ success: false, message: 'Valid score is required for gameplay points' });
      }
      result = await pointsManager.awardGameplayPoints(walletAddress, score, metadata);
      break;
      
    case 'interaction':
      const interactionType = req.body.interactionType as string;
      if (!interactionType) {
        return res.status(400).json({ success: false, message: 'Interaction type is required' });
      }
      result = await pointsManager.awardInteractionPoints(walletAddress, interactionType);
      break;
      
    case 'referral':
      const referredWalletAddress = req.body.referredWalletAddress as string;
      if (!referredWalletAddress) {
        return res.status(400).json({ success: false, message: 'Referred wallet address is required' });
      }
      result = await pointsManager.awardReferralPoints(walletAddress, referredWalletAddress);
      break;
      
    default:
      // For any other point type, use the generic award points
      result = await pointsManager.awardPoints(walletAddress, amount, source, operation, metadata);
  }
  
  if (!result.success) {
    return res.status(400).json({ 
      success: false, 
      message: 'Failed to award points', 
      details: result 
    });
  }
  
  return res.status(200).json({
    success: true,
    message: 'Points awarded successfully',
    data: result
  });
}

// Handle PUT request to deduct points
async function handleDeductPoints(req: NextApiRequest, res: NextApiResponse) {
  const walletAddress = req.body.walletAddress as string;
  const amount = parseInt(req.body.amount as string || '0', 10);
  const source = req.body.source as PointSource;
  const metadata = req.body.metadata || {};
  
  // Validate request
  if (!walletAddress) {
    return res.status(400).json({ success: false, message: 'Wallet address is required' });
  }
  
  if (isNaN(amount) || amount <= 0) {
    return res.status(400).json({ success: false, message: 'Valid amount is required' });
  }
  
  if (!source) {
    return res.status(400).json({ success: false, message: 'Source is required' });
  }
  
  // Deduct points
  const result = await pointsManager.deductPoints(walletAddress, amount, source, metadata);
  
  if (!result.success) {
    return res.status(400).json({ 
      success: false, 
      message: 'Failed to deduct points', 
      details: result 
    });
  }
  
  return res.status(200).json({
    success: true,
    message: 'Points deducted successfully',
    data: result
  });
} 