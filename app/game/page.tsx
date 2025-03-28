"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function GameRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/console/gotchi');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p>Redirecting to new Gochi game...</p>
    </div>
  );
} 