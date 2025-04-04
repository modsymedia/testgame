"use client";

import { KawaiiDevice } from "@/components/device/kawaii-device"
import { useWallet } from "@/context/WalletContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function GotchiPage() {
  const { isConnected } = useWallet();
  const router = useRouter();

  // Redirect to landing if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push('/');
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen flex flex-col w-full overflow-x-hidden">
      <main className="flex-grow flex items-center justify-center w-full p-0 md:p-4">
        <KawaiiDevice />
      </main>
    </div>
  )
} 
