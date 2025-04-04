import type { Metadata } from 'next'
import './globals.css'
import { WalletProvider } from '@/context/WalletContext'
import { UserDataProvider } from '@/context/UserDataContext'
import { PointsProvider } from '@/context/PointsContext'

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
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Pixelify+Sans:wght@400..700&family=VT323&display=swap" rel="stylesheet" />
      </head>
      <body className="font-pixelify">
        <WalletProvider>
          <UserDataProvider>
            <PointsProvider>
              <main>
                {children}
              </main>
            </PointsProvider>
          </UserDataProvider>
        </WalletProvider>
      </body>
    </html>
  )
}
