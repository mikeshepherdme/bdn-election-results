import { getRace } from '@/lib/mock-data'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const race = getRace(slug)
  if (!race) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(race, {
    headers: { 'Cache-Control': 'no-store' },
  })
}
