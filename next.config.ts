import type { NextConfig } from 'next'

const FRAME_ANCESTORS = "frame-ancestors 'self' https://www.bangordailynews.com https://bangordailynews.com https://*.bangordailynews.com"

const config: NextConfig = {
  outputFileTracingIncludes: {
    '/api/towns': ['./data/*.json'],
    '/api/race/[slug]': ['./data/*.json'],
    '/api/race/[slug]/auto-updates': ['./data/*.json'],
    '/api/race/[slug]/events': ['./data/*.json'],
    '/api/events': ['./data/*.json'],
    '/api/topper': ['./data/*.json'],
  },
  async headers() {
    return [
      {
        source: '/embed/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: FRAME_ANCESTORS },
        ],
      },
    ]
  },
}

export default config
