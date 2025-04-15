"use client";

import { useEffect, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useUserData } from '@/context/UserDataContext';
import { dbService } from '@/lib/database-service';

export default function UidGenerator() {
  const { publicKey, isConnected } = useWallet();
  const { userData, updatePoints } = useUserData();
  const [uidGenerated, setUidGenerated] = useState(false);

  useEffect(() => {
    // Log initial state
    console.log('UidGenerator - Initial State:', {
      isConnected,
      publicKey: publicKey?.substring(0, 10) + '...',
      hasUid: Boolean(userData.uid), 
      uid: userData.uid
    });

    if (isConnected && publicKey && !userData.uid && !uidGenerated) {
      console.log('UidGenerator - No UID found, generating one');
      
      const generateAndSaveUid = async () => {
        try {
          // Generate a uid (using a simple approach)
          const generatedUid = `user_${publicKey.slice(0, 8)}_${Date.now()}`;
          console.log('UidGenerator - Generated UID:', generatedUid);
          
          // Save the UID to the database
          await dbService.updateUserData(publicKey, {
            uid: generatedUid
          });
          
          console.log('UidGenerator - UID saved successfully');
          
          // Flag that we've generated a UID
          setUidGenerated(true);
          
          // Force a sync by doing a small points update
          // This will refresh the UserData context with the new UID
          await updatePoints(userData.points);
          
          console.log('UidGenerator - Forced sync to update context data');
          
          // Add a direct check after a short delay to verify the UID is now available
          setTimeout(async () => {
            const userData = await dbService.getWalletByPublicKey(publicKey);
            console.log('UidGenerator - Verification check:', { 
              uidExists: Boolean(userData?.uid),
              uid: userData?.uid
            });
          }, 1000);
        } catch (error) {
          console.error('UidGenerator - Error generating/saving UID:', error);
        }
      };
      
      generateAndSaveUid();
    } else if (userData.uid) {
      console.log('UidGenerator - User already has UID:', userData.uid);
      
      // Double check the value actually exists in the DB
      if (publicKey) {
        dbService.getWalletByPublicKey(publicKey).then(dbData => {
          console.log('UidGenerator - Database UID verification:', {
            contextUid: userData.uid,
            dbUid: dbData?.uid,
            match: userData.uid === dbData?.uid
          });
          
          // If mismatch, force an update
          if (dbData && (!dbData.uid || dbData.uid !== userData.uid)) {
            console.log('UidGenerator - UID mismatch, updating DB');
            dbService.updateUserData(publicKey, { uid: userData.uid });
          }
        });
      }
    }
  }, [isConnected, publicKey, userData, updatePoints, uidGenerated]);

  // This component doesn't render anything visible
  return null;
} 