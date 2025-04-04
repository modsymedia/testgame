import { motion } from "framer-motion"

const Cloud = ({ delay = 0 }) => (
  <motion.div
    className="absolute bg-white rounded-full opacity-80"
    style={{
      width: Math.random() * 100 + 50,
      height: Math.random() * 60 + 30,
    }}
    animate={{
      x: ["0%", "100%"],
      y: [0, Math.random() * 20 - 10],
    }}
    transition={{
      duration: Math.random() * 60 + 60,
      delay,
      repeat: Infinity,
      repeatType: "loop",
    }}
  />
)

export function BackgroundScene() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <Cloud delay={0} />
      <Cloud delay={10} />
      <Cloud delay={20} />
      <Cloud delay={30} />
    </div>
  )
}

