import type { NextConfig } from 'next'

const CORS = [
  { key: 'Access-Control-Allow-Origin',  value: '*' },
  { key: 'Access-Control-Allow-Methods', value: 'GET,POST,DELETE,OPTIONS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
]

const config: NextConfig = {
  async headers() {
    return [{ source: '/api/:path*', headers: CORS }]
  },
  outputFileTracingIncludes: {
    '/api/towns': ['./data/*.json'],
    '/api/race/[slug]': ['./data/*.json'],
    '/api/race/[slug]/auto-updates': ['./data/*.json'],
    '/api/race/[slug]/events': ['./data/*.json'],
  },
}

export default config
