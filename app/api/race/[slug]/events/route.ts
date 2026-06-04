import { NextResponse } from 'next/server'
import { kv } from '@vercel/kv'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

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

// In-memory fallback for local dev (no KV configured)
const memStore: Record<string, RaceEvent[]> = {}
const useKV = !!process.env.KV_REST_API_URL

async function readSlug(slug: string): Promise<RaceEvent[]> {
  if (useKV) return (await kv.get<RaceEvent[]>(`events:${slug}`)) ?? []
  return memStore[slug] ?? []
}

async function writeSlug(slug: string, events: RaceEvent[]): Promise<void> {
  if (useKV) await kv.set(`events:${slug}`, events)
  else memStore[slug] = events
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
      title: title.replace(/\s*[|\-–—].*$/, '').trim(),
      image: get('image') || undefined,
      description: get('description') || undefined,
    }
  } catch {
    return { title: url }
  }
}

function checkAuth(req: Request): boolean {
  const expected = process.env.UPDATE_PASSWORD
  if (!expected) return true
  const auth = req.headers.get('Authorization') ?? ''
  return auth === `Bearer ${expected}`
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const events = await readSlug(slug)
  return NextResponse.json(events.slice().reverse(), {
    headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' },
  })
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

  const events = await readSlug(slug)
  events.push(event)
  await writeSlug(slug, events)

  return NextResponse.json(event, {
    status: 201,
    headers: { 'Access-Control-Allow-Origin': '*' },
  })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { slug } = await params
  const { id } = await req.json()
  const events = await readSlug(slug)
  await writeSlug(slug, events.filter(e => e.id !== id))
  return NextResponse.json({ ok: true }, { headers: { 'Access-Control-Allow-Origin': '*' } })
}
