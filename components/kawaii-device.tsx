import React, { useCallback, useEffect } from 'react';
import { dbService } from '../services/dbService';

const KawaiiDevice: React.FC = () => {
  const loadUserActivities = useCallback(async () => {
    if (!userData?.uid) {
      console.log("loadUserActivities: User data or UID not available yet.");
      return;
    }
    if (!dbService) {
      console.error("loadUserActivities: dbService is not initialized.");
      return;
    }
    console.log(`loadUserActivities: Loading activities for UID: ${userData.uid}`);
    setIsLoadingActivities(true);
    try {
      const activities = await dbService.getUserActivities(userData.uid, 100);
      // ... existing code ...
    } catch (error) {
      console.error(`loadUserActivities: Error fetching user activities for UID ${userData.uid}:`, error);
      // ... existing code ...
    } finally {
      setIsLoadingActivities(false);
    }
  }, [userData, dbService]);

  useEffect(() => {
    if (userData?.uid && dbService) {
      loadUserActivities();
    }
  }, [userData, dbService, loadUserActivities]);

  return (
    // ... rest of the component code ...
  );
};

export default KawaiiDevice; 