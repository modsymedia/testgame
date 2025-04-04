import React, { useState } from "react"
import { motion } from "framer-motion"

interface DeviceFrameProps {
  children: React.ReactNode
}

export function DeviceFrame({ children }: DeviceFrameProps) {
  const [isBlinking, setIsBlinking] = useState(false)

  const handleButtonClick = () => {
    setIsBlinking(true)
    setTimeout(() => setIsBlinking(false), 3000) // Stop blinking after 3 seconds
  }

  return (
    <div className="relative max-w-sm mx-auto">
      <motion.div 
        className="bg-gray-800 rounded-[3rem] p-8 shadow-xl border-4 border-gray-700"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="bg-gray-900 rounded-[2rem] p-4 shadow-inner">
          <div className="bg-gray-800 rounded-[1.5rem] p-2 mb-4">
            <div className="bg-gray-200 rounded-2xl overflow-hidden">
              {children}
            </div>
          </div>
          <div className="flex justify-between items-center px-4">
            <motion.button
              className="w-8 h-8 bg-red-500 rounded-full focus:outline-none"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            />
            <motion.button
              className="w-8 h-8 bg-green-500 rounded-full focus:outline-none"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            />
          </div>
        </div>
      </motion.div>
      <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-16 h-16">
        <motion.button 
          className="w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 rounded-full border-4 border-gray-600 shadow-lg cursor-pointer focus:outline-none"
          whileHover={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.1)" }}
          whileTap={{ scale: 0.95 }}
          onClick={handleButtonClick}
        >
          <div className="absolute inset-2 bg-gradient-to-b from-gray-800 to-gray-900 rounded-full" />
          <div className="absolute inset-0 bg-black/10 rounded-full shadow-inner" />
        </motion.button>
      </div>
    </div>
  )
}

