import { memo, useCallback } from "react"
import { motion } from "framer-motion"
import { PetState } from "@/types/pet"
import { RabbitIcon as Duck, HelpCircle, Smile, Thermometer, Utensils, Scale, Lightbulb, Pencil } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { CatDisplay } from "./cat-display"

interface StatusScreenProps {
  pet: PetState
  onAction: (action: string) => void
}

const icons = [
  { Icon: Duck, label: "Play", tooltip: "Play with your pet", color: "bg-yellow-400" },
  { Icon: Utensils, label: "Feed", tooltip: "Feed your pet", color: "bg-green-400" },
  { Icon: Lightbulb, label: "Educate", tooltip: "Teach your pet", color: "bg-blue-400" },
  { Icon: Pencil, label: "Customize", tooltip: "Customize your pet", color: "bg-purple-400" },
]

function StatusScreenComponent({ pet, onAction }: StatusScreenProps) {
  const getPetMood = useCallback((): "happy" | "sad" | "tired" | "hungry" | "normal" => {
    if (pet.hunger < 30) return "hungry"
    if (pet.energy < 30) return "tired"
    if (pet.happiness < 30) return "sad"
    if (pet.happiness > 80) return "happy"
    return "normal"
  }, [pet])

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div 
        className="bg-gray-100 rounded-xl p-4 shadow-inner"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-4">
          <CatDisplay mood={getPetMood()} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          {icons.map(({ Icon, label, tooltip, color }) => (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-12 h-12 ${color} rounded-full flex items-center justify-center transition-all duration-200 shadow-md`}
                  onClick={() => onAction(label.toLowerCase())}
                >
                  <Icon className="w-6 h-6 text-white" />
                </motion.button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="font-medium">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <StatusIndicator value={pet.hunger} color="bg-red-400" tooltip="Hunger" />
          <StatusIndicator value={pet.happiness} color="bg-yellow-400" tooltip="Happiness" />
          <StatusIndicator value={pet.energy} color="bg-blue-400" tooltip="Energy" />
          <StatusIndicator value={pet.hygiene} color="bg-green-400" tooltip="Hygiene" />
        </div>
      </motion.div>
    </TooltipProvider>
  )
}

const StatusIndicator = memo(({ value, color, tooltip }: { value: number, color: string, tooltip: string }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${value}%` }}></div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}: {value}%</p>
      </TooltipContent>
    </Tooltip>
  )
})

StatusIndicator.displayName = 'StatusIndicator'

export const StatusScreen = memo(StatusScreenComponent)

