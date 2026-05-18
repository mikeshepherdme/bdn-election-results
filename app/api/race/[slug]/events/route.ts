import { NextResponse } from 'next/server'
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

const FILE = join(process.cwd(), 'data/race-events.json')

export type EventCategory = 'call' | 'milestone' | 'note' | 'ai' | 'story'

export interface StoryMeta {
  title: string
  image?: string
  description?: string
}

export interface RaceEvent {
  id: string
  created_at: string
  text: string
  category: EventCategory
  author?: string
  condition_key?: string
  url?: string
  story_meta?: StoryMeta
}

function readAll(): Record<string, RaceEvent[]> {
  try {
    return JSON.parse(readFileSync(FILE, 'utf-8'))
  } catch {
    return {}
  }
}

async function fetchStoryMeta(url: string): Promise<StoryMeta> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'BDNElectionBot/1.0' },
      signal: AbortSignal.timeout(5000),
    })
    const html = await res.text()
    const get = (prop: string) => {
      const m = html.match(new RegExp(`<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
               ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`, 'i'))
      return m?.[1] ?? ''
    }
    const title = get('title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || url
    return {
      title: title.replace(/\s*[|\-–—].*$/, '').trim(), // strip site name suffix
      image: get('image') || undefined,
      description: get('description') || undefined,
    }
  } catch {
    return { title: url }
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const all = readAll()
  const events = (all[slug] ?? []).slice().reverse() // newest first
  return NextResponse.json(events, { headers: { 'Cache-Control': 'no-store' } })
}

function checkAuth(req: Request): boolean {
  const expected = process.env.UPDATE_PASSWORD
  if (!expected) return true // no password set — open
  const auth = req.headers.get('Authorization') ?? ''
  return auth === `Bearer ${expected}`
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slug } = await params
  const body = await req.json()
  const { text, category = 'note', author, url } = body

  const isStory = category === 'story' && url?.trim()

  if (!isStory && !text?.trim()) {
    return NextResponse.json({ error: 'text required' }, { status: 400 })
  }

  const event: RaceEvent = {
    id: randomUUID(),
    created_at: new Date().toISOString(),
    text: text?.trim() || '',
    category: isStory ? 'story' : category,
    author: author?.trim() || undefined,
    url: isStory ? url.trim() : undefined,
  }

  if (isStory) {
    event.story_meta = await fetchStoryMeta(url.trim())
  }

  const all = readAll()
  if (!all[slug]) all[slug] = []
  all[slug].push(event)
  writeFileSync(FILE, JSON.stringify(all, null, 2))

  return NextResponse.json(event, { status: 201 })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slug } = await params
  const { id } = await req.json()
  const all = readAll()
  if (all[slug]) all[slug] = all[slug].filter(e => e.id !== id)
  writeFileSync(FILE, JSON.stringify(all, null, 2))
  return NextResponse.json({ ok: true })
}
