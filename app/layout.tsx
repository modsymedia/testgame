import type { Metadata } from 'next'
import './globals.css'
import { WalletProvider } from '@/context/WalletContext'
import { UserDataProvider } from '@/context/UserDataContext'
import { PointsProvider } from '@/context/PointsContext'
import BackgroundMusic from '@/components/ui/BackgroundMusic'
import { Toaster } from "@/components/ui/feedback/toaster"
import ReferralSuccess from "@/components/ui/ReferralSuccess"
import ReferralHandler from '@/components/referral/ReferralHandler'
import '@/lib/fixes/setup-mock-db'
import React, { Suspense } from 'react'
import Providers from '@/components/providers'

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
        <Providers>
          <WalletProvider>
            <UserDataProvider>
              <PointsProvider>
                <BackgroundMusic />
                <main>
                  {children}
                </main>
                <Toaster />
                <ReferralSuccess />
              </PointsProvider>
            </UserDataProvider>
          </WalletProvider>
        </Providers>
        <Suspense fallback={null}>
          <ReferralHandler />
        </Suspense>
      </body>
    </html>
  )
}
