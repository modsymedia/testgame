import { Progress } from "@/components/ui/data-display/progress"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface StatBarProps {
  value: number
  label: string
  color: string
  icon: React.ReactNode
  className?: string
}

export function StatBar({ value, label, color, icon, className }: StatBarProps) {
  return (
    <motion.div 
      className={className}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <div className={cn("p-1.5 rounded-lg", color)}>
            {icon}
          </div>
          <span className="text-sm font-medium">{label}</span>
        </div>
        <span className="text-sm text-muted-foreground">{value}%</span>
      </div>
      <Progress value={value} className="h-3 rounded-full" indicatorColor={color} />
    </motion.div>
  )
}


