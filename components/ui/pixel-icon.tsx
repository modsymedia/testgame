"use client"

import { Utensils, BathIcon, Stethoscope, Gamepad } from "lucide-react"
import { DonutIcon, FishIcon, BallIcon } from "@/components/ui/icons"

interface PixelIconProps {
  icon: "food" | "clean" | "doctor" | "play" | "fish" | "cookie" | "catFood" | "kibble" | 
        "laser" | "feather" | "ball" | "puzzle" | "brush" | "bath" | "nails" | "styling" | "dental" |
        "checkup" | "vitamins" | "vaccine" | "surgery"
  label?: string
  isHighlighted: boolean
}

export function PixelIcon({ icon, label, isHighlighted }: PixelIconProps) {
  const getIcon = () => {
    switch (icon) {
      case "food":
        return <Utensils className="w-6 h-6" />;
      case "clean":
        return <BathIcon className="w-6 h-6" />;
      case "doctor":
        return <Stethoscope className="w-6 h-6" />;
      case "play":
        return <Gamepad className="w-6 h-6" />;
      case "fish":
        return <FishIcon className="w-6 h-6" />;
      case "cookie":
        return <DonutIcon className="w-6 h-6" />;
      case "catFood":
        return <span className="text-xl">🥫</span>;
      case "kibble":
        return <span className="text-xl">🥣</span>;
      case "laser":
        return <span className="text-xl">🔴</span>;
      case "feather":
        return <span className="text-xl">🪶</span>;
      case "ball":
        return <BallIcon className="w-6 h-6" />;
      case "puzzle":
        return <span className="text-xl">🧩</span>;
      case "brush":
        return <span className="text-xl">🧹</span>;
      case "bath":
        return <span className="text-xl">🛁</span>;
      case "nails":
        return <span className="text-xl">✂️</span>;
      case "styling":
        return <span className="text-xl">💇</span>;
      case "dental":
        return <span className="text-xl">🦷</span>;
      case "checkup":
        return <span className="text-xl">🩺</span>;
      case "vitamins":
        return <span className="text-xl">💊</span>;
      case "vaccine":
        return <span className="text-xl">💉</span>;
      case "surgery":
        return <span className="text-xl">🏥</span>;
      default:
        return <span className="text-xl">❓</span>;
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-12 h-12 flex items-center justify-center rounded-lg ${
          isHighlighted ? "bg-gray-100 text-black" : "bg-transparent text-black hover:bg-gray-300 transition-colors"
        }`}
      >
        {getIcon()}
      </div>
      {label && <span className="text-xs mt-1">{label}</span>}
    </div>
  );
} 