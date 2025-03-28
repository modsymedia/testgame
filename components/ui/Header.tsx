"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PixelatedContainer from "../PixelatedContainer";

interface NavItemProps {
  path: string;
  label: string;
  width?: number;
  icon?: React.ReactNode;
}

export function Header() {
  const pathname = usePathname();

  const navItems: NavItemProps[] = [
    {
      path: "/game",
      label: "Gochi",
      width: 94, // 118 * 0.8 = 94.4 rounded to 94
    },
    {
      path: "/dashboard",
      label: "Dashboard",
      width: 137, // 171 * 0.8 = 136.8 rounded to 137
    },
    {
      path: "/leaderboard",
      label: "Leaderboard",
      width: 155, // 194 * 0.8 = 155.2 rounded to 155
    },
  ];

  return (
    <header className="absolute top-0 left-0 w-full z-20 h-[81px] flex items-top justify-center z-10">
      {" "}
      {/* 101 * 0.8 = 80.8 rounded to 81 */}
      <div className="flex items-start -space-x-0.5">
        {navItems.map((item) => (
          <NavItem
            key={item.path}
            path={item.path}
            label={item.label}
            width={item.width}
            icon={item.icon}
            isActive={pathname === item.path}
          />
        ))}
      </div>
    </header>
  );
}

interface NavItemComponentProps extends NavItemProps {
  isActive: boolean;
}

function NavItem({
  path,
  label,
  width = 94, // Default width updated to 94
  icon,
  isActive,
}: NavItemComponentProps) {
  return (
    <Link href={path} className="w-full h-full">
      <PixelatedContainer
        className={`mx-1 w-full ${isActive ? "h-[59px]" : "h-[40px]"}`} // 74 * 0.8 = 59.2 rounded to 59, 50 * 0.8 = 40
        style={{ width: `${width}px` }}
        noPadding
      >
        {icon && (
          <div className="absolute top-[6px] left-[10px] z-10">{icon}</div>
        )}
        <span className="text-[#304700] font-sk-eliz text-[18px]">{label}</span>{" "}
        {/* 22 * 0.8 = 17.6 rounded to 18 */}
      </PixelatedContainer>
    </Link>
  );
}
