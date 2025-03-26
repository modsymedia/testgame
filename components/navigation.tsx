"use client";

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PawPrint, LayoutDashboard, Trophy } from 'lucide-react'

export function Navigation() {
  const pathname = usePathname();
  
  const isActive = (path: string) => {
    return pathname === path;
  };
  
  const getTabClasses = (path: string) => {
    return `flex items-center px-4 py-2 rounded-t-lg transition-colors ${
      isActive(path) 
        ? 'bg-white text-pink-600 font-semibold' 
        : 'text-gray-700 hover:text-pink-600 hover:bg-pink-50'
    }`;
  };

  return (
    <nav className="w-full bg-pink-100 px-4 pt-4 flex justify-between items-end">
      <div className="flex items-end space-x-2">
        <Link href="/game" className={getTabClasses('/game')}>
          <PawPrint size={20} className="mr-2" />
          <span>Gochi</span>
        </Link>
        
        <Link href="/dashboard" className={getTabClasses('/dashboard')}>
          <LayoutDashboard size={20} className="mr-2" />
          <span>Dashboard</span>
        </Link>
        
        <Link href="/leaderboard" className={getTabClasses('/leaderboard')}>
          <Trophy size={20} className="mr-2" />
          <span>Leaderboard</span>
        </Link>
      </div>
      
      <div className="mb-2 text-gray-500 text-sm">
        {/* Right side content if needed */}
      </div>
    </nav>
  )
}

