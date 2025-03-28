"use client";

import { useEffect } from "react";
import { useWallet } from "@/context/WalletContext";
import { useRouter } from "next/navigation";
import LeaderboardDisplay from "@/components/landing/LeaderboardDisplay";
import Image from "next/image";

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
    <div className="min-h-screen flex flex-col relative">
      {/* Background Image */}
      <div className="absolute inset-0 z-0 ">
        <Image
          src="/assets/leaderboard-bg.png"
          alt="Leaderboard Background"
          fill
          priority
          style={{ objectFit: "cover" }}
        />
      </div>

      <main className="flex-grow relative z-10 flex items-center justify-center">
        <LeaderboardDisplay />
      </main>
    </div>
  );
}
