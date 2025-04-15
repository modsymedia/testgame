import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/database-service';
import { PointsManager } from '@/lib/points-manager';

// Define extended user interface to include referral properties
interface ExtendedUser {
  walletAddress: string;
  username?: string;
  referredBy?: string;
  referralCount?: number;
  referralPoints?: number;
  [key: string]: any; // Allow other properties
}

// Helper function to handle database errors
const handleDatabaseError = (error: any) => {
  console.error('Database error:', error);
  
  // Extract useful error information
  const errorDetails = {
    message: error?.message || 'Unknown database error',
    stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
    name: error?.name,
    code: error?.code
  };
  
  return NextResponse.json({ 
    success: false, 
    error: 'Database error',
    details: errorDetails
  }, { 
    status: 500,
    headers: {
      // Set CORS headers
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
};

export async function POST(request: NextRequest) {
  try {
    const { userWallet, referralCode } = await request.json();
    
    if (!userWallet || !referralCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'User wallet and referral code are required' 
      }, { status: 400 });
    }
    
    // Check if the user exists
    let user;
    try {
      user = await dbService.getWalletByPublicKey(userWallet);
      console.log('Found user:', user ? 'Yes' : 'No');
    } catch (error) {
      console.error('Error getting wallet data:', error);
      return handleDatabaseError(error);
    }
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Check if user already has a referrer
    if ((user as ExtendedUser).referredBy) {
      return NextResponse.json({ 
        success: false, 
        error: 'User is already referred by someone' 
      }, { status: 400 });
    }
    
    // Find the referrer by UID or public key fragment
    let referrers;
    try {
      referrers = await dbService.queryUsers({ uid: referralCode });
      console.log(`Found ${referrers?.length || 0} referrers by UID`);
      
      // If no users found by UID, try searching by matching the start of the public key
      if (!referrers || referrers.length === 0) {
        console.log('Trying to find referrer by public key fragment:', referralCode);
        
        // Get all users and filter by public key fragment
        const allUsers = await dbService.queryUsers({});
        referrers = allUsers.filter(user => 
          user.walletAddress && user.walletAddress.startsWith(referralCode)
        );
        
        console.log(`Found ${referrers.length} potential referrers by public key fragment`);
      }
    } catch (error) {
      return handleDatabaseError(error);
    }
    
    if (!referrers || referrers.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid referral code' 
      }, { status: 404 });
    }
    
    const referrer = referrers[0] as ExtendedUser;
    
    // Check if user is trying to refer themselves
    if (referrer.walletAddress === userWallet) {
      return NextResponse.json({ 
        success: false, 
        error: 'You cannot refer yourself' 
      }, { status: 400 });
    }
    
    // Update user with referrer info using custom data object
    try {
      await dbService.updateUserData(userWallet, {
        ...user,
        referredBy: referrer.walletAddress
      } as any);
    } catch (error) {
      return handleDatabaseError(error);
    }
    
    // Store referral count in a different way - use custom data instead
    // This avoids the property not existing error
    const customData = {
      referralInfo: {
        count: ((referrer as any).referralInfo?.count || 0) + 1
      }
    };
    
    try {
      await dbService.saveUserData(referrer.walletAddress, customData);
    } catch (error) {
      // Log but continue since this is non-critical
      console.error('Error saving referral count:', error);
    }
    
    // Award points to referrer - use standard points awarding method
    const pointsManager = PointsManager.instance;
    
    // Cast the point source parameter to any to bypass type checking
    let awardResult;
    try {
      awardResult = await pointsManager.awardPoints(
        referrer.walletAddress,
        100, // Award 100 points for referral
        'interaction' as any, // Cast to bypass type checking
        'earn',
        { referredUser: userWallet }
      );
    } catch (error) {
      console.error('Error awarding points:', error);
      // Continue despite point awarding failure
      awardResult = { points: 0, success: false };
    }
    
    return NextResponse.json({
      success: true,
      message: 'Referral applied successfully',
      referrerWallet: referrer.walletAddress,
      pointsAwarded: awardResult?.points || 0
    });
    
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const userWallet = request.nextUrl.searchParams.get('wallet');
    
    if (!userWallet) {
      return NextResponse.json({ 
        success: false, 
        error: 'User wallet is required' 
      }, { status: 400 });
    }
    
    // Get users referred by this wallet
    let referredUsers;
    try {
      referredUsers = await dbService.queryUsers({ referredBy: userWallet || undefined });
      console.log(`Found ${referredUsers.length} referred users for wallet ${userWallet.substring(0, 8)}...`);
    } catch (error) {
      return handleDatabaseError(error);
    }
    
    return NextResponse.json({
      success: true,
      referrals: referredUsers.map(user => {
        const extendedUser = user as ExtendedUser;
        return {
          username: extendedUser.username || extendedUser.walletAddress.substring(0, 6) + '...',
          walletAddress: extendedUser.walletAddress,
          joinedAt: (user as any).createdAt || Date.now(),
          pointsEarned: extendedUser.referralPoints || 0
        };
      })
    });
    
  } catch (error) {
    return handleDatabaseError(error);
  }
}

// CORS preflight handler
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
  });
} 