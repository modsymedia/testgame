"use client"

import { useState } from "react"
import Image from "next/image"

interface StatusBarProps {
  value: number
  type: "food" | "happiness" | "cleanliness" | "energy" | "health"
}

export function StatusBar({ value, type }: StatusBarProps) {
  const getIcon = () => {
    switch (type) {
      case "food":
        return <Image src="/assets/icons/foods/foods.png" alt="Food" width={16} height={16} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "happiness":
        return <Image src="/assets/icons/status/statusbar-heal(heart).png" alt="Happiness" width={16} height={16} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "cleanliness":
        return <Image src="/assets/icons/hygiene/hygienes.png" alt="Cleanliness" width={16} height={16} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "energy":
        return <Image src="/assets/icons/status/statusbar-coins(points).png" alt="Energy" width={16} height={16} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "health":
        return <Image src="/assets/icons/status/statusbar-heal(heart).png" alt="Health" width={16} height={16} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      default:
        return "(?)";
    }
  }
  
  const getStatus = (value: number, type: string) => {
    const labels = {
      food: "Food",
      happiness: "Mood",
      cleanliness: "Clean",
      energy: "Energy",
      health: "Health"
    };
    
    return labels[type as keyof typeof labels] || type.charAt(0).toUpperCase() + type.slice(1);
  }
  
  return (
    <div className="flex flex-col space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {getIcon()}
        </div>
        <span className="text-xs text-black">{getStatus(value, type)}</span>
      </div>
      <div className="w-full h-2 bg-gray-300 rounded-full overflow-hidden">
        <div 
          className={`h-full ${
            value <= 20 ? "bg-red-500" : 
            value <= 60 ? "bg-yellow-500" : 
            type === "food" && value > 100 ? "bg-orange-500" : "bg-green-500"
          }`} 
          style={{ width: `${Math.min(value, 100)}%` }} 
        />
      </div>
    </div>
  )
} 