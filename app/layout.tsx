import type { Metadata } from 'next'
import './globals.css'
import SiteHeader from '@/components/SiteHeader'

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
      <body>
        <SiteHeader />

        <main className="px-5 md:px-8 py-6" style={{ maxWidth: '920px', margin: '0 auto' }}>
          {children}
        </main>

        <footer className="site-footer">
          <div className="footer-grid">
            <div>
              <p className="footer-col__heading">Bangor Daily News</p>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-300)', lineHeight: 'var(--leading-normal)' }}>
                Election results provided by{' '}
                <a href="https://decisiondeskhq.com">Decision Desk HQ</a>
                . Updated automatically. All times Eastern.
              </p>
            </div>
          </div>
          <div className="footer-bottom">
            © {new Date().getFullYear()} Bangor Daily News. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  )
}
