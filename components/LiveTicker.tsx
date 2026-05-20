'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { GlobalEvent } from '@/app/api/events/route'
import type { EventCategory } from '@/app/api/race/[slug]/events/route'

const CATEGORY_STYLES: Record<EventCategory, { label: string; color: string; bg: string }> = {
  call:      { label: 'CALLED',    color: '#166534', bg: '#dcfce7' },
  milestone: { label: 'MILESTONE', color: '#92400e', bg: '#fef3c7' },
  note:      { label: 'NOTE',      color: '#1e40af', bg: '#dbeafe' },
  ai:        { label: 'AI',        color: '#6b21a8', bg: '#f3e8ff' },
  story:     { label: 'STORY',     color: '#065f46', bg: '#d1fae5' },
}
const BELLWETHER_STYLE  = { label: 'BELLWETHER',    color: '#0f5c6e', bg: '#d0f0f7' }
const BIGVOTEDROP_STYLE = { label: 'BIG VOTE DROP', color: '#5b2d8e', bg: '#ede9fe' }

function badgeFor(ev: GlobalEvent) {
  const key = ev.condition_key ?? ''
  if (key.startsWith('bellwether-')) return BELLWETHER_STYLE
  if (key.startsWith('milestone-')) return CATEGORY_STYLES.milestone
  if (key.startsWith('call-')) return CATEGORY_STYLES.call
  if (key.startsWith('bigdrop-')) return BIGVOTEDROP_STYLE
  if (!ev.condition_key) return CATEGORY_STYLES[ev.category] ?? CATEGORY_STYLES.note
  return null
}

function displayText(ev: GlobalEvent) {
  const key = ev.condition_key ?? ''
  if (key.startsWith('bellwether-')) return ev.text.replace(/Bellwether:\s*/i, '')
  return ev.text
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  })
}

export default function LiveTicker({ maxHeight = '360px' }: { maxHeight?: string }) {
  const [events, setEvents] = useState<GlobalEvent[]>([])
  const prevIds = useRef(new Set<string>())
  const [newIds, setNewIds] = useState(new Set<string>())

  async function fetchEvents() {
    try {
      const res = await fetch('/api/events', { cache: 'no-store' })
      if (!res.ok) return
      const data: GlobalEvent[] = await res.json()
      setEvents(data)
      const incoming = new Set(data.map(e => e.id).filter(id => !prevIds.current.has(id)))
      if (incoming.size > 0 && prevIds.current.size > 0) setNewIds(incoming)
      prevIds.current = new Set(data.map(e => e.id))
    } catch {}
  }

  useEffect(() => {
    fetchEvents()
    const t = setInterval(fetchEvents, 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (newIds.size === 0) return
    const t = setTimeout(() => setNewIds(new Set()), 4000)
    return () => clearTimeout(t)
  }, [newIds])

  return (
    <div className="border border-[#c8c8c8] rounded-lg overflow-hidden bg-white">
      <div className="px-4 py-2.5 bg-[#f2f2f2] border-b border-[#c8c8c8] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#444444] flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#cc2929] animate-pulse" />
          Live Updates
        </h2>
        <span className="text-xs text-[#767676]">Across all races</span>
      </div>

      {events.length === 0 ? (
        <div className="px-4 py-3 text-sm text-[#767676]">
          No updates yet. Calls, milestones, and staff notes will appear here as they happen.
        </div>
      ) : (
        <ul className="divide-y divide-[#f2f2f2] overflow-y-auto" style={{ maxHeight }}>
          {events.map(ev => {
            const badge = badgeFor(ev)
            const text = displayText(ev)
            const isNew = newIds.has(ev.id)
            const isCall = ev.category === 'call' || (ev.condition_key ?? '').startsWith('call-')
            const rowBg = isCall ? '#fef2f2' : isNew ? '#fffbeb' : undefined
            return (
              <li
                key={ev.id}
                className="flex items-start gap-3 transition-colors"
                style={{ padding: '10px 16px', ...(rowBg ? { backgroundColor: rowBg } : {}) }}
              >
                <span className="text-xs text-[#767676] tabular-nums whitespace-nowrap pt-0.5 w-16 shrink-0">
                  {fmt(ev.created_at)}
                </span>
                {badge && (
                  <span
                    className="text-xs font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 mt-0.5"
                    style={{ color: badge.color, backgroundColor: badge.bg }}
                  >
                    {badge.label}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/races/${ev.race_slug}`}
                    className="text-xs font-semibold text-[#444444] hover:text-[#2e6b3e] transition-colors block"
                  >
                    {ev.race_label}
                  </Link>
                  {text && <p className="text-sm text-[#1a1a1a] mt-0.5">{text}</p>}
                  {ev.category === 'story' && ev.url && ev.story_meta && (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 flex gap-3 rounded-lg overflow-hidden border border-[#e0e0e0] hover:border-[#2e6b3e] transition-colors bg-white"
                      style={{ textDecoration: 'none' }}
                    >
                      {ev.story_meta.image && (
                        <img
                          src={ev.story_meta.image}
                          alt=""
                          className="w-16 shrink-0 object-cover"
                          style={{ aspectRatio: '1/1' }}
                        />
                      )}
                      <div className="py-1.5 pr-3 flex flex-col justify-center min-w-0" style={ev.story_meta.image ? {} : { paddingLeft: '12px' }}>
                        <p className="text-xs font-bold text-[#1a1a1a] leading-snug">
                          {ev.story_meta.title}
                        </p>
                        <p className="text-xs text-[#2e6b3e] mt-0.5 font-medium">bangordailynews.com →</p>
                      </div>
                    </a>
                  )}
                </div>
                {ev.author && (
                  <span className="text-xs text-[#767676] shrink-0 pt-0.5">— {ev.author}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
