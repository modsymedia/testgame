"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import PixelatedContainer from "../PixelatedContainer";
import { useWallet } from "@/context/WalletContext";
import { useRouter } from "next/navigation";

interface NavItemProps {
  path: string;
  label: string;
  width?: number;
  iconPath: string;
}

export function Header() {
  const pathname = usePathname();
  const { disconnect, isConnected } = useWallet();
  const router = useRouter();

  const handleLogout = () => {
    disconnect();
    router.push("/");
  };

  const navItems: NavItemProps[] = [
    {
      path: "/console/gotchi",
      label: "Gochi",
      width: 94,
      iconPath: "/assets/icons/header/gochi.png",
    },
    {
      path: "/console/dashboard",
      label: "Dashboard",
      width: 137,
      iconPath: "/assets/icons/header/dashbaord.svg",
    },
    {
      path: "/console/leaderboard",
      label: "Leaderboard",
      width: 155,
      iconPath: "/assets/icons/header/leaderboard.svg",
    },
  ];

  return (
    <header className="fixed top-0 left-0 w-full z-50 h-[48px] flex items-top gap-[5px] px-0">
      {/* Left side navigation */}
      <div className="flex items-start gap-[5px] -ml-[5px]">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            path={item.path}
            label={item.label}
            width={item.width}
            iconPath={item.iconPath}
            isActive={pathname === item.path}
          />
        ))}
      </div>
      
      {/* Center fill container */}
      <div className="flex-1">
        <PixelatedContainer
          className="h-[40px] w-full"
          noPadding
        >
          <div className="w-full h-full"></div>
        </PixelatedContainer>
      </div>

      {/* Right side logout button */}
      {isConnected && (
        <div>
          <PixelatedContainer
            className="h-[40px] cursor-pointer hover:bg-[#d8ee9e] transition-colors"
            style={{ width: '90px' }}
            noPadding
          >
            <button 
              onClick={handleLogout}
              className="w-full h-full flex items-center justify-center"
            >
              <span className="text-[#304700] font-sk-eliz text-sm">Logout</span>
            </button>
          </PixelatedContainer>
        </div>
      )}
    </header>
  );
}

interface NavItemComponentProps extends NavItemProps {
  isActive: boolean;
}

function NavItem({
  path,
  label,
  width = 94,
  iconPath,
  isActive,
}: NavItemComponentProps) {
  return (
    <Link href={path} className="w-full h-full group">
      <PixelatedContainer
        className={`w-full transition-all duration-300 ease-in-out 
          ${isActive 
            ? "h-[54px]" 
            : "h-[40px] hover:h-[50px] group-hover:h-[44px]"
          }`}
        style={{ width: `${width}px` }}
        noPadding
      >
        <div className="flex items-center justify-center gap-2 py-2 px-3">
          <div className="w-5 h-5 relative flex-shrink-0">
            <Image 
              src={iconPath} 
              alt={`${label} icon`} 
              width={20} 
              height={20} 
              className="object-contain"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
          <span className="text-[#304700] font-sk-eliz text-md">{label}</span>
        </div>
      </PixelatedContainer>
    </Link>
  );
}
