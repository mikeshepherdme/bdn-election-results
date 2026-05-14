'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MapContainer, GeoJSON, Tooltip } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({ iconRetinaUrl: '', iconUrl: '', shadowUrl: '' })

interface TownResult {
  leadingCandId: number
  leadingName: string
  leadingPct: number
  totalVotes: number
  color: string
}

interface Props {
  townResults: Record<string, TownResult>
  height?: string
}

function toSlug(municipality: string): string {
  return municipality
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default function TownMap({ townResults, height = 'h-96' }: Props) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [resultsGeo, setResultsGeo] = useState<any>(null)
  const [unorganizedGeo, setUnorganizedGeo] = useState<any>(null)

  useEffect(() => {
    setMounted(true)

    fetch('/geo/maine-results.geojson')
      .then((res) => res.json())
      .then(setResultsGeo)
      .catch((err) => console.error('Failed to load maine-results.geojson', err))

    fetch('/geo/maine-unorganized.geojson')
      .then((res) => res.json())
      .then(setUnorganizedGeo)
      .catch((err) => console.error('Failed to load maine-unorganized.geojson', err))
  }, [])

  if (!mounted) return null

  const styleResultsFeature = (feature: any) => {
    const municipality: string = feature?.properties?.municipality ?? ''
    const result = townResults[municipality]
    const fillColor = result?.color ?? '#e8e8e8'
    return {
      fillColor,
      fillOpacity: result ? 0.85 : 0.6,
      color: '#ffffff',
      weight: 0.75,
    }
  }

  const styleUnorganized = () => ({
    fillColor: '#e0e0e0',
    fillOpacity: 0.5,
    color: '#ffffff',
    weight: 0.75,
    interactive: false,
  })

  const onEachResultsFeature = (feature: any, layer: L.Layer) => {
    const municipality: string = feature?.properties?.municipality ?? ''
    const result = townResults[municipality]

    const tooltipContent =
      result && result.totalVotes > 0
        ? `<strong>${municipality}</strong><br/>${result.leadingName} ${result.leadingPct.toFixed(1)}%`
        : `<strong>${municipality}</strong><br/>No results yet`

    layer.bindTooltip(tooltipContent, { sticky: true })

    layer.on({
      mouseover(e: L.LeafletMouseEvent) {
        const l = e.target as L.Path
        l.setStyle({ weight: 2, color: '#333333' })
        l.bringToFront()
      },
      mouseout(e: L.LeafletMouseEvent) {
        const l = e.target as L.Path
        l.setStyle({ weight: 0.75, color: '#ffffff' })
      },
      click() {
        if (municipality) {
          router.push(`/towns/${toSlug(municipality)}`)
        }
      },
    })
  }

  // Maine bounding box — tightly crops to the state
  const maineBounds: L.LatLngBoundsExpression = [[42.977, -71.084], [47.459, -66.885]]

  return (
    <div className={`w-full ${height}`}>
      <MapContainer
        bounds={maineBounds}
        boundsOptions={{ padding: [4, 4] }}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        zoomControl={true}
      >
        {unorganizedGeo && (
          <GeoJSON
            key="unorganized"
            data={unorganizedGeo}
            style={styleUnorganized}
          />
        )}
        {resultsGeo && (
          <GeoJSON
            key="results"
            data={resultsGeo}
            style={styleResultsFeature}
            onEachFeature={onEachResultsFeature}
          />
        )}
      </MapContainer>
    </div>
  )
}
