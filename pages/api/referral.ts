import { NextApiRequest, NextApiResponse } from 'next';
import clientPromise from '@/lib/mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Check if MongoDB is configured
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('username:password')) {
      return res.status(200).json({ 
        success: false, 
        error: 'MongoDB not properly configured',
        source: 'config'
      });
    }
    
    const client = await clientPromise;
    const db = client.db('Cluster0');
    const collection = db.collection('users');
    
    // GET: Check referral code validity
    if (req.method === 'GET') {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({ success: false, error: 'Referral code is required' });
      }
      
      const referrer = await collection.findOne({ referralCode: code });
      
      if (!referrer) {
        return res.status(404).json({ success: false, error: 'Invalid referral code' });
      }
      
      // Check if referrer has reached the maximum referrals limit (50 active referrals)
      if ((referrer.referralCount || 0) >= 50) {
        return res.status(400).json({ 
          success: false, 
          error: 'Referrer has reached the maximum referrals limit' 
        });
      }
      
      // Return referrer information
      return res.status(200).json({
        success: true,
        valid: true,
        referrer: {
          walletAddress: referrer.walletAddress,
          username: referrer.username || referrer.walletAddress.substring(0, 6) + '...',
          referralCount: referrer.referralCount || 0
        }
      });
    }
    
    // POST: Apply a referral
    if (req.method === 'POST') {
      const { walletAddress, referralCode } = req.body;
      
      if (!walletAddress || !referralCode) {
        return res.status(400).json({ 
          success: false, 
          error: 'Wallet address and referral code are required' 
        });
      }
      
      // Verify the user exists
      const user = await collection.findOne({ walletAddress });
      
      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      
      // Check if user already has a referrer
      if (user.referredBy) {
        return res.status(400).json({ 
          success: false, 
          error: 'User is already referred by someone' 
        });
      }
      
      // Check if user is trying to refer themselves
      if (user.referralCode === referralCode) {
        return res.status(400).json({ 
          success: false, 
          error: 'You cannot refer yourself' 
        });
      }
      
      // Find the referrer
      const referrer = await collection.findOne({ referralCode });
      
      if (!referrer) {
        return res.status(404).json({ success: false, error: 'Invalid referral code' });
      }
      
      // Check if referrer has reached the maximum referrals limit
      if ((referrer.referralCount || 0) >= 50) {
        return res.status(400).json({ 
          success: false, 
          error: 'Referrer has reached the maximum referrals limit' 
        });
      }
      
      // Update user with referrer info
      await collection.updateOne(
        { walletAddress },
        { $set: { referredBy: referrer.walletAddress } }
      );
      
      // Update referrer's referral count
      await collection.updateOne(
        { walletAddress: referrer.walletAddress },
        { $inc: { referralCount: 1 } }
      );
      
      // Check if user has earned at least 100 points to trigger referral reward
      if ((user.points || 0) >= 100) {
        // Calculate and award referral bonus (10% of points, max 1000)
        const referralBonus = Math.min(1000, Math.floor((user.points || 0) * 0.1));
        
        await collection.updateOne(
          { walletAddress: referrer.walletAddress },
          { 
            $inc: { 
              referralPoints: referralBonus,
              points: referralBonus
            } 
          }
        );
        
        // Return success with bonus info
        return res.status(200).json({
          success: true,
          message: 'Referral applied and bonus awarded',
          referrerWallet: referrer.walletAddress,
          bonusAwarded: referralBonus
        });
      }
      
      // Return success without bonus (user hasn't earned enough points yet)
      return res.status(200).json({
        success: true,
        message: 'Referral applied successfully',
        referrerWallet: referrer.walletAddress,
        bonusAwarded: 0
      });
    }
    
    // Handle unsupported methods
    return res.status(405).json({ success: false, error: 'Method not allowed' });
    
  } catch (error) {
    console.error('Referral API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
} 