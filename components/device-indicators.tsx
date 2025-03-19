"use client"

import { motion } from "framer-motion"
import { useState, useEffect } from "react"

interface DeviceIndicatorsProps {
  status?: "idle" | "active" | "alert" | "dead"
}

export function DeviceIndicators({ status = "idle" }: DeviceIndicatorsProps) {
  const [isBlinking, setIsBlinking] = useState(false)

  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 200) // Blink for 200ms
    }, 5000) // Blink every 5 seconds

    return () => clearInterval(blinkInterval)
  }, [])

  const getStatusColor = () => {
    switch (status) {
      case "active":
        return "green";
      case "alert":
        return "red";
      case "dead":
        return "gray";
      default:
        return "yellow";
    }
  };

  return (
    <div className="flex space-x-1">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className={`w-1.5 h-1.5 ${
            index === 1 ? "rounded-none" : "rounded-full"
          }`}
          style={{
            backgroundColor: isBlinking ? "white" : getStatusColor(),
            opacity: isBlinking ? 1 : status === "idle" ? 0.3 : status === "alert" ? 1 : 0.7,
          }}
          animate={{
            opacity: isBlinking ? [1, 0, 1] : undefined,
          }}
          transition={{
            duration: 0.2,
            repeat: isBlinking ? 1 : 0,
          }}
        />
      ))}
    </div>
  )
}

