'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface TownResult {
  leadingCandId: number
  leadingName: string
  leadingPct: number
  totalVotes: number
  color: string
}

interface Props {
  townResults: Record<string, TownResult>
}

// Maine bounding box (with a small margin)
const MIN_LNG = -71.15, MAX_LNG = -66.85
const MIN_LAT = 42.90, MAX_LAT = 47.52

// SVG canvas size
const W = 340, H = 500

// Web Mercator projection fitted to Maine's bounds
function toMercY(lat: number): number {
  const r = (lat * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + r / 2))
}
const mercYMin = toMercY(MIN_LAT)
const mercYMax = toMercY(MAX_LAT)

function project(lng: number, lat: number): [number, number] {
  const x = ((lng - MIN_LNG) / (MAX_LNG - MIN_LNG)) * W
  const y = (1 - (toMercY(lat) - mercYMin) / (mercYMax - mercYMin)) * H
  return [x, y]
}

// Convert a GeoJSON Polygon / MultiPolygon feature to an SVG path string
function featureToPath(feature: any): string {
  const geom = feature?.geometry
  if (!geom) return ''
  const rings: number[][][] =
    geom.type === 'Polygon'
      ? geom.coordinates
      : (geom.coordinates as number[][][][]).flat(1)

  return rings
    .map(ring =>
      ring
        .map(([lng, lat], i) => {
          const [x, y] = project(lng, lat)
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
        })
        .join(' ') + ' Z'
    )
    .join(' ')
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default function MaineMap({ townResults }: Props) {
  const router = useRouter()
  const [resultsGeo, setResultsGeo] = useState<any>(null)
  const [unorganizedGeo, setUnorganizedGeo] = useState<any>(null)
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; name: string; result: TownResult | null
  } | null>(null)

  useEffect(() => {
    fetch('/geo/maine-results.geojson').then(r => r.json()).then(setResultsGeo)
    fetch('/geo/maine-unorganized.geojson').then(r => r.json()).then(setUnorganizedGeo)
  }, [])

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        style={{ maxHeight: '560px' }}
      >
        {/* Unorganized territories */}
        {unorganizedGeo?.features.map((f: any, i: number) => (
          <path
            key={`u-${i}`}
            d={featureToPath(f)}
            fill="#e4e4e4"
            stroke="#fff"
            strokeWidth={0.5}
          />
        ))}

        {/* Municipalities */}
        {resultsGeo?.features.map((f: any) => {
          const name: string = f.properties?.municipality ?? ''
          const result = townResults[name] ?? null
          return (
            <path
              key={name}
              d={featureToPath(f)}
              fill={result?.color ?? '#ddd'}
              fillOpacity={result ? 0.9 : 0.65}
              stroke="#fff"
              strokeWidth={0.5}
              className="cursor-pointer"
              style={{ transition: 'opacity 0.1s' }}
              onMouseEnter={e => {
                // Compute SVG-space bbox centre for tooltip anchor
                const bbox = (e.target as SVGPathElement).getBBox()
                setTooltip({
                  x: bbox.x + bbox.width / 2,
                  y: bbox.y,
                  name,
                  result,
                })
              }}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => router.push(`/towns/${toSlug(name)}`)}
            />
          )
        })}

        {/* Tooltip */}
        {tooltip && (
          <foreignObject
            x={Math.min(tooltip.x - 70, W - 150)}
            y={Math.max(tooltip.y - 50, 4)}
            width={160}
            height={50}
            style={{ overflow: 'visible', pointerEvents: 'none' }}
          >
            <div
              style={{
                background: 'rgba(17,17,17,0.92)',
                color: '#fff',
                padding: '5px 9px',
                borderRadius: '3px',
                fontSize: '11px',
                lineHeight: '1.5',
                whiteSpace: 'nowrap',
                width: 'fit-content',
              }}
            >
              <div style={{ fontWeight: 700 }}>{tooltip.name}</div>
              {tooltip.result
                ? <div>{tooltip.result.leadingName} {tooltip.result.leadingPct.toFixed(1)}%</div>
                : <div style={{ color: '#aaa' }}>No results yet</div>
              }
            </div>
          </foreignObject>
        )}
      </svg>

      {!resultsGeo && (
        <div
          className="absolute inset-0 flex items-center justify-center text-xs"
          style={{ color: '#767676' }}
        >
          Loading map…
        </div>
      )}
    </div>
  )
}
