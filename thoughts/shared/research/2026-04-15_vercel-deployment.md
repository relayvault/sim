---
date: 2026-04-15
researcher: Devin
git_commit: 3a1b1a80327253aec6d7669ce9386c79f8b9c614
branch: main
repository: relayvault/sim
topic: "Vercel Deployment Configuration & Requirements"
tags: [research, codebase, vercel, deployment, infrastructure]
status: complete
last_updated: 2026-04-15
last_updated_by: Devin
---

# Research: Vercel Deployment Configuration & Requirements

## Research Question

Can `relayvault/sim` be deployed to Vercel? What configuration, environment variables, external services, and limitations exist in the codebase today?

## Summary

`relayvault/sim` is a Turborepo monorepo containing a Next.js 16 application (`apps/sim/`) that is architecturally compatible with Vercel deployment. The Next.js config already differentiates between Docker and non-Docker (Vercel-compatible) builds via the `DOCKER_BUILD` environment variable. When `DOCKER_BUILD` is not set, the app builds in Vercel's default serverless output mode. The codebase uses `export const runtime = 'nodejs'` and `export const maxDuration` annotations on API routes, which are Vercel serverless function configuration directives. However, deploying to Vercel requires careful attention to: (1) a separate Socket.IO realtime server that cannot run on Vercel, (2) native Node.js addons (`isolated-vm`) that need compilation, (3) Python dependencies for PII validation guardrails, (4) several `maxDuration` values exceeding Vercel's free/pro tier limits, and (5) approximately 6 required + 4 recommended environment variables.

## Detailed Findings

### 1. Build System & Next.js Configuration

#### Monorepo Structure

The repository is a Turborepo monorepo with workspaces defined in the root `package.json` ([`package.json:7-10`](https://github.com/relayvault/sim/blob/3a1b1a80/package.json#L7-L10)):

```json
"workspaces": ["apps/*", "packages/*"]
```

- **Package manager**: `bun@1.3.11` ([`package.json:63`](https://github.com/relayvault/sim/blob/3a1b1a80/package.json#L63))
- **Engine requirements**: Bun >=1.2.13, Node.js >=20.0.0 ([`apps/sim/package.json:6-9`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/package.json#L6-L9))
- **Vercel supports Bun natively** as an install/build tool

#### Build Pipeline

The build command chain in `apps/sim/package.json` ([lines 19-21](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/package.json#L19-L21)):

```
bun run build:pptx-worker → bun run build:doc-worker → next build
```

1. `build:pptx-worker`: Bundles `lib/execution/pptx-worker.cjs` → `dist/pptx-worker.cjs` (CJS, Node target)
2. `build:doc-worker`: Bundles `lib/execution/doc-worker.cjs` → `dist/doc-worker.cjs` (CJS, Node target)
3. `next build`: Standard Next.js build

Turborepo orchestration in [`turbo.json`](https://github.com/relayvault/sim/blob/3a1b1a80/turbo.json):

```json
"build": {
  "dependsOn": ["^build"],
  "inputs": ["$TURBO_DEFAULT$", ".env*"],
  "outputs": [".next/**", "!.next/cache/**", "dist/**"]
}
```

#### Next.js Output Mode

[`apps/sim/next.config.ts:77`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/next.config.ts#L77):

```typescript
output: isTruthy(env.DOCKER_BUILD) ? 'standalone' : undefined,
```

- **Docker builds** → `standalone` output (self-contained `server.js`)
- **Vercel builds** → `undefined` (default serverless output mode — this is what Vercel expects)

#### TypeScript Build Error Handling

[`apps/sim/next.config.ts:75`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/next.config.ts#L75):

```typescript
ignoreBuildErrors: isTruthy(env.DOCKER_BUILD),
```

- Docker builds ignore TypeScript errors
- Vercel builds will **fail on TypeScript errors** (stricter, which is correct)

#### Server External Packages

[`apps/sim/next.config.ts:88-98`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/next.config.ts#L88-L98):

```typescript
serverExternalPackages: [
  'isolated-vm',        // Native C++ addon — requires node-gyp compilation
  'ffmpeg-static',      // Platform-specific binary
  'fluent-ffmpeg',      // Spawns ffmpeg child process
  'ws',                 // Optional native addons (used by Stagehand)
  'pino',               // Worker thread transport
  'pino-pretty',        // Worker thread transport
  'thread-stream',      // Worker thread transport
  'unpdf',              // WASM module
  '@1password/sdk',     // WASM crypto
]
```

These packages are excluded from the serverless bundle and loaded at runtime. On Vercel, they must be available in the function's `node_modules`.

#### Output File Tracing Includes

[`apps/sim/next.config.ts:100-110`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/next.config.ts#L100-L110):

```typescript
outputFileTracingIncludes: {
  '/api/**': [
    './lib/execution/isolated-vm-worker.cjs',
    './dist/pptx-worker.cjs',
    './dist/doc-worker.cjs',
    './node_modules/isolated-vm/**/*',
    './node_modules/ffmpeg-static/**/*',
    './lib/guardrails/venv/**/*',
    './lib/guardrails/validate_pii.py',
  ],
}
```

This explicitly tells Next.js's output file tracing to include these files in the serverless function bundle for all `/api/**` routes. Notable inclusions:
- `isolated-vm` native binaries
- Pre-built worker scripts
- Python virtual environment and PII validation script

#### Vercel-Specific Headers

[`apps/sim/next.config.ts:248-264`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/next.config.ts#L248-L264):

The headers config explicitly references Vercel internal paths:

```typescript
// Exclude Vercel internal resources and static assets from strict COEP
source: '/((?!_next|_vercel|api|favicon.ico|w/.*|workspace/.*|api/tools/drive).*)',
// ...
// For main app routes, Google Drive Picker, and Vercel resources - use permissive policies
source: '/(w/.*|workspace/.*|api/tools/drive|_next/.*|_vercel/.*)',
```

The `_vercel` path exclusions indicate the config was written with Vercel deployment in mind.

#### Content Security Policy

[`apps/sim/lib/core/security/csp.ts`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/security/csp.ts):

- Build-time CSP directives compiled into the Next.js config
- Runtime CSP generation via `generateRuntimeCSP()` for Docker environments
- `isHosted` flag gates Google Analytics/Tag Manager CSP entries (only on `sim.ai` domain)

#### Remote Image Patterns

[`apps/sim/next.config.ts:13-72`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/next.config.ts#L13-L72): Configured for Azure Blob, AWS S3, GitHub, Google, Atlassian, Discord CDN, and custom brand URLs.

---

### 2. Environment Variables

#### Required Variables (6)

| Variable | Type | Description | Source |
|----------|------|-------------|--------|
| `DATABASE_URL` | `z.string().url()` | PostgreSQL connection string (must support pgvector) | [`env.ts:19`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts#L19) |
| `BETTER_AUTH_SECRET` | `z.string().min(32)` | Auth secret — generate with `openssl rand -hex 32` | [`env.ts:21`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts#L21) |
| `BETTER_AUTH_URL` | `z.string().url()` | Vercel deployment URL (e.g., `https://sim.vercel.app`) | [`env.ts:20`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts#L20) |
| `NEXT_PUBLIC_APP_URL` | `z.string().url()` | Same as `BETTER_AUTH_URL` — public-facing base URL | [`env.ts:389`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts#L389) |
| `ENCRYPTION_KEY` | `z.string().min(32)` | Data encryption key — generate with `openssl rand -hex 32` | [`env.ts:30`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts#L30) |
| `INTERNAL_API_SECRET` | `z.string().min(32)` | Internal API authentication — generate with `openssl rand -hex 32` | [`env.ts:32`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts#L32) |

#### Recommended Variables (4)

| Variable | Type | Description | Source |
|----------|------|-------------|--------|
| `API_ENCRYPTION_KEY` | `z.string().optional()` | Separate encryption key for API credentials | [`env.ts:31`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts#L31) |
| `REDIS_URL` | `z.string().url().optional()` | Redis for Socket.IO adapter and caching | [`env.ts:156`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts#L156) |
| `RESEND_API_KEY` | `z.string().optional()` | Email delivery (Resend) | [`env.ts:145`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts#L145) |
| `CRON_SECRET` | `z.string().optional()` | Secret for authenticating cron job requests | [`env.ts:161`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts#L161) |

#### Optional Variables (~200+)

The full env schema in [`apps/sim/lib/core/config/env.ts`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts) defines approximately 200 environment variables across these categories:

**Server-side (selected):**
- AI providers: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`, `GROQ_API_KEY`, `DEEPSEEK_API_KEY`, `XAI_API_KEY`, `CEREBRAS_API_KEY`, etc.
- AWS: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `S3_KB_BUCKET_NAME`, `S3_CHAT_BUCKET_NAME`
- Azure: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_VERSION`, `AZURE_STORAGE_*`
- OAuth providers: `GOOGLE_CLIENT_ID/SECRET`, `GITHUB_CLIENT_ID/SECRET`
- Billing: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, various `STRIPE_PRICE_ID_*`
- Tools/integrations: `SLACK_*`, `DISCORD_*`, `NOTION_*`, `AIRTABLE_*`, `HUBSPOT_*`, `JIRA_*`, `LINEAR_*`, `FIGMA_*`, `SALESFORCE_*`, `TWILIO_*`, etc.
- Infrastructure: `TRIGGER_SECRET_KEY`, `TRIGGER_API_URL`, `E2B_API_KEY`, `FIRECRAWL_API_KEY`

**Client-side (`NEXT_PUBLIC_*`):**
- `NEXT_PUBLIC_SOCKET_URL` — Socket.IO server URL
- `NEXT_PUBLIC_BILLING_ENABLED` — Enable billing features
- `NEXT_PUBLIC_SSO_ENABLED` — Enable SSO login UI
- UI branding: `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_BRAND_LOGO_URL`, `NEXT_PUBLIC_BRAND_FAVICON_URL`, `NEXT_PUBLIC_CUSTOM_CSS_URL`
- Theme colors: `NEXT_PUBLIC_BRAND_PRIMARY_COLOR`, `NEXT_PUBLIC_BRAND_ACCENT_COLOR`, etc.
- Feature flags: `NEXT_PUBLIC_CREDENTIAL_SETS_ENABLED`, `NEXT_PUBLIC_ACCESS_CONTROL_ENABLED`, `NEXT_PUBLIC_WHITELABELING_ENABLED`, `NEXT_PUBLIC_AUDIT_LOGS_ENABLED`, `NEXT_PUBLIC_ORGANIZATIONS_ENABLED`

**Important note on `NEXT_PUBLIC_*` variables**: These are baked into the client bundle at build time. On Vercel, they must be set in the project's environment variable settings *before* building. The `experimental__runtimeEnv` section ([`env.ts:447-484`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/env.ts#L447-L484)) uses `@t3-oss/env-nextjs` to support runtime env injection (primarily for Docker), but on Vercel the standard build-time approach works.

#### Feature Flags

[`apps/sim/lib/core/config/feature-flags.ts`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/core/config/feature-flags.ts):

```typescript
export const isHosted = appHostname === 'sim.ai' || appHostname.endsWith('.sim.ai')
```

The `isHosted` flag (line 32) detects when running on the official sim.ai domain and enables:
- Google Analytics / Tag Manager in CSP
- Billing and plan-gated features
- Hosted-only UI components

For a relayvault deployment, `isHosted` will be `false` unless `NEXT_PUBLIC_APP_URL` is set to a `sim.ai` subdomain.

---

### 3. External Services & Infrastructure

#### PostgreSQL with pgvector (Required)

- Database schema managed by Drizzle ORM ([`packages/db/`](https://github.com/relayvault/sim/blob/3a1b1a80/packages/db/))
- Drizzle config: [`packages/db/drizzle.config.ts`](https://github.com/relayvault/sim/blob/3a1b1a80/packages/db/drizzle.config.ts)
- Migration command: `bun run db:migrate` ([`packages/db/package.json:23`](https://github.com/relayvault/sim/blob/3a1b1a80/packages/db/package.json#L23))
- **pgvector extension required** for vector search / knowledge base features
- Compatible services: Vercel Postgres (with pgvector), Neon, Supabase, any PostgreSQL 12+ with pgvector

#### Database Migrations

From [`docker-compose.prod.yml:68-77`](https://github.com/relayvault/sim/blob/3a1b1a80/docker-compose.prod.yml#L68-L77):

```yaml
migrations:
  image: ghcr.io/simstudioai/migrations:latest
  working_dir: /app/packages/db
  command: ['bun', 'run', 'db:migrate']
```

Migrations run as a separate service in Docker. For Vercel, migrations must be run separately (e.g., via a CI/CD step or Vercel's build command).

#### Socket.IO Realtime Server (Separate Deployment Required)

[`apps/sim/socket/index.ts`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/socket/index.ts):

- **Runs as a separate long-running process** on port 3002
- **Cannot run on Vercel** — Vercel is serverless and doesn't support persistent WebSocket connections
- Requires separate deployment (Railway, Render, Fly.io, etc.)
- Uses Redis adapter for multi-pod scaling ([`socket/index.ts:17-28`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/socket/index.ts#L17-L28)):
  - With `REDIS_URL`: `RedisRoomManager` for multi-pod support
  - Without `REDIS_URL`: `MemoryRoomManager` (single-pod only)
- Health check at `http://localhost:3002/health`
- Requires `DATABASE_URL`, `BETTER_AUTH_SECRET`, `INTERNAL_API_SECRET`, `REDIS_URL`

The main Next.js app connects to the socket server via:
- `SOCKET_SERVER_URL` — server-side connection (e.g., `http://realtime:3002`)
- `NEXT_PUBLIC_SOCKET_URL` — client-side connection (e.g., `wss://realtime.yourdomain.com`)

#### Redis (Recommended)

- Used by Socket.IO for multi-pod room management
- Used for webhook polling locks ([`apps/sim/app/api/webhooks/poll/[provider]/route.ts`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/app/api/webhooks/poll/%5Bprovider%5D/route.ts))
- Optional — app functions without it (single-pod Socket.IO, no polling locks)
- Compatible services: Upstash Redis (serverless, Vercel-optimized), Redis Cloud

#### S3-Compatible Storage (Optional)

Three S3 buckets are configured:
- `S3_BUCKET_NAME` — General file storage
- `S3_KB_BUCKET_NAME` — Knowledge base document storage
- `S3_CHAT_BUCKET_NAME` — Chat file storage

Also supports Azure Blob Storage (`AZURE_STORAGE_*` env vars).

#### Trigger.dev (Optional)

- Background job processing for long-running tasks
- Config at [`apps/sim/trigger.config.ts`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/trigger.config.ts)
- `maxDuration: 5400` (90 minutes) for background tasks
- Env vars: `TRIGGER_SECRET_KEY`, `TRIGGER_API_URL`

---

### 4. Serverless Function Configuration

#### Runtime Declarations

All API routes that need Node.js features explicitly declare:

```typescript
export const runtime = 'nodejs'
```

Found in 20+ route files including:
- `app/api/workflows/[id]/execute/route.ts`
- `app/api/workflows/[id]/deployed/route.ts`
- `app/api/function/execute/route.ts` (uses `isolated-vm`)
- `app/api/memory/route.ts`
- `app/api/mcp/copilot/route.ts`
- `app/api/wand/route.ts`

**No Edge Runtime usage found** — all routes use the Node.js runtime.

#### maxDuration Declarations

Routes declare their maximum execution time. These are Vercel serverless function config directives:

| Route | maxDuration | Notes |
|-------|-------------|-------|
| `api/v1/copilot/chat` | 3600s (1 hour) | Copilot chat |
| `api/copilot/chat/stream` | 3600s (1 hour) | Streaming chat |
| `api/mcp/copilot` | 3600s (1 hour) | MCP copilot |
| `api/mothership/execute` | 3600s (1 hour) | Mothership execution |
| `api/tools/video` | 600s (10 min) | Video generation |
| `api/tools/textract/parse` | 300s (5 min) | PDF processing |
| `api/tools/stt` | 300s (5 min) | Speech-to-text |
| `api/webhooks/cleanup/idempotency` | 300s (5 min) | Cleanup |
| `api/webhooks/poll/[provider]` | 180s (3 min) | Webhook polling |
| `api/notifications/poll` | 120s (2 min) | Notification polling |
| `api/tools/search` | 60s | Search |
| `api/tools/tts/unified` | 60s | Text-to-speech |
| `api/webhooks/trigger/[path]` | 60s | Webhook triggers |
| `api/wand` | 60s | Wand AI |

**Vercel tier implications:**
- Hobby: max 60s
- Pro: max 300s
- Enterprise: max 900s (custom up to 3600s)
- Routes with `maxDuration > 300` require Enterprise tier or will timeout on Pro

---

### 5. Native Dependencies & Vercel Limitations

#### isolated-vm (Critical)

[`apps/sim/lib/execution/isolated-vm.ts`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/execution/isolated-vm.ts):

- Native C++ addon compiled via `node-gyp`
- Used for sandboxed JavaScript code execution in workflows
- The Docker build explicitly compiles it: `cd node_modules/isolated-vm && npx node-gyp rebuild --release` ([`docker/app.Dockerfile:33`](https://github.com/relayvault/sim/blob/3a1b1a80/docker/app.Dockerfile#L33))
- Listed in `serverExternalPackages` and `outputFileTracingIncludes`
- Worker script: `lib/execution/isolated-vm-worker.cjs`
- **On Vercel**: Native addons are supported if they're pre-compiled for the Lambda runtime (Amazon Linux 2). The `isolated-vm` npm package includes prebuilt binaries for common platforms. The `serverExternalPackages` config ensures it's not bundled but loaded from `node_modules`.

#### Python / PII Guardrails

[`apps/sim/lib/guardrails/validate_pii.ts`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/guardrails/validate_pii.ts):

- Spawns Python child process for PII detection using Microsoft Presidio
- Requires Python 3 virtual environment with `presidio-analyzer`, `presidio-anonymizer`
- The venv is included in `outputFileTracingIncludes`: `'./lib/guardrails/venv/**/*'`
- Setup script: [`apps/sim/lib/guardrails/setup.sh`](https://github.com/relayvault/sim/blob/3a1b1a80/apps/sim/lib/guardrails/setup.sh)
- **On Vercel**: Python is available in the Lambda runtime, but the venv must be built during the Vercel build step and included in the function bundle. The `outputFileTracingIncludes` config handles this. Bundle size may be a concern.

#### ffmpeg

- `ffmpeg-static` provides a platform-specific binary
- `fluent-ffmpeg` spawns ffmpeg as a child process
- Used for media processing (video/audio tools)
- **On Vercel**: `ffmpeg-static` includes Lambda-compatible binaries. Listed in `serverExternalPackages`.

#### Bundled Worker Scripts

Two pre-built worker scripts must be available at runtime:
- `dist/pptx-worker.cjs` — PowerPoint generation
- `dist/doc-worker.cjs` — Document generation

Both are built before `next build` and included in `outputFileTracingIncludes`.

---

### 6. Vercel Project Configuration

#### Recommended Vercel Settings

Based on the codebase analysis:

- **Root Directory**: `apps/sim`
- **Framework Preset**: Next.js (auto-detected)
- **Build Command**: `cd ../.. && bun run build --filter=sim` (or Vercel's default monorepo detection with Turborepo)
- **Install Command**: `bun install` (Vercel detects `bun.lock` automatically)
- **Node.js Version**: 20.x (matches engine requirement `>=20.0.0`)

#### No vercel.json Found

The repository does not contain a `vercel.json` configuration file. All Vercel-specific configuration is handled through:
- `next.config.ts` (headers, rewrites, redirects, output mode)
- Route-level exports (`runtime`, `maxDuration`)
- Environment variables

#### Docker vs Vercel Build Path

The codebase has a clean separation between Docker and Vercel build paths:

| Aspect | Docker (`DOCKER_BUILD=true`) | Vercel (default) |
|--------|------------------------------|-------------------|
| Output mode | `standalone` | `undefined` (serverless) |
| TS errors | Ignored | Enforced |
| Telemetry | `VERCEL_TELEMETRY_DISABLED=1` | Vercel default |
| CSP | Runtime-generated | Build-time compiled |
| Env vars | Runtime injection via `getEnv()` | Build-time `NEXT_PUBLIC_*` |

---

### 7. Production Architecture Comparison

#### Docker Compose Production (Current)

From [`docker-compose.prod.yml`](https://github.com/relayvault/sim/blob/3a1b1a80/docker-compose.prod.yml):

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  simstudio  │────▶│   realtime  │     │  migrations  │
│  (Next.js)  │     │ (Socket.IO) │     │  (one-shot)  │
│  port 3000  │     │  port 3002  │     │  db:migrate   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────┬───────┘───────────────────┘
                   ▼
            ┌─────────────┐
            │     db      │
            │ (pgvector)  │
            │  port 5432  │
            └─────────────┘
```

- 8GB memory limit on simstudio
- 1GB memory limit on realtime
- All services share the same network

#### Proposed Vercel Architecture

```
┌──────────────────────┐     ┌─────────────────────┐
│    Vercel (Next.js)  │     │  Separate Service    │
│  Serverless Functions│     │  (Railway/Render)    │
│  + Static Assets     │────▶│  Socket.IO Server    │
│  + API Routes        │     │  port 3002           │
└──────────┬───────────┘     └──────────┬───────────┘
           │                            │
           └────────────┬───────────────┘
                        ▼
              ┌─────────────────┐     ┌─────────────┐
              │  Managed Postgres│     │ Upstash Redis│
              │  (Neon/Supabase) │     │ (optional)   │
              │  with pgvector   │     └─────────────┘
              └─────────────────┘
```

---

## Code References

- `apps/sim/next.config.ts:77` — Output mode toggle (Docker vs Vercel)
- `apps/sim/next.config.ts:88-98` — `serverExternalPackages` list
- `apps/sim/next.config.ts:100-110` — `outputFileTracingIncludes`
- `apps/sim/next.config.ts:248-264` — Vercel-aware COEP/COOP headers
- `apps/sim/package.json:19-21` — Build command chain
- `apps/sim/lib/core/config/env.ts:18-495` — Full environment variable schema
- `apps/sim/lib/core/config/feature-flags.ts:25-32` — `isHosted` detection
- `apps/sim/lib/core/security/csp.ts:33-137` — CSP directives (build-time)
- `apps/sim/lib/core/security/csp.ts:158-211` — CSP directives (runtime)
- `apps/sim/socket/index.ts:1-129` — Socket.IO server (separate process)
- `apps/sim/lib/execution/isolated-vm.ts` — Sandboxed code execution
- `apps/sim/lib/guardrails/validate_pii.ts` — Python PII validation
- `docker/app.Dockerfile:1-142` — Docker multi-stage build
- `docker-compose.prod.yml:1-97` — Production Docker Compose
- `packages/db/drizzle.config.ts` — Database config
- `turbo.json` — Turborepo build orchestration

## Architecture Documentation

### Patterns Found

1. **Build-time feature detection**: `DOCKER_BUILD` env var toggles between standalone and serverless output
2. **Runtime feature detection**: `isHosted` flag detects `sim.ai` domain for hosted-only features
3. **Explicit runtime declarations**: All routes needing Node.js APIs declare `export const runtime = 'nodejs'`
4. **Duration budgets**: Routes declare `maxDuration` matching their expected execution time
5. **External package handling**: Native addons and large binaries are externalized via `serverExternalPackages` and explicitly included via `outputFileTracingIncludes`
6. **Dual CSP strategy**: Build-time CSP for Vercel/static, runtime CSP for Docker with dynamic env vars

### Conventions

- No `vercel.json` — all config lives in `next.config.ts`
- Environment variables follow `NEXT_PUBLIC_` prefix convention for client-side vars
- Database migrations are a separate concern from the app deployment
- The Socket.IO server is architecturally separated and requires independent deployment

## Related Research

- Sub-agent reports:
  - Build & Config Analysis (session `e6571b7a`)
  - Environment Variables (session `caa31264`)
  - External Services & Dependencies (session `57fe6866`)
  - Limitations & Native Dependencies (session `52665492`)

## Open Questions

1. **isolated-vm on Lambda**: Does the `isolated-vm` npm package ship prebuilt binaries compatible with Vercel's Lambda runtime (Amazon Linux 2, x64)? May need testing.
2. **Python venv bundle size**: The PII guardrails venv (Presidio + spaCy models) may exceed Vercel's 250MB uncompressed function size limit. Needs measurement.
3. **maxDuration > 300s routes**: Four routes require 3600s (1 hour) duration. These need Vercel Enterprise tier or must be offloaded to Trigger.dev / a separate service.
4. **Database migrations**: Need a strategy for running `bun run db:migrate` outside the Vercel build step (e.g., GitHub Actions, Vercel's `postbuild` hook, or a separate migration service).
5. **Socket.IO hosting**: Which service will host the realtime server? Railway, Render, and Fly.io are common choices. Needs `SOCKET_SERVER_URL` and `NEXT_PUBLIC_SOCKET_URL` configured to point to it.
