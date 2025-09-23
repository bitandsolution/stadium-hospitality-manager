import { Providers } from './providers'
import { Toaster } from 'react-hot-toast'
import './globals.css'

export const metadata = {
  title: 'Stadium Hospitality Manager',
  description: 'Sistema di gestione accessi hospitality',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  )
}