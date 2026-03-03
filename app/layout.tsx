import type { Metadata, Viewport } from 'next'
import './globals.css'
import Sidebar from './components/Sidebar'
import Providers from './components/Providers'

export const metadata: Metadata = {
  title: {
    default: 'Hartza',
    template: '%s | Hartza',
  },
  description: 'Little bits, in rhythm to savings',
  icons: {
    icon: [
      { url: '/images/favicon.ico' },
      { url: '/images/app_icon_64x64.png', sizes: '64x64', type: 'image/png' },
      { url: '/images/app_icon_128x128.png', sizes: '128x128', type: 'image/png' },
      { url: '/images/app_icon_256x256.png', sizes: '256x256', type: 'image/png' },
    ],
    apple: { url: '/images/app_icon_512x512.png', sizes: '512x512', type: 'image/png' },
  },
  manifest: '/manifest.webmanifest',
}

export const viewport: Viewport = {
  themeColor: '#2E4A3F',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-screen">
        <Providers>
          <Sidebar />
          <main className="flex-1 min-w-0 overflow-y-auto">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  )
}
