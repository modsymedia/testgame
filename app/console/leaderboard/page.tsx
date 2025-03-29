"use client";

import { useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import { useRouter } from "next/navigation";
import LeaderboardDisplay from "@/components/landing/LeaderboardDisplay";

export default function LeaderboardPage() {
  const router = useRouter();
  const { isConnected } = useWallet();

  // Redirect to landing if not connected
  useEffect(() => {
    if (!isConnected) {
      router.push("/");
    }
  }, [isConnected, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow flex items-center justify-center">
        <LeaderboardDisplay />
      </main>
    </div>
  );
}
