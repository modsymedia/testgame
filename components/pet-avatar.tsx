"use client"

import { motion } from "framer-motion"
import type { PetState } from "@/types/pet"
import { Utensils } from 'lucide-react'

export function PetAvatar({ pet }: { pet: PetState }) {
  const isHungry = pet.hunger < 30
  const isTired = pet.energy < 30
  const isDirty = pet.hygiene < 30

  return (
    <div className="relative">
      <motion.div
        className="w-48 h-48 mx-auto bg-gray-100 rounded-full flex items-center justify-center"
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse",
        }}
      >
        {isHungry ? (
          <Utensils className="w-16 h-16 text-gray-400" />
        ) : isTired ? (
          <span className="text-xl">😴</span>
        ) : isDirty ? (
          <span className="text-xl">🚿</span>
        ) : (
          <span className="text-xl">😊</span>
        )}
      </motion.div>
      
      {/* Speech bubble */}
      {isHungry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute -top-12 right-0 bg-white px-4 py-2 rounded-xl shadow-sm"
        >
          <p className="text-md font-medium">I&apos;m hungry!</p>
        </motion.div>
      )}
    </div>
  )
}

