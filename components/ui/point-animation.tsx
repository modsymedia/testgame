"use client"

import { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"

interface PointAnimationProps {
  points: number
  show: boolean
  onComplete: () => void
}

export function PointAnimation({ points, show, onComplete }: PointAnimationProps) {
  const [visible, setVisible] = useState(show)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Use a ref to track if we've already completed this animation
  const hasCompletedRef = useRef(false)
  
  useEffect(() => {
    // Reset state when show changes to true
    if (show) {
      hasCompletedRef.current = false
      setVisible(true)
      
      // Clear any existing timer
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      
      // Set a new timer
      timerRef.current = setTimeout(() => {
        setVisible(false)
        
        // Only call onComplete if we haven't already
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true
          onComplete()
        }
      }, 1500)
    }
    
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
    }
  }, [show, onComplete])
  
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 0, scale: 0.5 }}
          animate={{ opacity: 1, y: -50, scale: 1.2 }}
          exit={{ opacity: 0, y: -80, scale: 0.8 }}
          transition={{ duration: 1.5 }}
          className="absolute z-20 pointer-events-none"
        >
          <div className="bg-yellow-400 text-black font-bold px-3 py-1 rounded-full flex items-center">
            <span className="mr-1">⭐</span>
            <span>+{points}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
} 