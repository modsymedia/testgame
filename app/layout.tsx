import type { Metadata } from 'next'
import './globals.css'
import { WalletProvider } from '@/context/WalletContext'

export const metadata: Metadata = {
  title: 'Crypto Pet',
  description: 'Virtual pet game with Phantom wallet integration',
  generator: 'v0.dev',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  )
}
