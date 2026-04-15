# Vercel Deployment Environment Variables — relayvault/sim

**Date:** 2026-04-15
**Sources:**
- `apps/sim/.env.example`
- `apps/sim/lib/core/config/env.ts` (t3-oss/env-nextjs with Zod validation)
- `apps/sim/lib/core/config/feature-flags.ts`

---

## Table of Contents

1. [REQUIRED for Vercel](#1-required-for-vercel)
2. [RECOMMENDED](#2-recommended)
3. [OPTIONAL — AI/LLM Provider Keys](#3-optional--aillm-provider-keys)
4. [OPTIONAL — OAuth Integration Credentials](#4-optional--oauth-integration-credentials)
5. [OPTIONAL — Payment & Billing (Stripe)](#5-optional--payment--billing-stripe)
6. [OPTIONAL — Email & Communication](#6-optional--email--communication)
7. [OPTIONAL — Cloud Storage (AWS S3)](#7-optional--cloud-storage-aws-s3)
8. [OPTIONAL — Cloud Storage (Azure Blob)](#8-optional--cloud-storage-azure-blob)
9. [OPTIONAL — Azure AI Configuration](#9-optional--azure-ai-configuration)
10. [OPTIONAL — Copilot / Sim Agent](#10-optional--copilot--sim-agent)
11. [OPTIONAL — Background Jobs (Trigger.dev)](#11-optional--background-jobs-triggerdev)
12. [OPTIONAL — SSO Configuration](#12-optional--sso-configuration)
13. [OPTIONAL — AgentMail / Inbox](#13-optional--agentmail--inbox)
14. [OPTIONAL — E2B Remote Code Execution](#14-optional--e2b-remote-code-execution)
15. [OPTIONAL — Monitoring & Analytics](#15-optional--monitoring--analytics)
16. [OPTIONAL — External Services](#16-optional--external-services)
17. [OPTIONAL — Self-Hosted Feature Overrides](#17-optional--self-hosted-feature-overrides)
18. [OPTIONAL — Rate Limiting & Timeouts (all have defaults)](#18-optional--rate-limiting--timeouts-all-have-defaults)
19. [OPTIONAL — IVM Worker Pool (all have defaults)](#19-optional--ivm-worker-pool-all-have-defaults)
20. [OPTIONAL — Knowledge Base Processing (all have defaults)](#20-optional--knowledge-base-processing-all-have-defaults)
21. [OPTIONAL — Infrastructure / Networking](#21-optional--infrastructure--networking)
22. [OPTIONAL — Development Tools](#22-optional--development-tools)
23. [NEXT_PUBLIC_* Variables (Client Bundle)](#23-next_public_-variables-client-bundle)
24. [experimental__runtimeEnv Section](#24-experimental__runtimeenv-section)
25. [The isHosted Flag](#25-the-ishosted-flag)
26. [Feature Flags Summary](#26-feature-flags-summary)
27. [Shared Variables](#27-shared-variables)
28. [Utility Functions (env.ts)](#28-utility-functions-envts)

---

## 1. REQUIRED for Vercel

These variables are **non-optional** in the Zod schema (no `.optional()`) and the app **will not function** without them.

| Variable | Type | Description |
|---|---|---|
| `DATABASE_URL` | `z.string().url()` | Primary PostgreSQL connection string |
| `BETTER_AUTH_URL` | `z.string().url()` | Base URL for Better Auth service (set to your Vercel deployment URL) |
| `BETTER_AUTH_SECRET` | `z.string().min(32)` | Secret key for Better Auth JWT signing. Generate with `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | `z.string().min(32)` | Key for encrypting sensitive data (environment variables). Generate with `openssl rand -hex 32` |
| `INTERNAL_API_SECRET` | `z.string().min(32)` | Secret for internal API route authentication. Generate with `openssl rand -hex 32` |
| `NEXT_PUBLIC_APP_URL` | `z.string().url()` | **Client variable.** Base URL of the application (e.g., `https://your-app.vercel.app`). Also used to derive the `isHosted` flag |

> **Note:** `skipValidation: true` is set in `createEnv()`, meaning validation is bypassed at runtime. However, these variables are referenced without optional chaining throughout the codebase, so missing them will cause runtime errors.

---

## 2. RECOMMENDED

Not strictly required by the schema, but you almost certainly want them for a production Vercel deployment.

| Variable | Type | Default | Description |
|---|---|---|---|
| `API_ENCRYPTION_KEY` | `z.string().min(32).optional()` | — | Dedicated key for encrypting API keys (separate from ENCRYPTION_KEY). Generate with `openssl rand -hex 32` |
| `REDIS_URL` | `z.string().url().optional()` | — | Redis connection string for caching/sessions. Required for distributed features, rate limiting, IVM distributed scheduling |
| `RESEND_API_KEY` | `z.string().min(1).optional()` | — | Resend API key for transactional emails. If not set, emails are logged to console |
| `CRON_SECRET` | `z.string().optional()` | — | Secret for authenticating Vercel cron job requests |

---

## 3. OPTIONAL — AI/LLM Provider Keys

All optional. Users can also provide their own keys via the UI. Server-side hosted keys enable key load-balancing and default provider access.

| Variable | Type | Description |
|---|---|---|
| `OPENAI_API_KEY` | `z.string().min(1).optional()` | Primary OpenAI API key |
| `OPENAI_API_KEY_1` | `z.string().min(1).optional()` | Additional OpenAI key for load balancing |
| `OPENAI_API_KEY_2` | `z.string().min(1).optional()` | Additional OpenAI key for load balancing |
| `OPENAI_API_KEY_3` | `z.string().min(1).optional()` | Additional OpenAI key for load balancing |
| `ANTHROPIC_API_KEY_1` | `z.string().min(1).optional()` | Primary Anthropic Claude API key |
| `ANTHROPIC_API_KEY_2` | `z.string().min(1).optional()` | Additional Anthropic key for load balancing |
| `ANTHROPIC_API_KEY_3` | `z.string().min(1).optional()` | Additional Anthropic key for load balancing |
| `GEMINI_API_KEY_1` | `z.string().min(1).optional()` | Primary Gemini API key |
| `GEMINI_API_KEY_2` | `z.string().min(1).optional()` | Additional Gemini key for load balancing |
| `GEMINI_API_KEY_3` | `z.string().min(1).optional()` | Additional Gemini key for load balancing |
| `MISTRAL_API_KEY` | `z.string().min(1).optional()` | Mistral AI API key |
| `ELEVENLABS_API_KEY` | `z.string().min(1).optional()` | ElevenLabs API key for text-to-speech in deployed chat |
| `SERPER_API_KEY` | `z.string().min(1).optional()` | Serper API key for online search |
| `EXA_API_KEY` | `z.string().min(1).optional()` | Exa AI API key for enhanced online search |
| `FIREWORKS_API_KEY` | `z.string().optional()` | Fireworks AI API key for model listing |
| `OLLAMA_URL` | `z.string().url().optional()` | Ollama local LLM server URL (unlikely for Vercel) |
| `VLLM_BASE_URL` | `z.string().url().optional()` | vLLM self-hosted base URL (OpenAI-compatible) |
| `VLLM_API_KEY` | `z.string().optional()` | Bearer token for vLLM |
| `BLACKLISTED_PROVIDERS` | `z.string().optional()` | Comma-separated provider IDs to hide (e.g., `"openai,anthropic"`) |
| `BLACKLISTED_MODELS` | `z.string().optional()` | Comma-separated model names/prefixes to hide (e.g., `"gpt-4,claude-*"`) |
| `ALLOWED_MCP_DOMAINS` | `z.string().optional()` | Comma-separated domains for MCP servers. Empty = all allowed |
| `ALLOWED_INTEGRATIONS` | `z.string().optional()` | Comma-separated block types to allow. Empty = all allowed |

---

## 4. OPTIONAL — OAuth Integration Credentials

All optional. Each pair enables a third-party OAuth integration in the UI.

| Variable | Type | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | `z.string().optional()` | Google OAuth client ID (also used for Google login) |
| `GOOGLE_CLIENT_SECRET` | `z.string().optional()` | Google OAuth client secret |
| `GITHUB_CLIENT_ID` | `z.string().optional()` | GitHub OAuth client ID (also used for GitHub login) |
| `GITHUB_CLIENT_SECRET` | `z.string().optional()` | GitHub OAuth client secret |
| `X_CLIENT_ID` / `X_CLIENT_SECRET` | `z.string().optional()` | X (Twitter) OAuth |
| `CONFLUENCE_CLIENT_ID` / `CONFLUENCE_CLIENT_SECRET` | `z.string().optional()` | Atlassian Confluence OAuth |
| `JIRA_CLIENT_ID` / `JIRA_CLIENT_SECRET` | `z.string().optional()` | Atlassian Jira OAuth |
| `ASANA_CLIENT_ID` / `ASANA_CLIENT_SECRET` | `z.string().optional()` | Asana OAuth |
| `AIRTABLE_CLIENT_ID` / `AIRTABLE_CLIENT_SECRET` | `z.string().optional()` | Airtable OAuth |
| `APOLLO_API_KEY` | `z.string().optional()` | Apollo API key (system-wide config) |
| `SUPABASE_CLIENT_ID` / `SUPABASE_CLIENT_SECRET` | `z.string().optional()` | Supabase OAuth |
| `NOTION_CLIENT_ID` / `NOTION_CLIENT_SECRET` | `z.string().optional()` | Notion OAuth |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | `z.string().optional()` | Discord OAuth |
| `DOCUSIGN_CLIENT_ID` / `DOCUSIGN_CLIENT_SECRET` | `z.string().optional()` | DocuSign OAuth |
| `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` | `z.string().optional()` | Microsoft OAuth (Office 365/Teams) |
| `HUBSPOT_CLIENT_ID` / `HUBSPOT_CLIENT_SECRET` | `z.string().optional()` | HubSpot OAuth |
| `SALESFORCE_CLIENT_ID` / `SALESFORCE_CLIENT_SECRET` | `z.string().optional()` | Salesforce OAuth |
| `WEALTHBOX_CLIENT_ID` / `WEALTHBOX_CLIENT_SECRET` | `z.string().optional()` | WealthBox OAuth |
| `PIPEDRIVE_CLIENT_ID` / `PIPEDRIVE_CLIENT_SECRET` | `z.string().optional()` | Pipedrive OAuth |
| `LINEAR_CLIENT_ID` / `LINEAR_CLIENT_SECRET` | `z.string().optional()` | Linear OAuth |
| `BOX_CLIENT_ID` / `BOX_CLIENT_SECRET` | `z.string().optional()` | Box OAuth |
| `DROPBOX_CLIENT_ID` / `DROPBOX_CLIENT_SECRET` | `z.string().optional()` | Dropbox OAuth |
| `SLACK_CLIENT_ID` / `SLACK_CLIENT_SECRET` | `z.string().optional()` | Slack OAuth |
| `REDDIT_CLIENT_ID` / `REDDIT_CLIENT_SECRET` | `z.string().optional()` | Reddit OAuth |
| `WEBFLOW_CLIENT_ID` / `WEBFLOW_CLIENT_SECRET` | `z.string().optional()` | Webflow OAuth |
| `TRELLO_API_KEY` | `z.string().optional()` | Trello API Key |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | `z.string().optional()` | LinkedIn OAuth |
| `SHOPIFY_CLIENT_ID` / `SHOPIFY_CLIENT_SECRET` | `z.string().optional()` | Shopify OAuth |
| `ZOOM_CLIENT_ID` / `ZOOM_CLIENT_SECRET` | `z.string().optional()` | Zoom OAuth |
| `WORDPRESS_CLIENT_ID` / `WORDPRESS_CLIENT_SECRET` | `z.string().optional()` | WordPress.com OAuth |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | `z.string().optional()` | Spotify OAuth |
| `CALCOM_CLIENT_ID` | `z.string().optional()` | Cal.com OAuth client ID |
| `ATTIO_CLIENT_ID` / `ATTIO_CLIENT_SECRET` | `z.string().optional()` | Attio OAuth |
| `GITHUB_TOKEN` | `z.string().optional()` | GitHub personal access token for API access (separate from OAuth) |

---

## 5. OPTIONAL — Payment & Billing (Stripe)

Enable only if billing is needed. All optional.

| Variable | Type | Default | Description |
|---|---|---|---|
| `BILLING_ENABLED` | `z.boolean().optional()` | — | Master toggle for billing enforcement and usage tracking |
| `STRIPE_SECRET_KEY` | `z.string().min(1).optional()` | — | Stripe secret key for payment processing |
| `STRIPE_WEBHOOK_SECRET` | `z.string().min(1).optional()` | — | General Stripe webhook secret |
| `STRIPE_FREE_PRICE_ID` | `z.string().min(1).optional()` | — | Stripe price ID for free tier |
| `FREE_TIER_COST_LIMIT` | `z.number().optional()` | — | Cost limit for free tier users |
| `FREE_STORAGE_LIMIT_GB` | `z.number().optional()` | `5` | Storage limit in GB for free tier |
| `STRIPE_PRO_PRICE_ID` | `z.string().min(1).optional()` | — | Stripe price ID for pro tier |
| `PRO_TIER_COST_LIMIT` | `z.number().optional()` | — | Cost limit for pro tier users |
| `PRO_STORAGE_LIMIT_GB` | `z.number().optional()` | `50` | Storage limit in GB for pro tier |
| `STRIPE_TEAM_PRICE_ID` | `z.string().min(1).optional()` | — | Stripe price ID for team tier |
| `TEAM_TIER_COST_LIMIT` | `z.number().optional()` | — | Cost limit for team tier users |
| `TEAM_STORAGE_LIMIT_GB` | `z.number().optional()` | `500` | Storage limit in GB for team tier (pooled) |
| `STRIPE_ENTERPRISE_PRICE_ID` | `z.string().min(1).optional()` | — | Stripe price ID for enterprise tier |
| `ENTERPRISE_TIER_COST_LIMIT` | `z.number().optional()` | — | Cost limit for enterprise tier |
| `ENTERPRISE_STORAGE_LIMIT_GB` | `z.number().optional()` | `500` | Default storage limit for enterprise (overridable per org) |
| `STRIPE_PRICE_TIER_25_MO` | `z.string().min(1).optional()` | — | Pro: $25/mo (6,000 credits) |
| `STRIPE_PRICE_TIER_100_MO` | `z.string().min(1).optional()` | — | Max: $100/mo (25,000 credits) |
| `STRIPE_PRICE_TIER_25_YR` | `z.string().min(1).optional()` | — | Pro: $255/yr (15% off $300) |
| `STRIPE_PRICE_TIER_100_YR` | `z.string().min(1).optional()` | — | Max: $1,020/yr (15% off $1,200) |
| `STRIPE_PRICE_TEAM_25_MO` | `z.string().min(1).optional()` | — | Team Pro: $25/seat/mo |
| `STRIPE_PRICE_TEAM_25_YR` | `z.string().min(1).optional()` | — | Team Pro: $255/seat/yr |
| `STRIPE_PRICE_TEAM_100_MO` | `z.string().min(1).optional()` | — | Team Max: $100/seat/mo |
| `STRIPE_PRICE_TEAM_100_YR` | `z.string().min(1).optional()` | — | Team Max: $1,020/seat/yr |
| `OVERAGE_THRESHOLD_DOLLARS` | `z.number().optional()` | `50` | Dollar threshold for incremental overage billing |
| `COST_MULTIPLIER` | `z.number().optional()` | `1` (in prod via `getCostMultiplier()`) | Multiplier for cost calculations |

---

## 6. OPTIONAL — Email & Communication

| Variable | Type | Description |
|---|---|---|
| `EMAIL_VERIFICATION_ENABLED` | `z.boolean().optional()` | Enable email verification for registration/login |
| `FROM_EMAIL_ADDRESS` | `z.string().min(1).optional()` | Complete from address (e.g., `"Sim <noreply@domain.com>"`) |
| `PERSONAL_EMAIL_FROM` | `z.string().min(1).optional()` | From address for personalized emails |
| `EMAIL_DOMAIN` | `z.string().min(1).optional()` | Fallback domain when FROM_EMAIL_ADDRESS not set |
| `AZURE_ACS_CONNECTION_STRING` | `z.string().optional()` | Azure Communication Services connection string |
| `TWILIO_ACCOUNT_SID` | `z.string().min(1).optional()` | Twilio Account SID for SMS |
| `TWILIO_AUTH_TOKEN` | `z.string().min(1).optional()` | Twilio Auth Token |
| `TWILIO_PHONE_NUMBER` | `z.string().min(1).optional()` | Twilio phone number for sending SMS |

---

## 7. OPTIONAL — Cloud Storage (AWS S3)

All optional. Enable S3-based file storage.

| Variable | Type | Description |
|---|---|---|
| `AWS_REGION` | `z.string().optional()` | AWS region for S3 buckets |
| `AWS_ACCESS_KEY_ID` | `z.string().optional()` | AWS access key ID |
| `AWS_SECRET_ACCESS_KEY` | `z.string().optional()` | AWS secret access key |
| `S3_BUCKET_NAME` | `z.string().optional()` | General file storage |
| `S3_LOGS_BUCKET_NAME` | `z.string().optional()` | Log storage |
| `S3_KB_BUCKET_NAME` | `z.string().optional()` | Knowledge base files |
| `S3_EXECUTION_FILES_BUCKET_NAME` | `z.string().optional()` | Workflow execution files |
| `S3_CHAT_BUCKET_NAME` | `z.string().optional()` | Chat logos |
| `S3_COPILOT_BUCKET_NAME` | `z.string().optional()` | Copilot files |
| `S3_PROFILE_PICTURES_BUCKET_NAME` | `z.string().optional()` | Profile pictures |
| `S3_OG_IMAGES_BUCKET_NAME` | `z.string().optional()` | OpenGraph images |
| `S3_WORKSPACE_LOGOS_BUCKET_NAME` | `z.string().optional()` | Workspace logos |

---

## 8. OPTIONAL — Cloud Storage (Azure Blob)

Alternative to S3. All optional.

| Variable | Type | Description |
|---|---|---|
| `AZURE_ACCOUNT_NAME` | `z.string().optional()` | Azure storage account name |
| `AZURE_ACCOUNT_KEY` | `z.string().optional()` | Azure storage account key |
| `AZURE_CONNECTION_STRING` | `z.string().optional()` | Azure storage connection string |
| `AZURE_STORAGE_CONTAINER_NAME` | `z.string().optional()` | General files |
| `AZURE_STORAGE_KB_CONTAINER_NAME` | `z.string().optional()` | Knowledge base files |
| `AZURE_STORAGE_EXECUTION_FILES_CONTAINER_NAME` | `z.string().optional()` | Workflow execution files |
| `AZURE_STORAGE_CHAT_CONTAINER_NAME` | `z.string().optional()` | Chat logos |
| `AZURE_STORAGE_COPILOT_CONTAINER_NAME` | `z.string().optional()` | Copilot files |
| `AZURE_STORAGE_PROFILE_PICTURES_CONTAINER_NAME` | `z.string().optional()` | Profile pictures |
| `AZURE_STORAGE_OG_IMAGES_CONTAINER_NAME` | `z.string().optional()` | OpenGraph images |
| `AZURE_STORAGE_WORKSPACE_LOGOS_CONTAINER_NAME` | `z.string().optional()` | Workspace logos |

---

## 9. OPTIONAL — Azure AI Configuration

| Variable | Type | Description |
|---|---|---|
| `AZURE_OPENAI_ENDPOINT` | `z.string().url().optional()` | Shared Azure OpenAI service endpoint |
| `AZURE_OPENAI_API_KEY` | `z.string().min(1).optional()` | Shared Azure OpenAI API key |
| `AZURE_OPENAI_API_VERSION` | `z.string().optional()` | Shared Azure OpenAI API version |
| `AZURE_ANTHROPIC_ENDPOINT` | `z.string().url().optional()` | Azure Anthropic (AI Foundry) endpoint |
| `AZURE_ANTHROPIC_API_KEY` | `z.string().min(1).optional()` | Azure Anthropic API key |
| `AZURE_ANTHROPIC_API_VERSION` | `z.string().min(1).optional()` | Azure Anthropic API version (e.g., `2023-06-01`) |
| `KB_OPENAI_MODEL_NAME` | `z.string().optional()` | Knowledge base OpenAI model name (works with regular or Azure OpenAI) |
| `WAND_OPENAI_MODEL_NAME` | `z.string().optional()` | Wand generation OpenAI model name |
| `OCR_AZURE_ENDPOINT` | `z.string().url().optional()` | Azure Mistral OCR service endpoint |
| `OCR_AZURE_MODEL_NAME` | `z.string().optional()` | Azure Mistral OCR model name |
| `OCR_AZURE_API_KEY` | `z.string().min(1).optional()` | Azure Mistral OCR API key |
| `VERTEX_PROJECT` | `z.string().optional()` | Google Cloud project ID for Vertex AI |
| `VERTEX_LOCATION` | `z.string().optional()` | Google Cloud region for Vertex AI (defaults to us-central1) |

---

## 10. OPTIONAL — Copilot / Sim Agent

| Variable | Type | Description |
|---|---|---|
| `COPILOT_API_KEY` | `z.string().min(1).optional()` | Secret for internal Sim Agent API authentication |
| `SIM_AGENT_API_URL` | `z.string().url().optional()` | URL for internal Sim Agent API |
| `AGENT_INDEXER_URL` | `z.string().url().optional()` | URL for agent training data indexer |
| `AGENT_INDEXER_API_KEY` | `z.string().min(1).optional()` | API key for agent indexer authentication |
| `COPILOT_STREAM_TTL_SECONDS` | `z.number().optional()` | Redis TTL for copilot SSE buffer |
| `COPILOT_STREAM_EVENT_LIMIT` | `z.number().optional()` | Max events retained per stream |
| `MOTHERSHIP_API_ADMIN_KEY` | `z.string().min(1).optional()` | Admin API key for mothership/copilot admin endpoints |
| `MOTHERSHIP_DEV_URL` | `z.string().url().optional()` | Mothership dev environment URL |
| `MOTHERSHIP_STAGING_URL` | `z.string().url().optional()` | Mothership staging environment URL |
| `MOTHERSHIP_PROD_URL` | `z.string().url().optional()` | Mothership production environment URL |

---

## 11. OPTIONAL — Background Jobs (Trigger.dev)

| Variable | Type | Default | Description |
|---|---|---|---|
| `TRIGGER_DEV_ENABLED` | `z.boolean().optional()` | — | Toggle to enable/disable Trigger.dev for async jobs |
| `TRIGGER_PROJECT_ID` | `z.string().optional()` | — | Trigger.dev project ID |
| `TRIGGER_SECRET_KEY` | `z.string().min(1).optional()` | — | Trigger.dev secret key for background jobs |
| `JOB_RETENTION_DAYS` | `z.string().optional()` | `'1'` | Days to retain job logs/data |

---

## 12. OPTIONAL — SSO Configuration

For script-based SSO registration. All optional unless SSO is enabled.

### Core SSO

| Variable | Type | Description |
|---|---|---|
| `SSO_ENABLED` | `z.boolean().optional()` | Enable SSO functionality |
| `SSO_PROVIDER_TYPE` | `z.enum(['oidc', 'saml']).optional()` | SSO provider type (required if SSO enabled) |
| `SSO_PROVIDER_ID` | `z.string().optional()` | SSO provider ID (required if SSO enabled) |
| `SSO_ISSUER` | `z.string().optional()` | SSO issuer URL (required if SSO enabled) |
| `SSO_DOMAIN` | `z.string().optional()` | SSO email domain (required if SSO enabled) |
| `SSO_USER_EMAIL` | `z.string().optional()` | User email for SSO registration (required if SSO enabled) |
| `SSO_ORGANIZATION_ID` | `z.string().optional()` | Organization ID for SSO registration |

### SSO Claim Mappings (optional — sensible defaults provided)

| Variable | Type | Description |
|---|---|---|
| `SSO_MAPPING_ID` | `z.string().optional()` | Custom ID claim (default: `sub` for OIDC, `nameidentifier` for SAML) |
| `SSO_MAPPING_EMAIL` | `z.string().optional()` | Custom email claim (default: `email` for OIDC, `emailaddress` for SAML) |
| `SSO_MAPPING_NAME` | `z.string().optional()` | Custom name claim (default: `name` for both) |
| `SSO_MAPPING_IMAGE` | `z.string().optional()` | Custom image claim (default: `picture` for OIDC) |

### SSO OIDC Configuration

| Variable | Type | Description |
|---|---|---|
| `SSO_OIDC_CLIENT_ID` | `z.string().optional()` | OIDC client ID (required for OIDC) |
| `SSO_OIDC_CLIENT_SECRET` | `z.string().optional()` | OIDC client secret (required for OIDC) |
| `SSO_OIDC_SCOPES` | `z.string().optional()` | OIDC scopes (default: `openid,profile,email`) |
| `SSO_OIDC_PKCE` | `z.string().optional()` | Enable PKCE (default: `true`) |
| `SSO_OIDC_AUTHORIZATION_ENDPOINT` | `z.string().optional()` | Override authorization endpoint |
| `SSO_OIDC_TOKEN_ENDPOINT` | `z.string().optional()` | Override token endpoint |
| `SSO_OIDC_USERINFO_ENDPOINT` | `z.string().optional()` | Override userinfo endpoint |
| `SSO_OIDC_JWKS_ENDPOINT` | `z.string().optional()` | Override JWKS endpoint |
| `SSO_OIDC_DISCOVERY_ENDPOINT` | `z.string().optional()` | Override discovery endpoint |

### SSO SAML Configuration

| Variable | Type | Description |
|---|---|---|
| `SSO_SAML_ENTRY_POINT` | `z.string().optional()` | SAML IdP SSO URL (required for SAML) |
| `SSO_SAML_CERT` | `z.string().optional()` | SAML IdP certificate (required for SAML) |
| `SSO_SAML_CALLBACK_URL` | `z.string().optional()` | SAML callback URL (default: `{issuer}/callback`) |
| `SSO_SAML_SP_METADATA` | `z.string().optional()` | SP metadata XML (auto-generated if not provided) |
| `SSO_SAML_IDP_METADATA` | `z.string().optional()` | IdP metadata XML |
| `SSO_SAML_AUDIENCE` | `z.string().optional()` | Audience restriction (default: issuer URL) |
| `SSO_SAML_WANT_ASSERTIONS_SIGNED` | `z.string().optional()` | Require signed assertions (default: `false`) |
| `SSO_SAML_SIGNATURE_ALGORITHM` | `z.string().optional()` | Signature algorithm |
| `SSO_SAML_DIGEST_ALGORITHM` | `z.string().optional()` | Digest algorithm |
| `SSO_SAML_IDENTIFIER_FORMAT` | `z.string().optional()` | Identifier format |

---

## 13. OPTIONAL — AgentMail / Inbox

| Variable | Type | Description |
|---|---|---|
| `AGENTMAIL_API_KEY` | `z.string().min(1).optional()` | AgentMail API key for mothership email inbox |
| `AGENTMAIL_DOMAIN` | `z.string().optional()` | Custom domain for AgentMail inboxes (default: `agentmail.to`) |
| `INBOX_ENABLED` | `z.boolean().optional()` | Enable inbox (Sim Mailer) on self-hosted |

---

## 14. OPTIONAL — E2B Remote Code Execution

| Variable | Type | Description |
|---|---|---|
| `E2B_ENABLED` | `z.string().optional()` | Enable E2B remote code execution |
| `E2B_API_KEY` | `z.string().optional()` | E2B API key for sandbox creation |
| `MOTHERSHIP_E2B_TEMPLATE_ID` | `z.string().optional()` | Custom E2B template with pre-installed CLI tools |

---

## 15. OPTIONAL — Monitoring & Analytics

| Variable | Type | Description |
|---|---|---|
| `TELEMETRY_ENDPOINT` | `z.string().url().optional()` | Custom telemetry/analytics endpoint |
| `LOG_LEVEL` | `z.enum(['DEBUG','INFO','WARN','ERROR']).optional()` | Min log level (defaults to ERROR in prod, DEBUG in dev) |
| `DRIZZLE_ODS_API_KEY` | `z.string().min(1).optional()` | OneDollarStats API key for analytics tracking |
| `PROFOUND_API_KEY` | `z.string().min(1).optional()` | Profound analytics API key |
| `PROFOUND_ENDPOINT` | `z.string().url().optional()` | Profound analytics endpoint |

---

## 16. OPTIONAL — External Services

| Variable | Type | Description |
|---|---|---|
| `BROWSERBASE_API_KEY` | `z.string().min(1).optional()` | Browserbase API key for browser automation |
| `BROWSERBASE_PROJECT_ID` | `z.string().min(1).optional()` | Browserbase project ID |
| `ADMIN_API_KEY` | `z.string().min(32).optional()` | Admin API key for self-hosted GitOps. Generate with `openssl rand -hex 32` |

---

## 17. OPTIONAL — Self-Hosted Feature Overrides

These bypass plan/hosted requirements for self-hosted deployments. All `z.boolean().optional()`.

| Variable | Description |
|---|---|
| `DISABLE_AUTH` | Bypass authentication entirely (blocked when `isHosted` is true) |
| `DISABLE_REGISTRATION` | Disable new user registration |
| `EMAIL_PASSWORD_SIGNUP_ENABLED` | Enable email/password auth (default: `true`) |
| `SIGNUP_EMAIL_VALIDATION_ENABLED` | Enable disposable email blocking (55K+ domains) |
| `ALLOWED_LOGIN_EMAILS` | Comma-separated allowed email addresses (`z.string().optional()`) |
| `ALLOWED_LOGIN_DOMAINS` | Comma-separated allowed email domains (`z.string().optional()`) |
| `BLOCKED_SIGNUP_DOMAINS` | Comma-separated blocked signup domains (`z.string().optional()`) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile secret key for captcha (`z.string().min(1).optional()`) |
| `CREDENTIAL_SETS_ENABLED` | Enable credential sets / email polling |
| `ACCESS_CONTROL_ENABLED` | Enable access control / permission groups |
| `WHITELABELING_ENABLED` | Enable whitelabeling |
| `AUDIT_LOGS_ENABLED` | Enable audit logs |
| `ORGANIZATIONS_ENABLED` | Enable organizations |
| `DISABLE_INVITATIONS` | Disable workspace invitations globally |
| `DISABLE_PUBLIC_API` | Disable public API access globally |
| `DISABLE_GOOGLE_AUTH` | Hide Google OAuth login even when credentials configured |
| `DISABLE_GITHUB_AUTH` | Hide GitHub OAuth login even when credentials configured |

---

## 18. OPTIONAL — Rate Limiting & Timeouts (all have defaults)

All `z.string().optional()` with defaults. Safe to omit — defaults are production-ready.

| Variable | Default | Description |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `'60000'` | Rate limit window (ms) |
| `MANUAL_EXECUTION_LIMIT` | `'999999'` | Manual execution bypass (effectively unlimited) |
| `RATE_LIMIT_FREE_SYNC` | `'50'` | Free tier sync API executions/min |
| `RATE_LIMIT_FREE_ASYNC` | `'200'` | Free tier async API executions/min |
| `RATE_LIMIT_PRO_SYNC` | `'150'` | Pro tier sync API executions/min |
| `RATE_LIMIT_PRO_ASYNC` | `'1000'` | Pro tier async API executions/min |
| `RATE_LIMIT_TEAM_SYNC` | `'300'` | Team tier sync API executions/min |
| `RATE_LIMIT_TEAM_ASYNC` | `'2500'` | Team tier async API executions/min |
| `RATE_LIMIT_ENTERPRISE_SYNC` | `'600'` | Enterprise tier sync API executions/min |
| `RATE_LIMIT_ENTERPRISE_ASYNC` | `'5000'` | Enterprise tier async API executions/min |
| `EXECUTION_TIMEOUT_FREE` | `'300'` | Free tier sync timeout (seconds, 5 min) |
| `EXECUTION_TIMEOUT_PRO` | `'3000'` | Pro tier sync timeout (seconds, 50 min) |
| `EXECUTION_TIMEOUT_TEAM` | `'3000'` | Team tier sync timeout (seconds, 50 min) |
| `EXECUTION_TIMEOUT_ENTERPRISE` | `'3000'` | Enterprise tier sync timeout (seconds, 50 min) |
| `EXECUTION_TIMEOUT_ASYNC_FREE` | `'5400'` | Free tier async timeout (seconds, 90 min) |
| `EXECUTION_TIMEOUT_ASYNC_PRO` | `'5400'` | Pro tier async timeout (seconds, 90 min) |
| `EXECUTION_TIMEOUT_ASYNC_TEAM` | `'5400'` | Team tier async timeout (seconds, 90 min) |
| `EXECUTION_TIMEOUT_ASYNC_ENTERPRISE` | `'5400'` | Enterprise tier async timeout (seconds, 90 min) |
| `ADMISSION_GATE_MAX_INFLIGHT` | `'500'` | Max concurrent in-flight execution requests per pod |

---

## 19. OPTIONAL — IVM Worker Pool (all have defaults)

Isolated-VM worker pool configuration. All `z.string().optional()` with defaults.

| Variable | Default | Description |
|---|---|---|
| `IVM_POOL_SIZE` | `'4'` | Max worker processes in pool |
| `IVM_MAX_CONCURRENT` | `'10000'` | Max concurrent executions globally |
| `IVM_MAX_PER_WORKER` | `'2500'` | Max concurrent executions per worker |
| `IVM_WORKER_IDLE_TIMEOUT_MS` | `'60000'` | Worker idle cleanup timeout (ms) |
| `IVM_MAX_QUEUE_SIZE` | `'10000'` | Max pending queued executions |
| `IVM_MAX_FETCH_RESPONSE_BYTES` | `'8388608'` | Max bytes from sandbox fetch responses |
| `IVM_MAX_FETCH_RESPONSE_CHARS` | `'4000000'` | Max chars returned to sandbox from fetch |
| `IVM_MAX_FETCH_OPTIONS_JSON_CHARS` | `'262144'` | Max JSON payload size for sandbox fetch |
| `IVM_MAX_FETCH_URL_LENGTH` | `'8192'` | Max URL length in sandbox fetch |
| `IVM_MAX_STDOUT_CHARS` | `'200000'` | Max captured stdout per execution |
| `IVM_MAX_ACTIVE_PER_OWNER` | `'200'` | Max active executions per owner (per process) |
| `IVM_MAX_QUEUED_PER_OWNER` | `'2000'` | Max queued executions per owner (per process) |
| `IVM_MAX_OWNER_WEIGHT` | `'5'` | Max weight for weighted owner scheduling |
| `IVM_DISTRIBUTED_MAX_INFLIGHT_PER_OWNER` | `'2200'` | Max owner in-flight leases across replicas |
| `IVM_DISTRIBUTED_LEASE_MIN_TTL_MS` | `'120000'` | Min TTL for distributed leases (ms) |
| `IVM_QUEUE_TIMEOUT_MS` | `'300000'` | Max queue wait before rejection (ms) |
| `IVM_MAX_EXECUTIONS_PER_WORKER` | `'500'` | Max lifetime executions before worker recycle |

---

## 20. OPTIONAL — Knowledge Base Processing (all have defaults)

All `z.number().optional()` with defaults.

| Variable | Default | Description |
|---|---|---|
| `KB_CONFIG_MAX_DURATION` | `600` | Max processing duration (seconds) |
| `KB_CONFIG_MAX_ATTEMPTS` | `3` | Max retry attempts |
| `KB_CONFIG_RETRY_FACTOR` | `2` | Retry backoff factor |
| `KB_CONFIG_MIN_TIMEOUT` | `1000` | Min timeout (ms) |
| `KB_CONFIG_MAX_TIMEOUT` | `10000` | Max timeout (ms) |
| `KB_CONFIG_CONCURRENCY_LIMIT` | `50` | Concurrent embedding API calls |
| `KB_CONFIG_BATCH_SIZE` | `2000` | Chunks per embedding batch |
| `KB_CONFIG_DELAY_BETWEEN_BATCHES` | `0` | Delay between batches (ms) |
| `KB_CONFIG_DELAY_BETWEEN_DOCUMENTS` | `50` | Delay between documents (ms) |
| `KB_CONFIG_CHUNK_CONCURRENCY` | `10` | Concurrent PDF chunk OCR processing |

---

## 21. OPTIONAL — Infrastructure / Networking

| Variable | Type | Default | Description |
|---|---|---|---|
| `NEXT_RUNTIME` | `z.string().optional()` | — | Next.js runtime environment |
| `DOCKER_BUILD` | `z.boolean().optional()` | — | Flag indicating Docker build environment |
| `PORT` | `z.number().optional()` | — | Main application port |
| `SOCKET_SERVER_URL` | `z.string().url().optional()` | — | WebSocket server URL for real-time features |
| `SOCKET_PORT` | `z.number().optional()` | — | Port for WebSocket server |
| `INTERNAL_API_BASE_URL` | `z.string().optional()` | Falls back to `NEXT_PUBLIC_APP_URL` | Internal URL for server-side `/api` self-calls (e.g., `http://sim-app.namespace.svc.cluster.local:3000`) |
| `ALLOWED_ORIGINS` | `z.string().optional()` | — | CORS allowed origins |
| `FREE_PLAN_LOG_RETENTION_DAYS` | `z.string().optional()` | — | Log retention days for free plan users |

---

## 22. OPTIONAL — Development Tools

| Variable | Type | Description |
|---|---|---|
| `REACT_GRAB_ENABLED` | `z.boolean().optional()` | Enable React Grab for UI debugging in Cursor/AI agents (dev only) |
| `REACT_SCAN_ENABLED` | `z.boolean().optional()` | Enable React Scan for perf debugging (dev only) |

---

## 23. NEXT_PUBLIC_* Variables (Client Bundle)

These are baked into the Next.js client bundle at **build time** on Vercel. They must be set as Vercel environment variables before the build runs.

| Variable | Type | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | `z.string().url()` | **REQUIRED** | Base URL of the application |
| `NEXT_PUBLIC_SOCKET_URL` | `z.string().url().optional()` | — | WebSocket server URL for real-time features |
| `NEXT_PUBLIC_BILLING_ENABLED` | `z.boolean().optional()` | — | Enable billing UI |
| `NEXT_PUBLIC_POSTHOG_ENABLED` | `z.boolean().optional()` | — | Enable PostHog analytics |
| `NEXT_PUBLIC_POSTHOG_KEY` | `z.string().optional()` | — | PostHog project API key |
| `NEXT_PUBLIC_BRAND_NAME` | `z.string().optional()` | `"Sim"` | Custom brand name |
| `NEXT_PUBLIC_BRAND_LOGO_URL` | `z.string().url().optional()` | — | Custom logo URL |
| `NEXT_PUBLIC_BRAND_FAVICON_URL` | `z.string().url().optional()` | — | Custom favicon URL |
| `NEXT_PUBLIC_CUSTOM_CSS_URL` | `z.string().url().optional()` | — | Custom CSS stylesheet URL |
| `NEXT_PUBLIC_SUPPORT_EMAIL` | `z.string().email().optional()` | — | Custom support email |
| `NEXT_PUBLIC_E2B_ENABLED` | `z.string().optional()` | — | Enable E2B in UI |
| `NEXT_PUBLIC_BEDROCK_DEFAULT_CREDENTIALS` | `z.string().optional()` | — | Hide Bedrock credential fields (AWS default credential chain) |
| `NEXT_PUBLIC_AZURE_CONFIGURED` | `z.string().optional()` | — | Hide Azure credential fields when pre-configured server-side |
| `NEXT_PUBLIC_COPILOT_TRAINING_ENABLED` | `z.string().optional()` | — | Enable copilot training UI |
| `NEXT_PUBLIC_ENABLE_PLAYGROUND` | `z.string().optional()` | — | Enable component playground at `/playground` |
| `NEXT_PUBLIC_DOCUMENTATION_URL` | `z.string().url().optional()` | — | Custom documentation URL |
| `NEXT_PUBLIC_TERMS_URL` | `z.string().url().optional()` | — | Custom terms of service URL |
| `NEXT_PUBLIC_PRIVACY_URL` | `z.string().url().optional()` | — | Custom privacy policy URL |
| `NEXT_PUBLIC_BRAND_PRIMARY_COLOR` | `z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()` | — | Primary brand color (hex) |
| `NEXT_PUBLIC_BRAND_PRIMARY_HOVER_COLOR` | `z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()` | — | Primary brand hover color (hex) |
| `NEXT_PUBLIC_BRAND_ACCENT_COLOR` | `z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()` | — | Accent brand color (hex) |
| `NEXT_PUBLIC_BRAND_ACCENT_HOVER_COLOR` | `z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()` | — | Accent brand hover color (hex) |
| `NEXT_PUBLIC_BRAND_BACKGROUND_COLOR` | `z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()` | — | Brand background color (hex) |
| `NEXT_PUBLIC_SSO_ENABLED` | `z.boolean().optional()` | — | Enable SSO login UI components |
| `NEXT_PUBLIC_CREDENTIAL_SETS_ENABLED` | `z.boolean().optional()` | — | Enable credential sets UI |
| `NEXT_PUBLIC_ACCESS_CONTROL_ENABLED` | `z.boolean().optional()` | — | Enable access control UI |
| `NEXT_PUBLIC_WHITELABELING_ENABLED` | `z.boolean().optional()` | — | Enable whitelabeling UI |
| `NEXT_PUBLIC_AUDIT_LOGS_ENABLED` | `z.boolean().optional()` | — | Enable audit logs UI |
| `NEXT_PUBLIC_ORGANIZATIONS_ENABLED` | `z.boolean().optional()` | — | Enable organizations UI |
| `NEXT_PUBLIC_DISABLE_INVITATIONS` | `z.boolean().optional()` | — | Disable invitations UI |
| `NEXT_PUBLIC_DISABLE_PUBLIC_API` | `z.boolean().optional()` | — | Disable public API toggle UI |
| `NEXT_PUBLIC_INBOX_ENABLED` | `z.boolean().optional()` | — | Enable inbox (Sim Mailer) UI |
| `NEXT_PUBLIC_EMAIL_PASSWORD_SIGNUP_ENABLED` | `z.boolean().optional()` | `true` | Control email/password login form visibility |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `z.string().min(1).optional()` | — | Cloudflare Turnstile site key for captcha widget |

---

## 24. experimental__runtimeEnv Section

The `experimental__runtimeEnv` section in `createEnv()` maps `NEXT_PUBLIC_*` variables (and the shared `NODE_ENV`/`NEXT_TELEMETRY_DISABLED`) for use with the `next-runtime-env` package. This enables **Docker runtime variable injection** — these vars can be overridden at container startup without rebuilding the image.

On Vercel, this is less relevant because `NEXT_PUBLIC_*` vars are baked in at build time. However, the `getEnv()` helper (`runtimeEnv(variable) ?? process.env[variable]`) means the code reads from `next-runtime-env` first and falls back to `process.env`, so both patterns work.

**All variables listed in `experimental__runtimeEnv`:**

```
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_BILLING_ENABLED
NEXT_PUBLIC_SOCKET_URL
NEXT_PUBLIC_BRAND_NAME
NEXT_PUBLIC_BRAND_LOGO_URL
NEXT_PUBLIC_BRAND_FAVICON_URL
NEXT_PUBLIC_CUSTOM_CSS_URL
NEXT_PUBLIC_SUPPORT_EMAIL
NEXT_PUBLIC_DOCUMENTATION_URL
NEXT_PUBLIC_TERMS_URL
NEXT_PUBLIC_PRIVACY_URL
NEXT_PUBLIC_BRAND_PRIMARY_COLOR
NEXT_PUBLIC_BRAND_PRIMARY_HOVER_COLOR
NEXT_PUBLIC_BRAND_ACCENT_COLOR
NEXT_PUBLIC_BRAND_ACCENT_HOVER_COLOR
NEXT_PUBLIC_BRAND_BACKGROUND_COLOR
NEXT_PUBLIC_SSO_ENABLED
NEXT_PUBLIC_CREDENTIAL_SETS_ENABLED
NEXT_PUBLIC_ACCESS_CONTROL_ENABLED
NEXT_PUBLIC_WHITELABELING_ENABLED
NEXT_PUBLIC_AUDIT_LOGS_ENABLED
NEXT_PUBLIC_ORGANIZATIONS_ENABLED
NEXT_PUBLIC_DISABLE_INVITATIONS
NEXT_PUBLIC_DISABLE_PUBLIC_API
NEXT_PUBLIC_INBOX_ENABLED
NEXT_PUBLIC_EMAIL_PASSWORD_SIGNUP_ENABLED
NEXT_PUBLIC_TURNSTILE_SITE_KEY
NEXT_PUBLIC_E2B_ENABLED
NEXT_PUBLIC_BEDROCK_DEFAULT_CREDENTIALS
NEXT_PUBLIC_AZURE_CONFIGURED
NEXT_PUBLIC_COPILOT_TRAINING_ENABLED
NEXT_PUBLIC_ENABLE_PLAYGROUND
NEXT_PUBLIC_POSTHOG_ENABLED
NEXT_PUBLIC_POSTHOG_KEY
NODE_ENV
NEXT_TELEMETRY_DISABLED
```

---

## 25. The isHosted Flag

**Source:** `apps/sim/lib/core/config/feature-flags.ts`

```typescript
const appUrl = getEnv('NEXT_PUBLIC_APP_URL')
let appHostname = ''
try {
  appHostname = appUrl ? new URL(appUrl).hostname : ''
} catch {
  // invalid URL — isHosted stays false
}
export const isHosted = appHostname === 'sim.ai' || appHostname.endsWith('.sim.ai')
```

**Derivation:** Parses the hostname from `NEXT_PUBLIC_APP_URL`. Returns `true` if the hostname is exactly `sim.ai` or any subdomain (`*.sim.ai`, e.g., `staging.sim.ai`, `dev.sim.ai`).

**Features gated by `isHosted`:**

- `isAuthDisabled`: `DISABLE_AUTH` is **blocked** when `isHosted` is true — authentication cannot be disabled on the hosted platform (logged as error)
- Various feature flags use `isHosted` indirectly through billing/plan checks — on the hosted platform, features like organizations, credential sets, access control, whitelabeling, audit logs, and inbox are gated by the user's billing plan rather than env var overrides

**For a Vercel deployment that is NOT `sim.ai`:** `isHosted` will be `false`, meaning:
- `DISABLE_AUTH` will work if set
- Self-hosted feature override env vars (`*_ENABLED`) will work to enable features without plan checks

---

## 26. Feature Flags Summary

From `feature-flags.ts` — all derived from env vars:

| Flag | Derived From | Description |
|---|---|---|
| `isProd` | `NODE_ENV === 'production'` | Production mode |
| `isDev` | `NODE_ENV === 'development'` | Development mode |
| `isTest` | `NODE_ENV === 'test'` | Test mode |
| `isHosted` | `NEXT_PUBLIC_APP_URL` hostname | True for `sim.ai` / `*.sim.ai` |
| `isBillingEnabled` | `BILLING_ENABLED` | Billing enforcement active |
| `isEmailVerificationEnabled` | `EMAIL_VERIFICATION_ENABLED` | Email verification active |
| `isAuthDisabled` | `DISABLE_AUTH && !isHosted` | Auth bypass (self-hosted only) |
| `isRegistrationDisabled` | `DISABLE_REGISTRATION` | New registration disabled |
| `isEmailPasswordEnabled` | `EMAIL_PASSWORD_SIGNUP_ENABLED` (default: true) | Email/password auth enabled |
| `isSignupEmailValidationEnabled` | `SIGNUP_EMAIL_VALIDATION_ENABLED` | Disposable email blocking |
| `isTriggerDevEnabled` | `TRIGGER_DEV_ENABLED` | Trigger.dev async jobs |
| `isSsoEnabled` | `SSO_ENABLED` | SSO authentication |
| `isCredentialSetsEnabled` | `CREDENTIAL_SETS_ENABLED` | Email polling |
| `isAccessControlEnabled` | `ACCESS_CONTROL_ENABLED` | Permission groups |
| `isOrganizationsEnabled` | `BILLING_ENABLED \|\| ORGANIZATIONS_ENABLED \|\| ACCESS_CONTROL_ENABLED` | Organizations (enabled by billing, explicit flag, or access control) |
| `isInboxEnabled` | `INBOX_ENABLED` | Sim Mailer |
| `isWhitelabelingEnabled` | `WHITELABELING_ENABLED` | Whitelabeling |
| `isAuditLogsEnabled` | `AUDIT_LOGS_ENABLED` | Audit logs |
| `isE2bEnabled` | `E2B_ENABLED` | E2B remote code execution |
| `isOllamaConfigured` | `Boolean(OLLAMA_URL)` | Ollama local models available |
| `isAzureConfigured` | `NEXT_PUBLIC_AZURE_CONFIGURED` | Azure credentials pre-configured |
| `isInvitationsDisabled` | `DISABLE_INVITATIONS` | Invitations disabled |
| `isPublicApiDisabled` | `DISABLE_PUBLIC_API` | Public API disabled |
| `isGoogleAuthDisabled` | `DISABLE_GOOGLE_AUTH` | Google OAuth hidden |
| `isGithubAuthDisabled` | `DISABLE_GITHUB_AUTH` | GitHub OAuth hidden |
| `isReactGrabEnabled` | `isDev && REACT_GRAB_ENABLED` | React Grab (dev only) |
| `isReactScanEnabled` | `isDev && REACT_SCAN_ENABLED` | React Scan (dev only) |

**Helper functions:**
- `getAllowedIntegrationsFromEnv()` — parses `ALLOWED_INTEGRATIONS` into array or null
- `getBlacklistedProvidersFromEnv()` — parses `BLACKLISTED_PROVIDERS` into array
- `getAllowedMcpDomainsFromEnv()` — parses `ALLOWED_MCP_DOMAINS` into normalized hostname array or null
- `getCostMultiplier()` — returns `COST_MULTIPLIER` in prod, `1` in dev

---

## 27. Shared Variables

Available on both server and client:

| Variable | Type | Description |
|---|---|---|
| `NODE_ENV` | `z.enum(['development','test','production']).optional()` | Runtime environment |
| `NEXT_TELEMETRY_DISABLED` | `z.string().optional()` | Disable Next.js telemetry collection |

---

## 28. Utility Functions (env.ts)

```typescript
// Universal env getter: next-runtime-env first, then process.env fallback
const getEnv = (variable: string) => runtimeEnv(variable) ?? process.env[variable]

// Boolean helpers (needed because t3-env returns strings for boolean values)
export const isTruthy = (value) =>
  typeof value === 'string' ? value.toLowerCase() === 'true' || value === '1' : Boolean(value)

export const isFalsy = (value) =>
  typeof value === 'string' ? value.toLowerCase() === 'false' || value === '0' : value === false
```

**Note:** `skipValidation: true` is set in `createEnv()`, which means Zod validation is **not enforced at runtime**. The schemas serve as documentation and type generation only.
