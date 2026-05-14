import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Maine Election Results | Bangor Daily News',
  description: '2026 Maine Primary Election Results — Live results for governor, U.S. Senate, U.S. House, and local races.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div style={{ maxWidth: 'var(--max-width-content)', margin: '0 auto', padding: '0 var(--gutter-desktop)', display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
            <a href="https://www.bangordailynews.com" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
              <div style={{
                background: 'var(--color-bdn-green)',
                color: '#fff',
                fontFamily: 'var(--font-sans)',
                fontWeight: 900,
                fontSize: '0.875rem',
                letterSpacing: '0.04em',
                width: '2.5rem',
                height: '2.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2px',
                flexShrink: 0,
              }}>
                BDN
              </div>
              <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-gray-900)' }} className="hidden sm:inline">
                Bangor Daily News
              </span>
            </a>
            <div style={{ width: '1px', height: '1.25rem', background: 'var(--color-gray-300)' }} className="hidden sm:block" />
            <a href="/" style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-bdn-green)', textDecoration: 'none' }}>
              Election Results 2026
            </a>
          </div>
        </header>

        <main style={{ maxWidth: 'var(--max-width-content)', margin: '0 auto', padding: 'var(--space-6) var(--gutter-desktop)' }}>
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
