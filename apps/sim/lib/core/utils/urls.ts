import { getEnv } from '@/lib/core/config/env'
import { isProd } from '@/lib/core/config/feature-flags'

function hasHttpProtocol(url: string): boolean {
  return /^https?:\/\//i.test(url)
}

function normalizeBaseUrl(url: string): string {
  if (hasHttpProtocol(url)) {
    return url
  }

  const protocol = isProd ? 'https://' : 'http://'
  return `${protocol}${url}`
}

/**
 * Returns the Vercel deployment URL when running on Vercel.
 * `VERCEL_URL` is automatically injected by Vercel on every deployment (without protocol).
 */
function getVercelDeploymentUrl(): string | undefined {
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl}`
  }
  return undefined
}

/**
 * Returns the base URL of the application.
 *
 * Resolution order:
 * 1. Client-side: `window.location.origin` (avoids CORS on Vercel preview deployments)
 * 2. Server-side Vercel preview: `VERCEL_URL` (deployment-specific URL)
 * 3. `NEXT_PUBLIC_APP_URL` (explicit configuration)
 * 4. Server-side Vercel (any env): `VERCEL_URL` as final fallback
 *
 * @returns The base URL string (e.g., 'http://localhost:3000' or 'https://example.com')
 * @throws Error if no URL can be resolved
 */
export function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }

  if (process.env.VERCEL_ENV === 'preview') {
    const vercelUrl = getVercelDeploymentUrl()
    if (vercelUrl) {
      return vercelUrl
    }
  }

  const baseUrl = getEnv('NEXT_PUBLIC_APP_URL')?.trim()
  if (baseUrl) {
    return normalizeBaseUrl(baseUrl)
  }

  const vercelFallback = getVercelDeploymentUrl()
  if (vercelFallback) {
    return vercelFallback
  }

  throw new Error(
    'NEXT_PUBLIC_APP_URL must be configured for webhooks and callbacks to work correctly'
  )
}

/**
 * Returns the base URL used by server-side internal API calls.
 * Falls back to NEXT_PUBLIC_APP_URL when INTERNAL_API_BASE_URL is not set.
 */
export function getInternalApiBaseUrl(): string {
  const internalBaseUrl = getEnv('INTERNAL_API_BASE_URL')?.trim()
  if (!internalBaseUrl) {
    return getBaseUrl()
  }

  if (!hasHttpProtocol(internalBaseUrl)) {
    throw new Error(
      'INTERNAL_API_BASE_URL must include protocol (http:// or https://), e.g. http://sim-app.default.svc.cluster.local:3000'
    )
  }

  return internalBaseUrl
}

/**
 * Ensures a URL is absolute by prefixing the base URL when a relative path is provided.
 * @param pathOrUrl - Relative path (e.g., /api/files/serve/...) or absolute URL
 */
export function ensureAbsoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) {
    throw new Error('URL is required')
  }

  if (pathOrUrl.startsWith('/')) {
    return `${getBaseUrl()}${pathOrUrl}`
  }

  return pathOrUrl
}

/**
 * Returns just the domain and port part of the application URL
 * @returns The domain with port if applicable (e.g., 'localhost:3000' or 'sim.ai')
 */
export function getBaseDomain(): string {
  try {
    const url = new URL(getBaseUrl())
    return url.host // host includes port if specified
  } catch (_e) {
    const fallbackUrl = getEnv('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'
    try {
      return new URL(fallbackUrl).host
    } catch {
      return isProd ? 'sim.ai' : 'localhost:3000'
    }
  }
}

/**
 * Returns the domain for email addresses, stripping www subdomain for Resend compatibility
 * @returns The email domain (e.g., 'sim.ai' instead of 'www.sim.ai')
 */
export function getEmailDomain(): string {
  try {
    const baseDomain = getBaseDomain()
    return baseDomain.startsWith('www.') ? baseDomain.substring(4) : baseDomain
  } catch (_e) {
    return isProd ? 'sim.ai' : 'localhost:3000'
  }
}
