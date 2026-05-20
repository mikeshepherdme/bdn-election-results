import SiteHeader from '@/components/SiteHeader'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
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
    </>
  )
}
