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
        className={`w-12 h-12 relative flex items-center justify-center rounded-sm cursor-pointer
          ${isDisabled ? "opacity-50 cursor-not-allowed" : 
            isHighlighted ? "bg-[#eeffc9] ring-2 ring-[#cada9b]" : 
            "bg-transparent hover:bg-[#eeffc9] transition-all duration-200"
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
        
        {/* Pixel-art style cooldown overlay */}
        {isAnimating && (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Pixelated cooldown background */}
            <div 
              className="absolute inset-0 bg-[#4b6130]/60 border-2 border-[#d8e5a8]/30"
              style={{
                clipPath: `inset(0 ${100 - progress}% 0 0)` // Reveal from left to right
              }}
            >
              {/* Pixelated grid pattern */}
              <div className="absolute inset-0 opacity-30" 
                style={{
                  backgroundImage: 'linear-gradient(to right, #d8e5a8 1px, transparent 1px), linear-gradient(to bottom, #d8e5a8 1px, transparent 1px)',
                  backgroundSize: '4px 4px'
                }}
              />
            </div>
            
            {/* Cooldown time with pixel font */}
            <div className="z-20 p-1 bg-[#4b6130]/80 border border-[#d8e5a8]/50 rounded-sm">
              <div 
                className="font-pixel text-[#eff8cb] text-xs text-center shadow-sm"
                style={{ 
                  textShadow: '1px 1px 0 #304700',
                  letterSpacing: '1px'
                }}
              >
                {formatTime(cooldown)}
              </div>
            </div>
            
            {/* Pixel corners for emphasis */}
            <div className="absolute top-0 left-0 w-1 h-1 bg-[#d8e5a8]"></div>
            <div className="absolute top-0 right-0 w-1 h-1 bg-[#d8e5a8]"></div>
            <div className="absolute bottom-0 left-0 w-1 h-1 bg-[#d8e5a8]"></div>
            <div className="absolute bottom-0 right-0 w-1 h-1 bg-[#d8e5a8]"></div>
          </div>
        )}
        
        {/* Enhanced Tooltip - updated with pixel style */}
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
            px-3 py-1.5 bg-[#606845] border-2 border-[#d8e5a8] text-[#eff8cb] text-xs font-pixel
            pointer-events-none whitespace-nowrap z-50
            ${showTooltip ? 'visible' : 'invisible'}
          `}
        >
          <div className="relative">
            <div className="font-medium mb-0.5">{label || icon}</div>
            {isAnimating && (
              <div className="text-[#d8e5a8] text-[10px]">
                Cool: {formatTime(cooldown)}
              </div>
            )}
            <div 
              className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 translate-y-full
              w-3 h-3 bg-[#606845] border-r-2 border-b-2 border-[#d8e5a8] rotate-45"
            />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
} 