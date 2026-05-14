import type { NextConfig } from 'next'

const config: NextConfig = {
  // Leaflet and Observable Plot are browser-only — suppress SSR warnings
  serverExternalPackages: [],
}

export default config
