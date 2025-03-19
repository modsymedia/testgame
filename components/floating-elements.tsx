"use client"

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Heart, Star } from 'lucide-react'

interface FloatingElement {
  id: number
  x: number
  y: number
  scale: number
  rotation: number
  isHeart: boolean
}

export function FloatingElements() {
  const [elements, setElements] = useState<FloatingElement[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      if (elements.length < 10) {
        const newElement: FloatingElement = {
          id: Date.now(),
          x: Math.random() * 100,
          y: 110,
          scale: 0.5 + Math.random() * 0.5,
          rotation: Math.random() * 360,
          isHeart: Math.random() > 0.5
        }
        setElements(prev => [...prev, newElement])
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [elements])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setElements(prev => prev.slice(1))
    }, 10000)

    return () => clearTimeout(timeout)
  }, [elements])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <AnimatePresence>
        {elements.map((element) => (
          <motion.div
            key={element.id}
            className="absolute"
            initial={{ x: `${element.x}%`, y: '110%', opacity: 0, scale: element.scale, rotate: element.rotation }}
            animate={{ y: '-10%', opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 10, ease: 'linear' }}
          >
            {element.isHeart ? (
              <Heart className="text-pink-400 w-6 h-6" />
            ) : (
              <Star className="text-yellow-400 w-6 h-6" />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

