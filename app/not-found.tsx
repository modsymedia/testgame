"use client";

import React, { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
// Import necessary providers
import { WalletProvider } from '@/context/WalletContext';
import { UserDataProvider } from '@/context/UserDataContext';
import { PointsProvider } from '@/context/PointsContext';
import Providers from '@/components/providers'; // Assuming this wraps theme/other providers
 
function NotFoundContent() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <Image 
          src="/assets/icons/typelogo.svg"
          alt="Gochi Logo"
          width={250}
          height={90}
          className="mx-auto mb-8"
          style={{ imageRendering: "pixelated" }}
        />
        <h1 className="text-2xl md:text-3xl font-pixelify text-[#304700] mb-4">
          Page Not Found
        </h1>
        <p className="text-lg text-[#304700] mb-8 font-pixelify">
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" className="px-6 py-3 bg-[#84975B] text-white rounded font-pixelify hover:bg-[#6d7d4a] transition-all">
          Return Home
        </Link>
      </div>
    </div>
  );
}

export default function NotFound() {
  return (
    // Wrap content with necessary providers
    <Providers>
      <WalletProvider>
        <UserDataProvider>
          <PointsProvider>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
              <NotFoundContent />
            </Suspense>
          </PointsProvider>
        </UserDataProvider>
      </WalletProvider>
    </Providers>
  );
} 