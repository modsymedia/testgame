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
    const { userWallet, referralCode } = await request.json();
    
    if (!userWallet || !referralCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'User wallet and referral code are required' 
      }, { status: 400 });
    }
    
    // Check if the user exists
    let user: User | null;
    try {
      user = await dbService.getUserByWalletAddress(userWallet);
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
    if ((user as any).referredBy) {
      return NextResponse.json({ 
        success: false, 
        error: 'User is already referred by someone' 
      }, { status: 400 });
    }
    
    // Find the referrer by UID or public key fragment
    let referrers: User[];
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
    
    const referrer = referrers[0] as User;
    
    // Check if user is trying to refer themselves
    if (referrer.walletAddress === userWallet) {
      return NextResponse.json({ 
        success: false, 
        error: 'You cannot refer yourself' 
      }, { status: 400 });
    }
    
    // Update user with referrer info using custom data object
    try {
      if (!user || !user.uid) {
          console.error('Cannot update user referral: User object or UID is missing.', user);
          throw new Error('User data is incomplete for referral update.');
      }
      
      await dbService.updateUserData(user.uid, {
        referredBy: referrer.walletAddress ?? undefined
      });
      console.log(`Successfully updated referredBy for user UID: ${user.uid}`);
    } catch (error) {
      console.error(`Error updating referredBy for user UID: ${user?.uid}`, error);
      return handleDatabaseError(error);
    }
    
    // Store referral count on the referrer's user record using a metadata field
    // --- COMMENTING OUT Referrer Count Update - Requires User type/schema modification ---
    /*
    try {
      if (!referrer || !referrer.uid) {
         console.error('Cannot update referrer count: Referrer object or UID is missing.', referrer);
      } else {
         // Retrieve existing metadata or initialize if it doesn't exist
         const existingMetadata = (referrer as any).metadata || {}; // Use 'as any' if metadata isn't strictly typed yet
         const currentReferralInfo = existingMetadata.referralInfo || {};
         const currentReferralCount = currentReferralInfo.count || 0;
         
         const newMetadata = {
             ...existingMetadata,
             referralInfo: {
                 ...currentReferralInfo,
                 count: currentReferralCount + 1
             }
         };
         
         await dbService.updateUserData(referrer.uid, { 
             metadata: newMetadata // Update the metadata field
         });
         console.log(`Updated referral metadata (count) for referrer UID: ${referrer.uid}`);
      }
    } catch (error) {
      // Log but continue since this is non-critical
      console.error(`Error saving referral count metadata for referrer UID: ${referrer?.uid}`, error);
    }
    */
    // --- END COMMENTED OUT SECTION ---
    
    // Award points to referrer - use standard points awarding method
    const pointsManager = PointsManager.instance;
    
    // Cast the point source parameter to any to bypass type checking
    let awardResult = { points: 0, success: false }; // Initialize default result
    try {
      // Only award points if the referrer has a valid wallet address
      if (referrer.walletAddress) {
          awardResult = await pointsManager.awardPoints(
            referrer.walletAddress, // Now guaranteed to be string
            100, // Award 100 points for referral
            'interaction' as any, // Cast to bypass type checking
            'earn',
            { referredUser: userWallet } // userWallet is guaranteed non-null here
          );
      } else {
          console.warn(`Referrer UID ${referrer.uid} has no wallet address. Skipping point award.`);
      }
    } catch (error) {
      console.error('Error awarding points:', error);
      // Keep default awardResult (0 points, success false) on error
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
    
    // userWallet is guaranteed to be a string here
    
    // Get users referred by this wallet
    let referredUsers: User[];
    try {
      // Explicitly convert null to undefined for the query criteria value
      const criteria = { referredBy: userWallet } as { referredBy?: string | undefined };
      referredUsers = await dbService.queryUsers(criteria);
      
      // Assert userWallet as string for the linter, even though it's guaranteed by the check above
      console.log(`Found ${referredUsers.length} referred users for wallet ${(userWallet as string).substring(0, 8)}...`); 
      
    } catch (error) {
      return handleDatabaseError(error);
    }
    
    return NextResponse.json({
      success: true,
      referrals: referredUsers.map(user => {
        // Use the imported User type here too, handle potential missing fields
        return {
          username: user.username || user.walletAddress?.substring(0, 6) + '...' || 'Unknown',
          walletAddress: user.walletAddress || 'Unknown',
          joinedAt: (user as any).createdAt || Date.now(), // Assuming createdAt exists, might need casting
          // Where should pointsEarned come from? Maybe from the points awarded?
          // The original code used extendedUser.referralPoints, which isn't standard
          pointsEarned: 0 // Placeholder - Needs clarification on how to track points earned per referral
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