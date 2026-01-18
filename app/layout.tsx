import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import VuetifyProvider from '@/components/VuetifyProvider'
import { CurrencyProvider } from '@/contexts/CurrencyContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Gestion Budgétaire Mensuelle',
  description: 'Application de gestion budgétaire mensuelle',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
        />
      </head>
      <body className={inter.className}>
        <VuetifyProvider>
          <CurrencyProvider>
            {children}
          </CurrencyProvider>
        </VuetifyProvider>
      </body>
    </html>
  )
}
