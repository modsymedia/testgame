"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LeaderboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/leaderboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to new leaderboard...</p>
    </div>
  );
} 