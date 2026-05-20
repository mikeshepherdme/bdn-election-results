import ElectionTopper from '@/components/ElectionTopper'

export const metadata = {
  title: 'Maine election results — live topper',
  robots: { index: false, follow: false },
}

export default function EmbedTopperPage() {
  return (
    <div style={{ padding: '8px', background: 'transparent' }}>
      <ElectionTopper heading={true} />
      <div style={{ marginTop: '6px', textAlign: 'right' }}>
        <a
          href="https://www.bangordailynews.com/maine-election-results/"
          target="_top"
          style={{ fontSize: '11px', color: '#2e6b3e', textDecoration: 'none', fontWeight: 600 }}
        >
          Full results →
        </a>
      </div>
    </div>
  )
}
