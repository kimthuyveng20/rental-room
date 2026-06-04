import type { Metadata, Viewport } from 'next'
import {  Angkor, Arimo } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import './globals.css'

const angkor = Angkor({
  weight: "400",
  subsets: ["khmer"],
  variable: "--font-khmer",
});

const arimo = Arimo({ 
  subsets: ["latin"], 
  variable: "--font-arimo" 
});

export const metadata: Metadata = {
  title: 'Dynamic POS - Point of Sale System',
  description: 'A modern point of sale system for managing products, orders, customers, and analytics',
  generator: 'Next.js',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className={`bg-background ${angkor.variable} ${arimo.variable}`}>
      <body className="font-sans antialiased bg-background">
        <NextIntlClientProvider messages={messages}>
          {children}
        </NextIntlClientProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
