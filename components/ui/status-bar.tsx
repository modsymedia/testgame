"use client"

import { useState } from "react"

interface StatusBarProps {
  value: number
  type: "food" | "happiness" | "cleanliness" | "energy" | "health"
}

export function StatusBar({ value, type }: StatusBarProps) {
  const getIcon = () => {
    if (type === "food") return "[~]"
    if (type === "happiness" && value > 66) return "(•ω•)"
    if (type === "happiness" && value > 33) return "(•д•)"
    if (type === "happiness") return "(•A•)"
    if (type === "cleanliness") return "🛁"
    if (type === "energy") return "⚡"
    if (type === "health") return "❤️"
    return "(?)"
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
        <span className="text-xs font-mono text-black">{getIcon()}</span>
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