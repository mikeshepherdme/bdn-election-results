import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Maine Primary Election Results 2026 - Bangor Daily News',
    template: '%s - Bangor Daily News',
  },
  description: 'Live results for the 2026 Maine primary elections, including races for governor, U.S. Senate, U.S. House, state legislature, and local offices.',
  openGraph: {
    siteName: 'Bangor Daily News',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    site: '@bangordailynews',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
