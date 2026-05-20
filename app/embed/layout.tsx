import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ padding: 0, margin: 0, background: 'transparent' }}>
      {children}
    </div>
  )
}
