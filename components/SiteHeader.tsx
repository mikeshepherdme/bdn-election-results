'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Race } from '@/lib/types'

const SLOTS = [
  { slug: 'governor-democratic-primary',            label: 'Gov. (D)',    color: '#1A5FAB', wonBg: '#E8F0FA' },
  { slug: 'governor-republican-primary',            label: 'Gov. (R)',    color: '#CC2929', wonBg: '#FAE8E8' },
  { slug: 'us-senate-democratic-primary',           label: 'Senate (D)', color: '#1A5FAB', wonBg: '#E8F0FA' },
  { slug: 'us-house-district-2-democratic-primary', label: 'CD2 (D)',    color: '#1A5FAB', wonBg: '#E8F0FA' },
]

interface RaceInfo {
  leader: { name: string; pct: number; called: boolean }
  runnerUp: { name: string; gap: number } | null
}

function getRaceInfo(race: Race): RaceInfo | null {
  const tr = race.topline_results
  if (!tr?.total_votes) return null
  const ranked = Object.entries(tr.votes)
    .map(([id, votes]) => ({ id, votes, cand: race.candidates.find(c => String(c.cand_id) === id) }))
    .filter(e => e.cand && e.votes > 0)
    .sort((a, b) => b.votes - a.votes)
  if (ranked.length === 0) return null
  const total = tr.total_votes
  const top = ranked[0]
  const leaderPct = (top.votes / total) * 100
  const called = (tr.called_candidates ?? []).includes(Number(top.id))
  const runnerUp = ranked[1]
    ? { name: ranked[1].cand!.last_name, gap: leaderPct - (ranked[1].votes / total) * 100 }
    : null
  return { leader: { name: top.cand!.last_name, pct: leaderPct, called }, runnerUp }
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function SiteHeader() {
  const router = useRouter()
  const [races, setRaces] = useState<Record<string, Race | null>>({})
  const [towns, setTowns] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [townError, setTownError] = useState(false)

  useEffect(() => {
    // Fetch towns once on mount (static file, no serverless function needed)
    fetch('/towns.json').then(r => r.json()).then(setTowns).catch(() => {})

    // Fetch race data immediately and on interval
    async function fetchRaces() {
      const results = await Promise.all(
        SLOTS.map(async s => {
          try {
            const res = await fetch(`/api/race/${s.slug}`, { cache: 'no-store' })
            if (!res.ok) return [s.slug, null] as const
            return [s.slug, await res.json() as Race] as const
          } catch {
            return [s.slug, null] as const
          }
        })
      )
      setRaces(Object.fromEntries(results))
    }

    fetchRaces()
    const id = setInterval(fetchRaces, 30_000)
    return () => clearInterval(id)
  }, [])

  function handleTownSubmit(e: React.FormEvent) {
    e.preventDefault()
    const match = towns.find(t => t.toLowerCase() === query.trim().toLowerCase())
    if (!match) { setTownError(true); return }
    router.push(`/towns/${slugify(match)}`)
  }

  const navBtn = (href: string, label: React.ReactNode) => (
    <a
      href={href}
      className="text-[#2e6b3e] border border-[#c8c8c8] hover:border-[#2e6b3e] transition-colors rounded"
      style={{ padding: '5px 12px', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap', textDecoration: 'none', flexShrink: 0 }}
    >
      {label}
    </a>
  )

  return (
    <header className="site-header">
      <div style={{ maxWidth: '920px', margin: '0 auto', width: '100%' }}>

        {/* Row 1: branding + race ticker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <a href="https://www.bangordailynews.com" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }}>
            <img src="/bdn-logo.webp" alt="Bangor Daily News" style={{ height: '20px', width: 'auto' }} />
          </a>

          <div style={{ width: '1px', height: '1.25rem', background: 'var(--color-gray-300)', flexShrink: 0 }} />

          <a href="/" style={{ display: 'flex', flexDirection: 'column', textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' }}>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-bdn-green)', lineHeight: 1.2 }}>
              Maine Election Results
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 400, fontSize: '0.6875rem', color: 'var(--color-gray-500)', lineHeight: 1.2 }}>
              Primaries • June 9, 2026
            </span>
          </a>

          <div className="hidden md:block" style={{ width: '1px', height: '1.25rem', background: 'var(--color-gray-300)', flexShrink: 0 }} />
          <a href="https://votes.decisiondeskhq.com/" target="_blank" rel="noopener noreferrer" className="hidden md:block" style={{ flexShrink: 0 }}>
            <img src="/ddhq-logo.png" alt="Decision Desk HQ" style={{ height: '20px', width: 'auto', opacity: 0.75, display: 'block' }} />
          </a>

          {/* Race ticker — desktop only */}
          <div className="hidden md:flex" style={{ marginLeft: 'auto', alignItems: 'stretch' }}>
            {SLOTS.map((slot, i) => {
              const info = races[slot.slug] ? getRaceInfo(races[slot.slug]!) : null
              const won = info?.leader.called ?? false
              return (
                <a key={slot.slug} href={`/races/${slot.slug}`} style={{
                  display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  alignItems: 'flex-start', padding: '4px 14px',
                  borderLeft: i > 0 ? '1px solid #e0e0e0' : 'none',
                  textDecoration: 'none', flexShrink: 0,
                  backgroundColor: won ? slot.wonBg : 'transparent',
                }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: slot.color, display: 'inline-block' }} />
                    <span style={{ fontSize: '0.625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#767676' }}>{slot.label}</span>
                  </span>
                  {info ? (
                    <>
                      <span style={{ display: 'flex', alignItems: 'baseline', gap: '5px', whiteSpace: 'nowrap', lineHeight: 1.25 }}>
                        <span style={{ fontSize: '0.5625rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: won ? slot.color : '#1a5fab', padding: '0 3px', borderRadius: '2px', background: won ? slot.wonBg : '#e8f0fa' }}>
                          {won ? 'Winner' : 'Leading'}
                        </span>
                        {won && <span style={{ fontSize: '0.8125rem', color: slot.color }}>✓</span>}
                        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: won ? slot.color : '#1a1a1a' }}>{info.leader.name}</span>
                        {!won && <span style={{ fontSize: '0.75rem', color: '#767676' }}>{info.leader.pct.toFixed(0)}%</span>}
                      </span>
                      {info.runnerUp
                        ? <span style={{ fontSize: '0.6875rem', color: '#767676', whiteSpace: 'nowrap', lineHeight: 1.3 }}>2nd: <strong>{info.runnerUp.name}</strong> <span style={{ color: '#aaa' }}>–{info.runnerUp.gap.toFixed(1)} pts</span></span>
                        : <span style={{ fontSize: '0.6875rem', color: '#aaa', lineHeight: 1.3 }}>–</span>
                      }
                    </>
                  ) : (
                    <span style={{ fontSize: '0.8125rem', color: '#aaa', lineHeight: 1.25 }}>No results yet</span>
                  )}
                </a>
              )
            })}
          </div>
        </div>

        {/* Row 2: nav + town search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px solid #e8e8e8', marginTop: '8px', paddingTop: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' as any }}>
          {navBtn('/#statewide', 'Statewide & Federal')}
          {navBtn('/#legislature', <><span className="hidden sm:inline">Legislative primaries</span><span className="sm:hidden">Legislature</span></>)}
          {navBtn('/#county', 'County & DA')}

          <div style={{ width: '1px', height: '20px', backgroundColor: '#c8c8c8', margin: '0 4px', flexShrink: 0 }} />

          <form onSubmit={handleTownSubmit} style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span className="hidden sm:inline" style={{ fontSize: '13px', fontWeight: 600, color: '#444444', whiteSpace: 'nowrap' }}>Your town:</span>
            <input
              type="text"
              list="header-town-list"
              value={query}
              placeholder="Enter town…"
              onChange={e => { setQuery(e.target.value); setTownError(false) }}
              style={{ width: '160px', padding: '5px 10px', fontSize: '13px', fontFamily: 'inherit', border: townError ? '1px solid #cc0000' : '1px solid #c8c8c8', borderRadius: '4px', outline: 'none' }}
              onFocus={e => { if (!townError) e.currentTarget.style.borderColor = '#2e6b3e' }}
              onBlur={e => { if (!townError) e.currentTarget.style.borderColor = '#c8c8c8' }}
            />
            <datalist id="header-town-list">
              {towns.map(t => <option key={t} value={t} />)}
            </datalist>
            <button type="submit" style={{ padding: '5px 12px', fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', backgroundColor: '#2e6b3e', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', flexShrink: 0 }}>
              Go
            </button>
            {townError && <span style={{ fontSize: '12px', color: '#cc0000', whiteSpace: 'nowrap' }}>Not found</span>}
          </form>
        </div>

      </div>
    </header>
  )
}
