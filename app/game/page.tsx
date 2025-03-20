import { KawaiiDevice } from "@/components/kawaii-device"
import { Navigation } from "@/components/navigation"

export default function GamePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <main className="flex-grow flex items-center justify-center bg-pink-100">
        <KawaiiDevice />
      </main>
    </div>
  )
} 