"use client"

import { motion, AnimatePresence } from "framer-motion"
import { MessageCircle, Clock, Hash, SmilePlus, Coins, TrendingUp, Users, Wallet, ExternalLink } from 'lucide-react'

interface BlockchainStats {
  token: number
  marketCap: number
  holders: number
  treasuryWorth: number
}

interface Interaction {
  id: string
  timestamp: Date
  type: "Feed" | "Play" | "Sleep" | "Clean"
  stats: {
    hunger: number
    happiness: number
    energy: number
    hygiene: number
  }
  emotion: "happy" | "sad" | "tired" | "hungry" | "curious"
  blockchainStats: BlockchainStats
  tweet: string
  blockNumber: string
  transactionUrl: string
}

const typeColors = {
  Feed: "bg-pink-100 text-pink-700",
  Play: "bg-yellow-100 text-yellow-700",
  Sleep: "bg-blue-100 text-blue-700",
  Clean: "bg-green-100 text-green-700"
}

const typeIcons = {
  Feed: "🍔",
  Play: "🎮",
  Sleep: "💤",
  Clean: "🛁"
}

function InteractionCard({ interaction, isLast }: { interaction: Interaction; isLast: boolean }) {
  return (
    <div className="relative">
      {!isLast && (
        <div className="absolute left-4 top-[5rem] bottom-0 w-0.5 bg-gradient-to-b from-purple-200 to-transparent" />
      )}
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="relative ml-8 mb-8"
      >
        <motion.div 
          className="absolute -left-[1.25rem] top-6 w-4 h-4 rounded-full bg-purple-200 border-4 border-white"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 500, damping: 25 }}
        />
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-4 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div className="space-y-2">
                <motion.div 
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${typeColors[interaction.type]}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <span>{typeIcons[interaction.type]}</span>
                  <span>{interaction.type}</span>
                </motion.div>
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
                  <span className="text-blue-500 font-semibold text-sm sm:text-base">Tweet</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-600 text-sm sm:text-base">Onchain Memo:</span>
                </div>
              </div>
              <motion.a
                href={interaction.transactionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-sm font-medium hover:bg-purple-100 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ExternalLink className="w-4 h-4" />
                View TXN
              </motion.a>
            </div>

            <motion.p 
              className="text-base sm:text-xl font-medium text-gray-800 leading-relaxed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {interaction.tweet}
            </motion.p>

            <motion.div 
              className="space-y-3 font-mono text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium">Timestamp:</span>
                <span>{interaction.timestamp.toLocaleString('en-GB', { 
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false
                })}</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <Hash className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium">Blocknumber:</span>
                <span>{interaction.blockNumber}</span>
              </div>
              
              <div className="flex items-center gap-2 text-gray-600">
                <SmilePlus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="font-medium">Emotion Status:</span>
                <span>{interaction.emotion}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium">Token:</span>
                  <span>${interaction.blockchainStats.token}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium">Market Cap:</span>
                  <span>${interaction.blockchainStats.marketCap}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium">Holders:</span>
                  <span>{interaction.blockchainStats.holders}</span>
                </div>
                
                <div className="flex items-center gap-2 text-gray-600">
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="font-medium">Treasury Worth:</span>
                  <span>${interaction.blockchainStats.treasuryWorth}</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function InteractionFeed({ interactions }: { interactions: Interaction[] }) {
  return (
    <div className="relative pl-4">
      <AnimatePresence mode="popLayout">
        {interactions.map((interaction, index) => (
          <InteractionCard 
            key={`${interaction.id}-${interaction.timestamp.getTime()}`}
            interaction={interaction}
            isLast={index === interactions.length - 1}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

