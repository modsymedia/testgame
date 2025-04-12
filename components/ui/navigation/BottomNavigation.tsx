"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useIsMobile } from "../use-mobile";
import { motion } from "framer-motion";
import Image from "next/image";
import PixelatedContainer from "@/components/game/PixelatedContainer";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const BottomNavigation = () => {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [bounceGochi, setBounceGochi] = useState(false);

  // Random bounce effect for Gochi button
  useEffect(() => {
    const interval = setInterval(() => {
      setBounceGochi(true);
      setTimeout(() => setBounceGochi(false), 600);
    }, Math.random() * 10000 + 5000); // Random interval between 5-15 seconds
    
    return () => clearInterval(interval);
  }, []);

  const navItems: NavItem[] = [
    {
      label: "Dashboard",
      href: "/console/dashboard",
      icon: "/assets/icons/header/dashbaord.svg",
    },
    {
      label: "Referrals",
      href: "/console/referral",
      icon: "/assets/icons/referral.svg",
    },
    {
      label: "Gochi",
      href: "/console/gotchi",
      icon: "/assets/icons/header/gochi.png",
    },
    {
      label: "Withdraw",
      href: "/console/withdraw",
      icon: "/assets/icons/withdraw.svg",
    },
    {
      label: "Leaderboard",
      href: "/console/leaderboard",
      icon: "/assets/icons/header/leaderboard.svg",
    },
  ];

  if (!isMobile) return null;

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 z-50"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <PixelatedContainer className="p-0 relative" noPadding>
        {/* Ambient glow at the bottom */}
        <div className="absolute -top-6 left-0 right-0 h-6 bg-gradient-to-t from-[#ebffb7]/70 to-transparent" />
        
        <div className="grid grid-cols-5 bg-[#ebffb7] w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const isGochi = item.label === "Gochi";
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-2 relative ${
                  isActive
                    ? "bg-[#CADA9B] text-[#304700]"
                    : "text-[#304700] hover:bg-[#CADA9B]/50"
                } ${isGochi ? "relative" : ""} transition-colors duration-300`}
              >
                {/* Active item glow effect */}
                {isActive && !isGochi && (
                  <div className="absolute inset-0 bg-[#f8ffda] opacity-20 rounded-full blur-md" />
                )}
                
                {/* Icon container */}
                <motion.div
                  className={`${
                    isGochi 
                      ? "w-14 h-14 -mt-8 rounded-full bg-[#ebffb7] border-4 border-[#CADA9B] flex items-center justify-center shadow-lg" 
                      : "w-7 h-7"
                  } mb-1 flex items-center justify-center ${
                    isActive ? "opacity-100" : "opacity-80"
                  } transition-all duration-300`}
                  animate={
                    isGochi && bounceGochi
                      ? {
                          y: [0, -8, 0],
                          transition: { duration: 0.6, ease: "easeInOut" }
                        }
                      : isActive && !isGochi
                      ? {
                          scale: [1, 1.1, 1],
                          transition: { 
                            repeat: Infinity, 
                            repeatType: "reverse", 
                            duration: 2,
                            ease: "easeInOut"
                          }
                        }
                      : {}
                  }
                >
                  <Image
                    src={item.icon}
                    alt={item.label}
                    width={isGochi ? 36 : 24}
                    height={isGochi ? 36 : 24}
                    className={isGochi ? "drop-shadow-md" : ""}
                    style={{ imageRendering: 'pixelated' }}
                  />
                </motion.div>
                
                <motion.span
                  className={`text-xs font-pixelify ${isActive ? "font-bold" : ""}`}
                  animate={isActive ? { scale: [1, 1.05, 1] } : {}}
                  transition={isActive ? { 
                    repeat: Infinity, 
                    repeatType: "reverse", 
                    duration: 1.5,
                    ease: "easeInOut"
                  } : {}}
                >
                  {item.label}
                </motion.span>
              </Link>
            );
          })}
        </div>
      </PixelatedContainer>
    </motion.div>
  );
};

export default BottomNavigation; 