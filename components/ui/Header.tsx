"use client";

import React, { useState } from "react";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
      {/* Mobile Menu Button */}
      <div className="lg:hidden ml-2">
        <PixelatedContainer
          className="h-[40px] w-[40px] cursor-pointer hover:bg-[#d8ee9e] transition-colors"
          noPadding
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          <button className="w-full h-full flex items-center justify-center">
            <div className="flex flex-col gap-1">
              <div className="w-4 h-0.5 bg-[#304700]"></div>
              <div className="w-4 h-0.5 bg-[#304700]"></div>
              <div className="w-4 h-0.5 bg-[#304700]"></div>
            </div>
          </button>
        </PixelatedContainer>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed top-[48px] left-0 w-full bg-[#eff8cb] shadow-lg">
          <div className="flex flex-col gap-1 p-2">
            {navItems.map((item) => (
              <Link 
                key={item.path} 
                href={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-2 p-3 rounded ${
                  pathname === item.path ? 'bg-[#d8ee9e]' : 'hover:bg-[#d8ee9e]'
                }`}
              >
                <Image 
                  src={item.iconPath} 
                  alt={`${item.label} icon`} 
                  width={20} 
                  height={20} 
                  className="object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
                <span className="text-[#304700] font-pixelify text-lg">{item.label}</span>
              </Link>
            ))}
            {isConnected && (
              <button 
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-2 p-3 rounded hover:bg-[#d8ee9e] text-left"
              >
                <span className="text-[#304700] font-pixelify text-lg">Logout</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-start gap-[5px] -ml-[5px]">
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

      {/* Desktop Logout Button */}
      {isConnected && (
        <div className="hidden lg:block">
          <PixelatedContainer
            className="h-[40px] cursor-pointer hover:bg-[#d8ee9e] transition-colors"
            style={{ width: '90px' }}
            noPadding
          >
            <button 
              onClick={handleLogout}
              className="w-full h-full flex items-center justify-center"
            >
              <span className="text-[#304700] font-pixelify text-md">Logout</span>
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
    <Link href={path} className="w-auto h-full group">
      <PixelatedContainer
        className={`w-auto transition-all duration-300 ease-in-out 
          ${isActive 
            ? "h-[54px]" 
            : "h-[40px] hover:h-[50px] group-hover:h-[44px]"
          }`}
        style={{ width: `${width}px` }}
        noPadding
      >
        <div className="flex items-center justify-center gap-2 py-2 px-5">
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
          <span className="text-[#304700] font-pixelify text-lg">{label}</span>
        </div>
      </PixelatedContainer>
    </Link>
  );
}
