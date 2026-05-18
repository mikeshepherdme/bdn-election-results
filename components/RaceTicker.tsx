'use client'

import { useState, useEffect, useRef } from 'react'
import type { RaceEvent, EventCategory } from '@/app/api/race/[slug]/events/route'

interface Props {
  raceSlug: string
}

const CATEGORY_STYLES: Record<EventCategory, { label: string; color: string; bg: string }> = {
  call:      { label: 'CALLED',     color: '#166534', bg: '#dcfce7' },
  milestone: { label: 'MILESTONE',  color: '#92400e', bg: '#fef3c7' },
  note:      { label: 'NOTE',       color: '#1e40af', bg: '#dbeafe' },
  ai:        { label: 'AI',         color: '#6b21a8', bg: '#f3e8ff' },
  story:     { label: 'STORY',      color: '#065f46', bg: '#d1fae5' },
}

const BELLWETHER_STYLE  = { label: 'BELLWETHER',     color: '#0f5c6e', bg: '#d0f0f7' }
const BIGVOTEDROP_STYLE = { label: 'BIG VOTE DROP', color: '#5b2d8e', bg: '#ede9fe' }

function getUpdateDisplay(ev: RaceEvent): { badge: { label: string; color: string; bg: string } | null; text: string } {
  const key = ev.condition_key ?? ''
  if (key.startsWith('bellwether-')) {
    return { badge: BELLWETHER_STYLE, text: ev.text.replace(/Bellwether:\s*/i, '') }
  }
  if (key.startsWith('milestone-')) {
    return { badge: CATEGORY_STYLES.milestone, text: ev.text }
  }
  if (key.startsWith('call-')) {
    return { badge: CATEGORY_STYLES.call, text: ev.text }
  }
  if (key.startsWith('bigdrop-')) {
    return { badge: BIGVOTEDROP_STYLE, text: ev.text }
  }
  // Manual updates use category badge; other auto types get no badge
  if (!ev.condition_key) {
    return { badge: CATEGORY_STYLES[ev.category] ?? CATEGORY_STYLES.note, text: ev.text }
  }
  return { badge: null, text: ev.text }
}

function fmt(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York',
  })
}

export default function RaceTicker({ raceSlug }: Props) {
  const [events, setEvents] = useState<RaceEvent[]>([])
  const [showForm, setShowForm] = useState(false)
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const category: EventCategory = url.trim() ? 'story' : 'note'
  const [author, setAuthor] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [authed, setAuthed] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState(false)
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false)

  // Restore session auth on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('bdn_update_auth')) {
      setAuthed(true)
    }
  }, [])

  // Hidden hotkey: Cmd+W, Cmd+O, Cmd+W in sequence
  useEffect(() => {
    const SEQ = ['w', 'o', 'w']
    let step = 0

    const handler = (e: KeyboardEvent) => {
      if (!e.metaKey || !e.ctrlKey) { step = 0; return }
      if (e.key.toLowerCase() === SEQ[step]) {
        e.preventDefault()
        step++
        if (step === SEQ.length) {
          step = 0
          if (!authed) {
            setShowPasswordPrompt(v => !v)
            setShowForm(false)
          } else {
            setShowForm(v => !v)
            setShowPasswordPrompt(false)
          }
        }
      } else {
        step = e.key.toLowerCase() === SEQ[0] ? 1 : 0
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [authed])
  const prevIds = useRef(new Set<string>())
  const [newIds, setNewIds] = useState(new Set<string>())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function authHeaders(): Record<string, string> {
    const pw = typeof window !== 'undefined' ? sessionStorage.getItem('bdn_update_auth') : null
    return pw ? { 'Authorization': `Bearer ${pw}` } : {}
  }

  async function fetchEvents() {
    try {
      const res = await fetch(`/api/race/${raceSlug}/events`, { cache: 'no-store' })
      if (!res.ok) return
      const data: RaceEvent[] = await res.json()
      setEvents(data)
      const incoming = new Set(data.map(e => e.id).filter(id => !prevIds.current.has(id)))
      if (incoming.size > 0 && prevIds.current.size > 0) setNewIds(incoming)
      prevIds.current = new Set(data.map(e => e.id))
      if (data.some(e => e.category === 'call') && intervalRef.current !== null) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    } catch {}
  }

  useEffect(() => {
    fetchEvents()
    intervalRef.current = setInterval(fetchEvents, 30_000)
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current)
    }
  }, [raceSlug])

  // Clear highlight after 4s
  useEffect(() => {
    if (newIds.size === 0) return
    const t = setTimeout(() => setNewIds(new Set()), 4000)
    return () => clearTimeout(t)
  }, [newIds])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Catch URL pasted into text field at submit time too
    const resolvedUrl = url.trim() || (/^https?:\/\/\S+$/.test(text.trim()) ? text.trim() : '')
    const resolvedText = resolvedUrl && resolvedUrl === text.trim() ? '' : text.trim()
    const isStory = !!resolvedUrl
    if (!isStory && !resolvedText) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/race/${raceSlug}/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ text: resolvedText, category: isStory ? 'story' : 'note', author, url: resolvedUrl || undefined }),
      })
      if (res.status === 401) {
        sessionStorage.removeItem('bdn_update_auth')
        setAuthed(false)
        setPasswordError(true)
        setShowPasswordPrompt(true)
        setShowForm(false)
        return
      }
      setText('')
      setUrl('')
      setShowForm(false)
      await fetchEvents()
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/race/${raceSlug}/events`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ id }),
    })
    if (res.status === 401) {
      sessionStorage.removeItem('bdn_update_auth')
      setAuthed(false)
      setShowPasswordPrompt(true)
      return
    }
    await fetchEvents()
  }

  return (
    <div className="border border-[#c8c8c8] rounded-lg overflow-hidden bg-white">
      {/* Header */}
      <div className="px-4 py-2.5 bg-[#f2f2f2] border-b border-[#c8c8c8] flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#444444] flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-[#cc2929] animate-pulse" />
          Live Updates
        </h2>
        {(showForm || showPasswordPrompt) && (
          <button
            onClick={() => { setShowForm(false); setShowPasswordPrompt(false) }}
            className="text-xs text-[#2e6b3e] hover:underline font-medium"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Password prompt */}
      {showPasswordPrompt && (
        <form
          onSubmit={e => {
            e.preventDefault()
            const expected = passwordInput.trim()
            // Verify by attempting a dry-run fetch — use a HEAD-style check via a dummy POST
            // Instead: just store and let the next real action verify; show error on 401
            sessionStorage.setItem('bdn_update_auth', expected)
            setAuthed(true)
            setPasswordError(false)
            setPasswordInput('')
            setShowPasswordPrompt(false)
            setShowForm(true)
          }}
          className="px-4 py-3 border-b border-[#c8c8c8] bg-[#f9f9f9] flex items-center gap-2"
        >
          <input
            type="password"
            value={passwordInput}
            onChange={e => { setPasswordInput(e.target.value); setPasswordError(false) }}
            placeholder="Password"
            autoFocus
            className={`border rounded px-3 py-1.5 text-sm focus:outline-none w-44 ${passwordError ? 'border-[#cc2929] focus:border-[#cc2929]' : 'border-[#c8c8c8] focus:border-[#2e6b3e]'}`}
          />
          {passwordError && <span className="text-xs text-[#cc2929]">Incorrect password</span>}
          <button
            type="submit"
            disabled={!passwordInput.trim()}
            className="px-3 py-1.5 bg-[#2e6b3e] text-white rounded text-xs font-medium disabled:opacity-50 hover:bg-[#1e4d2c] transition-colors"
          >
            Sign in
          </button>
        </form>
      )}

      {/* Reporter form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="px-4 py-3 border-b border-[#c8c8c8] bg-[#f9f9f9] space-y-2">
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="BDN story URL (optional — paste to add a story card)"
            className="w-full border border-[#c8c8c8] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#2e6b3e]"
          />
          <textarea
            value={text}
            onChange={e => {
              const val = e.target.value
              // If the entire text field is a URL, auto-move it to the URL field
              if (/^https?:\/\/\S+$/.test(val.trim())) {
                setUrl(val.trim())
                setText('')
              } else {
                setText(val)
              }
            }}
            placeholder={url.trim() ? 'Optional note to go with the story…' : "What's happening? e.g. 'Jackson takes the lead in Penobscot County with 60% reporting'"}
            rows={2}
            className="w-full border border-[#c8c8c8] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-[#2e6b3e] resize-none"
          />
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Reporter name (optional)"
              className="border border-[#c8c8c8] rounded px-2 py-1 text-xs focus:outline-none focus:border-[#2e6b3e] w-44"
            />
            <button
              type="submit"
              disabled={submitting || (!text.trim() && !url.trim())}
              className="ml-auto px-3 py-1 bg-[#2e6b3e] text-white rounded text-xs font-medium disabled:opacity-50 hover:bg-[#1e4d2c] transition-colors"
            >
              {submitting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </form>
      )}

      {/* Events feed */}
      {events.length === 0 ? (
        <div className="px-4 py-3 text-sm text-[#767676]">
          No updates yet.
        </div>
      ) : (
        <ul className="divide-y divide-[#f2f2f2] overflow-y-auto" style={{ maxHeight: '320px' }}>
          {events.map(ev => {
            const { badge, text } = getUpdateDisplay(ev)
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
                  {text && <p className="text-sm text-[#1a1a1a]">{text}</p>}
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
                <button
                  onClick={() => handleDelete(ev.id)}
                  className="text-[#c8c8c8] hover:text-[#cc2929] text-xs shrink-0 pt-0.5 transition-colors"
                  title="Remove"
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
