'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  towns: string[]
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function HomepageNav({ towns }: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = query.trim()
    const match = towns.find(t => t.toLowerCase() === trimmed.toLowerCase())
    if (!match) { setError(true); return }
    router.push(`/towns/${slugify(match)}`)
  }

  const btnStyle: React.CSSProperties = {
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: 600,
    fontFamily: 'inherit',
    color: '#2e6b3e',
    background: 'white',
    border: '1px solid #c8c8c8',
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    textDecoration: 'none',
    display: 'inline-block',
  }

  return (
    <nav style={{
      position: 'sticky',
      top: 'var(--site-header-height)',
      zIndex: 50,
      backgroundColor: '#fff',
      borderBottom: '1px solid #c8c8c8',
      borderTop: '1px solid #e8e8e8',
      padding: '8px 0',
      marginBottom: '2rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>

        {/* Section links */}
        <a href="#legislature" style={btnStyle}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#2e6b3e')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#c8c8c8')}
        >
          <span className="hidden sm:inline">Legislative primaries</span>
          <span className="sm:hidden">Legislature</span>
        </a>
        <a href="#county" style={btnStyle}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#2e6b3e')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#c8c8c8')}
        >
          County &amp; DA
        </a>

        {/* Divider */}
        <div style={{ width: '1px', height: '20px', backgroundColor: '#c8c8c8', margin: '0 4px' }} />

        {/* Town search */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, minWidth: '180px', maxWidth: '340px' }}>
          <span className="hidden sm:inline" style={{ fontSize: '13px', fontWeight: 600, color: '#444444', whiteSpace: 'nowrap' }}>Your town:</span>
          <input
            type="text"
            list="nav-town-list"
            value={query}
            placeholder="Enter town…"
            onChange={e => { setQuery(e.target.value); setError(false) }}
            style={{
              flex: 1,
              padding: '5px 10px',
              fontSize: '13px',
              fontFamily: 'inherit',
              border: error ? '1px solid #cc0000' : '1px solid #c8c8c8',
              borderRadius: '4px',
              outline: 'none',
            }}
            onFocus={e => { if (!error) e.currentTarget.style.borderColor = '#2e6b3e' }}
            onBlur={e => { if (!error) e.currentTarget.style.borderColor = '#c8c8c8' }}
          />
          <datalist id="nav-town-list">
            {towns.map(t => <option key={t} value={t} />)}
          </datalist>
          <button type="submit" style={{
            padding: '5px 12px',
            fontSize: '13px',
            fontWeight: 600,
            fontFamily: 'inherit',
            backgroundColor: '#2e6b3e',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
          }}>
            Go
          </button>
          {error && <span style={{ fontSize: '12px', color: '#cc0000' }}>Not found</span>}
        </form>

        <div className="hidden lg:block" style={{ marginLeft: 'auto', textAlign: 'right', flexShrink: 0 }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#444444', lineHeight: 1.3 }}>Unofficial results</p>
          <p style={{ fontSize: '11px', color: '#767676', lineHeight: 1.3 }}>Analysis by the Bangor Daily News and Decision Desk HQ.</p>
        </div>

      </div>
    </nav>
  )
}
