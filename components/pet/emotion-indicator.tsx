import { motion, AnimatePresence } from "framer-motion"
import type { PetState } from "@/types/pet"

export function EmotionIndicator({ pet }: { pet: PetState }) {
  const getEmotion = () => {
    if (pet.hunger < 30) return "I'm hungry! 🍽️"
    if (pet.energy < 30) return "I'm sleepy... 😴"
    if (pet.hygiene < 30) return "I need a bath! 🛁"
    if (pet.happiness > 80) return "I'm so happy! 🎉"
    return null
  }

  const emotion = getEmotion()

  return (
    <AnimatePresence>
      {emotion && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg"
        >
          <p className="text-sm font-medium text-gray-800">{emotion}</p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

