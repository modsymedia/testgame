"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion } from "framer-motion"

interface PixelIconProps {
  icon: "food" | "clean" | "doctor" | "play" | "fish" | "cookie" | "catFood" | "kibble" | 
        "laser" | "feather" | "ball" | "puzzle" | "brush" | "bath" | "nails" | "dental" |
        "checkup" | "vitamins" | "vaccine" | "surgery" | "medicine"
  label?: string
  isHighlighted: boolean
  cooldown?: number // Cooldown in milliseconds
  maxCooldown?: number // Max cooldown time for calculating progress
  isDisabled?: boolean // If the action is disabled
  onClick?: () => void // Click handler
}

export function PixelIcon({ 
  icon, 
  isHighlighted, 
  label, 
  cooldown = 0, 
  maxCooldown = 10000, 
  isDisabled = false,
  onClick 
}: PixelIconProps) {
  const [progress, setProgress] = useState(0) // 0 to 100
  const [isAnimating, setIsAnimating] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  
  // Update cooldown progress
  useEffect(() => {
    if (cooldown > 0) {
      // Calculate progress percentage (reversed, 100 = just started cooldown, 0 = done)
      const newProgress = Math.min(100, (cooldown / maxCooldown) * 100)
      setProgress(newProgress)
      setIsAnimating(true)
    } else {
      setProgress(0)
      setIsAnimating(false)
    }
  }, [cooldown, maxCooldown])
  
  const getIcon = () => {
    switch (icon) {
      case "food":
        return <Image src="/assets/icons/foods/foods.png" alt="Food" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "clean":
        return <Image src="/assets/icons/hygiene/hygienes.png" alt="Clean" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "doctor":
        return <Image src="/assets/icons/healings/healing.png" alt="Doctor" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "play":
        return <Image src="/assets/icons/games/games.png" alt="Play" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "fish":
        return <Image src="/assets/icons/foods/food-fish.png" alt="Fish" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "cookie":
        return <Image src="/assets/icons/foods/food-donat.png" alt="Cookie" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "catFood":
        return <Image src="/assets/icons/foods/food-catfood.png" alt="Cat Food" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "kibble":
        return <Image src="/assets/icons/foods/food-catnip.png" alt="Kibble" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "laser":
        return <Image src="/assets/icons/games/game-laser.png" alt="Laser" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "feather":
        return <Image src="/assets/icons/games/game-feather.png" alt="Feather" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "ball":
        return <Image src="/assets/icons/games/game-ball.png" alt="Ball" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "puzzle":
        return <Image src="/assets/icons/games/game-puzzle.png" alt="Puzzle" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "brush":
        return <Image src="/assets/icons/hygiene/hygiene-comb.png" alt="Brush" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "bath":
        return <Image src="/assets/icons/hygiene/hygiene-bath.png" alt="Bath" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "nails":
        return <Image src="/assets/icons/hygiene/hygiene-nailclipper.png" alt="Nails" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "dental":
        return <Image src="/assets/icons/hygiene/hygiene-tooth.png" alt="Dental" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "checkup":
        return <Image src="/assets/icons/healings/healing.png" alt="Check-up" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "vitamins":
        return <Image src="/assets/icons/healings/medicine.png" alt="Vitamins" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "vaccine":
        return <Image src="/assets/icons/healings/vaccine.png" alt="Vaccine" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "surgery":
        return <Image src="/assets/icons/healings/surgery.png" alt="Surgery" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      case "medicine":
        return <Image src="/assets/icons/healings/medicine.png" alt="Medicine" width={28} height={28} unoptimized={true} style={{ imageRendering: 'pixelated' }} />;
      default:
        return <span className="text-xl">❓</span>;
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000)
    return `${seconds}s`
  }

  return (
    <div 
      className="flex flex-col items-center relative group" 
      onMouseEnter={() => {
        setShowTooltip(true)
        setIsHovered(true)
      }}
      onMouseLeave={() => {
        setShowTooltip(false)
        setIsHovered(false)
      }}
    >
      <motion.div
        className={`w-12 h-12 relative flex items-center justify-center rounded-lg cursor-pointer
          ${isDisabled ? "opacity-50 cursor-not-allowed" : 
            isHighlighted ? "bg-gray-100 ring-2 ring-blue-400 shadow-lg" : 
            "bg-transparent hover:bg-gray-300/50 hover:shadow-md transition-all duration-200"
          }`}
        whileHover={!isDisabled ? { 
          scale: isHighlighted ? 1.1 : 1.08,
          transition: { type: "spring", stiffness: 400, damping: 10 }
        } : undefined}
        whileTap={!isDisabled ? { scale: 0.95 } : undefined}
        animate={isHighlighted ? {
          y: [0, -2, 0],
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        } : {}}
        onClick={!isDisabled ? onClick : undefined}
      >
        {/* Main icon */}
        <motion.div 
          className="z-10"
          animate={isHovered && !isDisabled ? {
            rotate: [-2, 2, -2],
            transition: {
              duration: 0.5,
              repeat: Infinity,
              ease: "easeInOut"
            }
          } : {}}
        >
          {getIcon()}
        </motion.div>
        
        {/* Cooldown overlay - circular progress */}
        {isAnimating && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Circular cooldown indicator */}
            <motion.svg 
              className="w-full h-full absolute"
              viewBox="0 0 100 100"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke="#304700" 
                strokeWidth="8"
                strokeDasharray="283"
                strokeDashoffset={283 - (283 * progress) / 100}
                transform="rotate(-90 50 50)"
                className="opacity-60"
              />
            </motion.svg>
            
            {/* Cooldown timer */}
            <motion.div 
              className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 rounded-lg"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <span className="text-white text-xs font-bold font-numbers">
                {formatTime(cooldown)}
              </span>
            </motion.div>
          </div>
        )}
        
        {/* Enhanced Tooltip */}
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={showTooltip ? { 
            opacity: 1, 
            y: 0, 
            scale: 1,
            transition: {
              type: "spring",
              stiffness: 500,
              damping: 25
            }
          } : { opacity: 0, y: 10, scale: 0.9 }}
          className={`
            absolute -top-10 left-1/2 transform -translate-x-1/2
            px-3 py-1.5 bg-gray-800 text-white text-xs rounded-lg
            pointer-events-none whitespace-nowrap z-50
            shadow-lg
            ${showTooltip ? 'visible' : 'invisible'}
          `}
        >
          <div className="relative">
            <div className="font-medium mb-0.5">{label || icon}</div>
            {isAnimating && (
              <div className="text-gray-300 text-[10px]">
                Cooldown: {formatTime(cooldown)}
              </div>
            )}
            <div 
              className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full
              border-solid border-4 border-transparent border-t-gray-800"
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
} 