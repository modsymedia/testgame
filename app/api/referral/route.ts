import { NextRequest, NextResponse } from 'next/server';
import { dbService } from '@/lib/database-service';
import { User } from '@/lib/models';
import { PointsManager } from '@/lib/points-manager';

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
    // Expect userUid instead of userWallet
    const { userUid, referralCode } = await request.json();
    
    if (!userUid || !referralCode) {
      return NextResponse.json({ 
        success: false, 
        // Updated error message
        error: 'User UID and referral code are required' 
      }, { status: 400 });
    }
    
    // Check if the user exists using UID
    let user: User | null;
    try {
      user = await dbService.getUserByUid(userUid);
      console.log('Found user by UID:', user ? 'Yes' : 'No');
    } catch (error) {
      console.error('Error getting user data by UID:', error);
      return handleDatabaseError(error);
    }
    
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }
    
    // Check if user already has a referrer (using uid in referredBy)
    if (user.referredBy) { // Check if the field exists
      return NextResponse.json({ 
        success: false, 
        error: 'User is already referred by someone' 
      }, { status: 400 });
    }
    
    // Find the referrer strictly by UID (referralCode)
    let referrers: User[];
    try {
      referrers = await dbService.queryUsers({ uid: referralCode });
      console.log(`Found ${referrers?.length || 0} referrers by UID`);
      
      // REMOVED: Public key fragment fallback search
      /*
      if (!referrers || referrers.length === 0) {
        console.log('Trying to find referrer by public key fragment:', referralCode);
        const allUsers = await dbService.queryUsers({});
        referrers = allUsers.filter(user => 
          user.walletAddress && user.walletAddress.startsWith(referralCode)
        );
        console.log(`Found ${referrers.length} potential referrers by public key fragment`);
      }
      */
    } catch (error) {
      return handleDatabaseError(error);
    }
    
    if (!referrers || referrers.length === 0) {
      return NextResponse.json({ 
        success: false, 
        // Updated error message
        error: 'Invalid referral code (UID not found)' 
      }, { status: 404 });
    }
    
    const referrer = referrers[0] as User;
    
    // Check if user is trying to refer themselves using UID
    if (referrer.uid === user.uid) {
      return NextResponse.json({ 
        success: false, 
        error: 'You cannot refer yourself' 
      }, { status: 400 });
    }
    
    // Update user with referrer's UID
    try {
      // user.uid is already confirmed to exist here
      await dbService.updateUserData(user.uid, {
        // Store referrer's UID
        referredBy: referrer.uid
      });
      console.log(`Successfully updated referredBy for user UID ${user.uid} to referrer UID ${referrer.uid}`);
    } catch (error) {
      console.error(`Error updating referredBy for user UID: ${user?.uid}`, error);
      return handleDatabaseError(error);
    }
    
    // --- Referrer Count Update remains COMMENTED OUT --- 
    
    // Award points to referrer - use standard points awarding method (still requires walletAddress)
    const pointsManager = PointsManager.instance;
    let awardResult = { points: 0, success: false };
    try {
      // Only award points if the referrer has a wallet address (as PointsManager expects it)
      if (referrer.walletAddress) {
          awardResult = await pointsManager.awardPoints(
            referrer.walletAddress, // Pass wallet address to PointsManager
            100, 
            'interaction' as any, 
            'earn',
            // Pass referred user's UID in metadata
            { referredUserUid: user.uid } 
          );
      } else {
          console.warn(`Referrer UID ${referrer.uid} has no wallet address. Skipping point award.`);
      }
    } catch (error) {
      console.error('Error awarding points:', error);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Referral applied successfully',
      // Return referrer UID instead of wallet
      referrerUid: referrer.uid, 
      pointsAwarded: awardResult?.points || 0
    });
    
  } catch (error) {
    return handleDatabaseError(error);
  }
}

export async function GET(request: NextRequest) {
  try {
    // Expect uid instead of wallet
    const userUid = request.nextUrl.searchParams.get('uid');
    
    if (!userUid) {
      return NextResponse.json({ 
        success: false, 
        // Updated error message
        error: 'User UID is required' 
      }, { status: 400 });
    }
    
    // userUid is guaranteed to be a string here
    
    // Get users referred by this user's UID
    let referredUsers: User[];
    try {
      // Query using referredBy with the user's UID
      const criteria = { referredBy: userUid } as { referredBy?: string | undefined };
      referredUsers = await dbService.queryUsers(criteria);
      
      // Log using UID
      console.log(`Found ${referredUsers.length} referred users for UID ${userUid}`); 
      
    } catch (error) {
      return handleDatabaseError(error);
    }
    
    return NextResponse.json({
      success: true,
      referrals: referredUsers.map(user => {
        // Map data as before, using UID as the primary identifier
        return {
          username: user.username || user.walletAddress?.substring(0, 6) + '...' || 'Unknown',
          walletAddress: user.walletAddress || 'Unknown', // Still useful to display
          joinedAt: (user as any).createdAt || Date.now(), 
          // pointsEarned still needs clarification
          pointsEarned: 0, 
          // Optionally include referred user's UID
          uid: user.uid
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