"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { Alert, AlertDescription } from "@/components/ui/feedback/alert";
import { WalletSelectModal } from "@/components/game/WalletSelectModal";
import FloatingRock from "@/components/game/FloatingRock";
import Image from "next/image";
import { motion } from "framer-motion";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  const router = useRouter();
  const { isConnected, error, isNewUser, isTwitterConnected } = useWallet();

  useEffect(() => {
    const hasReferralCode =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("ref");

    console.log("LandingPage - Redirect Check:", {
      isConnected,
      isNewUser,
      hasReferralCode,
      isTwitterConnected,
    });

    if ((isConnected || isTwitterConnected) && !isNewUser && !hasReferralCode) {
      console.log(
        "LandingPage - Conditions met for redirect, starting timer..."
      );
      const timer = setTimeout(() => {
        console.log("LandingPage - Redirecting to /console/gotchi");
        router.push("/console/gotchi");
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      console.log("LandingPage - Conditions not met for redirect.");
    }
  }, [isConnected, isNewUser, router, isTwitterConnected]);

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
          <Image
            src="/assets/landingbg.png"
            alt="Background"
            layout="fill"
            priority
            className="object-cover "
          />
      </div>

      {/* Main Content Container with proper padding */}
      <div className="relative z-10 w-full h-full min-h-screen max-w-[1200px] px-4 sm:px-6 md:px-12 lg:px-16 py-6 sm:py-8 flex items-center align-middle">
        {/* Two Column Flex Layout */}
        <div className="flex flex-col lg:flex-row h-full items-center w-full justify-between">
          {/* Left Column - Content */}
          <div className="flex flex-col justify-center w-full max-w-[380px] items-center">
            {/* Logo */}
            <motion.div
              className="mb-6 sm:mb-8 w-full max-w-[280px] sm:max-w-[350px]"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
            >
              <Image
                src="/assets/icons/typelogo.svg"
                alt="Gochi Logo"
                width={350}
                height={125}
                className="w-full h-auto"
                style={{ imageRendering: "pixelated" }}
              />
            </motion.div>
            
            {/* Text */}
            <motion.p
              className="text-base sm:text-lg md:text-xl text-center text-[#304700] max-w-md font-pixelify mb-6 sm:mb-8 leading-relaxed"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Tamagotchi Characters Are Life Forms That Live On `&quot;&quot;Tamagotchi Planet&quot;&quot;`. A Planet Far Away From Earth.
            </motion.p>

            {/* Get Started Button Area */} 
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="flex flex-col items-center w-full"
            >
              {/* Error Message Display */}
              {error && (
                <Alert variant="destructive" className="mb-4 w-full max-w-md">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              {/* Render WalletSelectModal directly */}
              <div className="mb-6 sm:mb-8 w-full flex justify-center">
                <WalletSelectModal />
              </div>

              {/* Add Login with Twitter Button */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="mb-6 sm:mb-8 w-full flex justify-center"
              >
                <Button
                  onClick={() => signIn("twitter")}
                  className="bg-[#1DA1F2] hover:bg-[#1a91da] text-white font-bold py-2 px-4 rounded flex items-center gap-2 w-full max-w-[250px] justify-center"
                   style={{ imageRendering: "pixelated" }}
                >
                  <Image
                    src="/assets/icons/social/x.png" // Assuming you have a Twitter icon here
                    alt="Twitter Logo"
                    width={20}
                    height={20}
                     style={{ imageRendering: "pixelated" }}
                  />
                  Login with Twitter
                </Button>
              </motion.div>
              
              {/* Social Links Footer */}
              <div className="flex items-center gap-4">
                <a
                  href="https://x.com/gochionsol"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 transition-opacity"
                  title="Follow us on X"
                >
                  <Image
                    src="/assets/icons/social/x.png"
                    alt="X (Twitter)"
                    width={24}
                    height={24}
                    className="object-contain pixelated"
                    style={{ imageRendering: "pixelated" }}
                  />
                </a>
                
                <a
                  href="https://github.com/gochiGame"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 transition-opacity"
                  title="View code on GitHub"
                >
                  <Image
                    src="/assets/icons/social/github.png"
                    alt="GitHub"
                    width={24}
                    height={24}
                    className="object-contain pixelated"
                    style={{ imageRendering: "pixelated" }}
                  />
                </a>

                {/* Docs Link */}
                <a
                  href="#" // Replace with your actual docs URL
                  target="_blank"
                  rel="noopener noreferrer"
                  className="opacity-70 hover:opacity-100 transition-opacity"
                  title="Read the Documentation"
                >
                  <Image
                    src="/assets/icons/social/doc.png" 
                    alt="Documentation"
                    width={24} 
                    height={24}
                    className="object-contain pixelated"
                    style={{ imageRendering: "pixelated" }}
                  />
                </a>
              </div>

            </motion.div>
          </div>

          {/* Right Column - Floating Rock */} 
          <div className="mt-8 lg:mt-0  h-[320px] flex items-center justify-center w-full lg:w-1/2 xl:w-2/5">
            <FloatingRock className="scale-[3]  sm:scale-[4] md:scale-[5] lg:scale-[6] mb-[-20px] lg:mb-[-50px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
