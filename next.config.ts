import type { NextConfig } from "next";
import { execSync } from 'child_process'

// Auto-increment version on every deploy using git commit count.
// Format: 1.0.<commit_count>  →  e.g. 1.0.42, 1.0.43, …
// No manual version bumping needed — every push gets a new number.
let buildNumber = '0'
try {
  buildNumber = execSync('git rev-list --count HEAD', { stdio: ['pipe', 'pipe', 'ignore'] })
    .toString()
    .trim()
} catch {}
const APP_VERSION = `1.0.${buildNumber}`

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse'],
  env: {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
    NEXT_PUBLIC_APP_VERSION: APP_VERSION,
  },
  turbopack: {
    resolveAlias: {
      '@': './src',
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },
};

export default nextConfig;
