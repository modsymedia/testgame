"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to new dashboard...</p>
    </div>
  );
} 