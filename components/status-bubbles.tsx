"use client"

import { motion } from "framer-motion"
import type { PetState } from "@/types/pet"

interface StatusPieProps {
  value: number
  icon: string
  color: string
  bgColor: string
}

function StatusPie({ value, icon, color, bgColor }: StatusPieProps) {
  // Convert percentage to degrees for the pie chart
  const degrees = (value / 100) * 360

  return (
    <motion.div 
      className="relative w-16 h-16"
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      {/* Background circle */}
      <div 
        className={`absolute inset-0 rounded-full ${bgColor}`}
      />
      
      {/* Pie chart fill */}
      <div className="absolute inset-0">
        <div 
          className={`w-full h-full rounded-full ${color}`}
          style={{
            clipPath: `polygon(50% 50%, 50% 0%, ${
              degrees <= 180
                ? `${50 + 50 * Math.tan((Math.PI / 180) * degrees)}% 0`
                : "100% 0, 100% 100%, 0 100%, 0 0"
            })`
          }}
        />
        {degrees > 180 && (
          <div 
            className={`absolute top-0 left-0 w-full h-full rounded-full ${color}`}
            style={{
              clipPath: `polygon(50% 50%, 100% 100%, ${
                50 + 50 * Math.tan((Math.PI / 180) * (degrees - 180))
              }% 100%)`
            }}
          />
        )}
      </div>

      {/* Icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-md">{icon}</span>
      </div>

      {/* Percentage */}
      <div className="absolute -bottom-6 w-full text-center">
        <span className="text-sm font-medium text-gray-600">{value}%</span>
      </div>
    </motion.div>
  )
}

export function StatusBubbles({ pet }: { pet: PetState }) {
  const statuses = [
    { 
      value: Math.round(pet.hunger), 
      icon: "🍔", 
      color: "bg-[#FFB6C1]",
      bgColor: "bg-[#FFE5E5]" 
    },
    { 
      value: Math.round(pet.happiness), 
      icon: "😊", 
      color: "bg-[#FFD93D]",
      bgColor: "bg-[#FFF8E1]" 
    },
    { 
      value: Math.round(pet.energy), 
      icon: "⚡", 
      color: "bg-[#6C9FFF]",
      bgColor: "bg-[#E5EFFF]" 
    },
    { 
      value: Math.round(pet.hygiene), 
      icon: "🛁", 
      color: "bg-[#95D1A5]",
      bgColor: "bg-[#E8F5E9]" 
    },
  ]

  return (
    <div className="flex justify-between px-8">
      {statuses.map((status, index) => (
        <StatusPie
          key={index}
          value={status.value}
          icon={status.icon}
          color={status.color}
          bgColor={status.bgColor}
        />
      ))}
    </div>
  )
}

