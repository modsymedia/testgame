"use client";

import { useEffect, useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useUserData } from '@/context/UserDataContext';
import { useRouter } from 'next/navigation';
import { PointsDashboard } from '@/components/ui/points-dashboard';
import { dbService } from '@/lib/database-service';

export default function DashboardPage() {
  const router = useRouter();
  const { isConnected, publicKey } = useWallet();
  const { userData } = useUserData();
  const tokenPrice = 0.05; // Example token price in USD
  
  // Local state for dashboard data
  const [dashboardData, setDashboardData] = useState({
    points: 0,
    claimedPoints: 0,
    dollarsCollected: 500, // Hardcoded for now, could be fetched from API
  });

  // Redirect to landing if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);
  
  // Fetch fresh data when component mounts and when uid changes
  useEffect(() => {
    const userUid = userData?.uid;
    if (!userUid) return;
    
    const fetchFreshData = async () => {
      try {
        console.log(`Fetching fresh dashboard data for UID: ${userUid}`);
        const freshData = await dbService.getUserByUid(userUid);
        if (freshData) {
          setDashboardData({
            points: freshData.points || 0,
            claimedPoints: freshData.claimedPoints || 0,
            dollarsCollected: 500, // Hardcoded for now
          });
          console.log('Dashboard page: Fresh data loaded', freshData.points);
        }
      } catch (error) {
        console.error('Failed to fetch fresh user data:', error);
      }
    };
    
    // Fetch immediately
    fetchFreshData();
    
    // And set up interval to refresh every 15 seconds
    const refreshInterval = setInterval(fetchFreshData, 15000);
    
    return () => clearInterval(refreshInterval);
  }, [userData?.uid]);

  return (
    <div className="sm:pt-20 min-h-min p-6 flex items-center justify-center ">
      <PointsDashboard
        points={dashboardData.points}
        tokenPrice={tokenPrice}
        claimedPoints={dashboardData.claimedPoints}
        dollarsCollected={dashboardData.dollarsCollected}
        publicKey={publicKey || ""}
      />
    </div>
  );
} 