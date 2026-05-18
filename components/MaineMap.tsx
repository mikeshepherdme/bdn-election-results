'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface CandResult {
  lastName: string
  pct: number
  color: string
}

interface TownResult {
  leadingCandId: number
  leadingName: string
  leadingPct: number
  totalVotes: number
  color: string
  allResults: CandResult[]
}

interface Props {
  townResults: Record<string, TownResult>
}

const MIN_LNG = -71.65, MAX_LNG = -66.75
const MIN_LAT = 42.90, MAX_LAT = 47.56
const MIN_ZOOM = 1, MAX_ZOOM = 4, ZOOM_STEP = 1

function toMercY(lat: number): number {
  const r = (lat * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + r / 2))
}
const mercYMin = toMercY(MIN_LAT)
const mercYMax = toMercY(MAX_LAT)
const mercSpan = mercYMax - mercYMin
const lngSpanRad = (MAX_LNG - MIN_LNG) * (Math.PI / 180)

// True Mercator: both axes use the same scale so the map isn't distorted
const H = 500
const W = Math.round((lngSpanRad / mercSpan) * H)   // ≈ 385

function project(lng: number, lat: number): [number, number] {
  const x = ((lng - MIN_LNG) * (Math.PI / 180) / mercSpan) * H
  const y = (1 - (toMercY(lat) - mercYMin) / mercSpan) * H
  return [x, y]
}

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

const BTN: React.CSSProperties = {
  width: 28, height: 28, background: 'white', border: '1px solid #c8c8c8',
  borderRadius: 4, fontSize: 18, fontWeight: 700, lineHeight: 1,
  cursor: 'pointer', color: '#444', display: 'flex',
  alignItems: 'center', justifyContent: 'center', userSelect: 'none',
}

export default function MaineMap({ townResults }: Props) {
  const router = useRouter()
  const [resultsGeo, setResultsGeo] = useState<any>(null)
  const [unorganizedGeo, setUnorganizedGeo] = useState<any>(null)
  const [tooltip, setTooltip] = useState<{
    x: number; y: number; name: string; result: TownResult | null
  } | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null)

  useEffect(() => {
    fetch('/geo/maine-results.geojson').then(r => r.json()).then(setResultsGeo)
    fetch('/geo/maine-unorganized.geojson').then(r => r.json()).then(setUnorganizedGeo)
  }, [])

  function handleZoom(delta: number) {
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + delta))
    if (newZoom === zoom) return
    if (newZoom === 1) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
      return
    }
    setZoom(newZoom)
    setPan({
      x: W / 2 - (W / 2 - pan.x) / zoom * newZoom,
      y: H / 2 - (H / 2 - pan.y) / zoom * newZoom,
    })
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (zoom <= 1) return
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y }
    setIsDragging(true)
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!dragRef.current || !svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const scaleX = W / rect.width
    const scaleY = H / rect.height
    const dx = (e.clientX - dragRef.current.startX) * scaleX
    const dy = (e.clientY - dragRef.current.startY) * scaleY
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy })
  }

  function handleMouseUp() {
    dragRef.current = null
    setIsDragging(false)
  }

  // Convert path-space bbox coords to SVG-root space for tooltip positioning
  function toSvgCoords(rawX: number, rawY: number) {
    return { x: rawX * zoom + pan.x, y: rawY * zoom + pan.y }
  }

  return (
    <div className="relative w-full">
      {/* Zoom controls */}
      <div style={{ position: 'absolute', bottom: 8, right: 8, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button
          style={{ ...BTN, opacity: zoom >= MAX_ZOOM ? 0.35 : 1 }}
          onClick={() => handleZoom(ZOOM_STEP)}
          disabled={zoom >= MAX_ZOOM}
          title="Zoom in"
        >+</button>
        <button
          style={{ ...BTN, opacity: zoom <= MIN_ZOOM ? 0.35 : 1 }}
          onClick={() => handleZoom(-ZOOM_STEP)}
          disabled={zoom <= MIN_ZOOM}
          title="Zoom out"
        >−</button>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto block"
        style={{
          maxHeight: '460px',
          cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
          {unorganizedGeo?.features.map((f: any, i: number) => (
            <path key={`u-${i}`} d={featureToPath(f)} fill="#e4e4e4" stroke="#fff" strokeWidth={0.5} />
          ))}

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
                  const bbox = (e.target as SVGPathElement).getBBox()
                  setTooltip({ x: bbox.x + bbox.width / 2, y: bbox.y, name, result })
                }}
                onMouseLeave={() => setTooltip(null)}
                onClick={() => router.push(`/towns/${toSlug(name)}`)}
              />
            )
          })}
        </g>

        {tooltip && (() => {
          const { x, y } = toSvgCoords(tooltip.x, tooltip.y)
          return (
            <foreignObject
              x={Math.max(4, Math.min(x - 70, W - 155))}
              y={Math.max(4, y - 10)}
              width={160}
              height={200}
              style={{ overflow: 'visible', pointerEvents: 'none' }}
            >
              <div style={{
                background: 'rgba(17,17,17,0.92)', color: '#fff',
                padding: '6px 9px', borderRadius: '3px', fontSize: '11px',
                lineHeight: '1.6', whiteSpace: 'nowrap', width: 'fit-content',
              }}>
                <div style={{ fontWeight: 700, marginBottom: '3px' }}>{tooltip.name}</div>
                {tooltip.result
                  ? tooltip.result.allResults.filter(r => r.pct > 0).map((r, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '2px', backgroundColor: r.color, flexShrink: 0 }} />
                        <span>{r.lastName}</span>
                        <span style={{ marginLeft: 'auto', paddingLeft: '8px', fontVariantNumeric: 'tabular-nums' }}>
                          {r.pct.toFixed(1)}%
                        </span>
                      </div>
                    ))
                  : <div style={{ color: '#aaa' }}>No results yet</div>
                }
              </div>
            </foreignObject>
          )
        })()}
      </svg>

      {!resultsGeo && (
        <div className="absolute inset-0 flex items-center justify-center text-xs" style={{ color: '#767676' }}>
          Loading map…
        </div>
      )}
    </div>
  )
}
