import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface InfoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function InfoModal({ isOpen, onClose }: InfoModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg p-6 w-80 max-w-md relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            <h2 className="text-2xl font-bold mb-4">AI Tamagotchi Info</h2>
            <p className="mb-4">
              Welcome to AI Tamagotchi! This virtual pet is powered by blockchain technology and artificial intelligence.
            </p>
            <p className="mb-4">
              Interact with your pet using the buttons below the screen. Keep it happy, healthy, and well-fed to watch it grow!
            </p>
            <a
              href="https://example.com/ai-tamagotchi-whitepaper"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-700 underline"
            >
              Read our Whitepaper
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

