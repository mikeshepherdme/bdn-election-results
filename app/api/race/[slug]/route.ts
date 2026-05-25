import { NextResponse } from 'next/server'
import { getRaceBySlug, isConfigured } from '@/lib/ddhq'
import { getRace } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ slug: string }>
}

export async function GET(_req: Request, { params }: Props) {
  const { slug } = await params

  const race = isConfigured()
    ? await getRaceBySlug(slug)
    : getRace(slug)

  if (!race) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(race, {
    headers: {
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
