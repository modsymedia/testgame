import Link from 'next/link'
import { HelpCircle, Github } from 'lucide-react'

export function Navigation() {
  return (
    <nav className="w-full bg-pink-100 p-4 flex justify-end items-center">
      <div className="flex items-center space-x-4">
        <Link href="/whitepaper" className="text-gray-600 hover:text-gray-800 transition-colors">
          <Github size={24} />
        </Link>
        <Link href="/info" className="text-gray-600 hover:text-gray-800 transition-colors">
          <HelpCircle size={24} />
        </Link>
      </div>
    </nav>
  )
}

