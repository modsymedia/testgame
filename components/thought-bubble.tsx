"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { IceCreamCone, Heart, Sparkles, Crown, Stethoscope } from 'lucide-react'

const thoughts = [
  { icon: IceCreamCone, text: "Nom nom... Food please! 🍰", color: "text-pink-400" },
  { icon: Heart, text: "Let's play together! 🎈", color: "text-red-400" },
  { icon: Sparkles, text: "I need a bubble bath! 🛁", color: "text-blue-400" },
  { icon: Crown, text: "Teach me something new! 📚", color: "text-yellow-400" },
  { icon: Stethoscope, text: "I'm not feeling well... 🤒", color: "text-green-400" },
]

export function ThoughtBubble() {
  const [currentThought, setCurrentThought] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentThought((prev) => (prev + 1) % thoughts.length)
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const CurrentThought = thoughts[currentThought]

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentThought}
        initial={{ opacity: 0, y: 20, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.8 }}
        className="absolute -top-20 right-0 bg-white rounded-2xl p-3 shadow-lg"
      >
        <div className="flex items-center space-x-2">
          {CurrentThought && <CurrentThought.icon className={`w-5 h-5 ${CurrentThought.color}`} />}
          <span className="text-sm font-medium">{CurrentThought?.text}</span>
        </div>
        <div className="absolute -bottom-2 right-4 w-4 h-4 bg-white transform rotate-45"></div>
      </motion.div>
    </AnimatePresence>
  )
}

