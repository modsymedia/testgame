"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { PetState } from "@/types/pet"

interface PetFaceProps {
  stats: PetState
  className?: string
}

export function PetFace({ stats, className }: PetFaceProps) {
  const [isWinking, setIsWinking] = useState(false)
  const [isBouncing, setIsBouncing] = useState(false)

  const isHappy = stats.happiness > 70
  const isSad = stats.happiness < 30
  const isHungry = stats.hunger < 30
  const calculatedHealth = (stats.hunger + stats.happiness + stats.energy + stats.hygiene) / 4
  const isSick = calculatedHealth < 50

  useEffect(() => {
    const bounceInterval = setInterval(() => {
      setIsBouncing(true)
      setTimeout(() => setIsBouncing(false), 500)
    }, 10000)

    return () => clearInterval(bounceInterval)
  }, [])

  const handleClick = () => {
    setIsWinking(true)
    setTimeout(() => setIsWinking(false), 300)
  }

  return (
    <motion.div
      className={cn("font-mono text-xl whitespace-pre leading-tight text-center cursor-pointer", className)}
      animate={{
        y: isBouncing ? [0, -20, 0] : 0,
      }}
      transition={{
        duration: 0.5,
        ease: "easeInOut",
      }}
      onClick={handleClick}
    >
      <AnimatePresence>
        {isWinking ? (
          <motion.div
            key="wink"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {`  /\\_____/\\
 (  ^ω~  )
  )  >ᴗ<  (
 (___m_m___)`}
          </motion.div>
        ) : (
          <motion.div
            key="normal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {isHungry ? (
              `  /\\_____/\\
 (  >﹏<  )
  )  >°<  (
 (___m_m___)`
            ) : isSick ? (
              `  /\\_____/\\
 (  ×_×  )
  )  >~<  (
 (___m_m___)`
            ) : isSad ? (
              `  /\\_____/\\
 (  •́︿•̀  )
  )  >-<  (
 (___m_m___)`
            ) : isHappy ? (
              `  /\\_____/\\
 (  ♥‿♥  )
  )  >ᴗ<  (
 (___m_m___)`
            ) : (
              `  /\\_____/\\
 (  ◕‿◕  )
  )  >^<  (
 (___m_m___)`
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

