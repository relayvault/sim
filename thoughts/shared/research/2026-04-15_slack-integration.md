---
date: 2026-04-15
researcher: Devin
git_commit: 1cff3aac8
branch: main
repository: relayvault/sim
topic: "Slack Integration — What Exists and What's Needed to Enable It"
tags: [research, codebase, slack, integration, oauth]
status: complete
last_updated: 2026-04-15
last_updated_by: Devin
---

# Research: Slack Integration in Sim

## Research Question

What does the Sim codebase already provide for Slack, and what do we need to configure to enable the Slack integration on our Vercel deployment?

## Summary

The Slack integration is **fully implemented in code**. All tools (25 operations), the block definition, the webhook trigger, the knowledge-base connector, the OAuth provider config, and the internal API routes are already wired up and registered. No code changes are required.

To enable it on a deployment you need to:

1. Create a Slack App at [api.slack.com/apps](https://api.slack.com/apps).
2. Set two environment variables in Vercel: `SLACK_CLIENT_ID` and `SLACK_CLIENT_SECRET`.
3. Configure the OAuth redirect URI in the Slack App to point to your deployment.
4. Add the required bot token scopes in the Slack App.

---

## Detailed Findings

### 1. Environment Variables Required

Only two env vars are needed. Both are defined as `z.string().optional()` in the env schema, so the app starts without them — but the OAuth flow will fail until they are set.

| Variable | Where Defined | Purpose |
|---|---|---|
| `SLACK_CLIENT_ID` | [`lib/core/config/env.ts:299`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/lib/core/config/env.ts#L299) | Slack OAuth client ID |
| `SLACK_CLIENT_SECRET` | [`lib/core/config/env.ts:300`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/lib/core/config/env.ts#L300) | Slack OAuth client secret |

These are consumed in two places:

- **Auth provider config** — [`lib/auth/auth.ts:2363-2364`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/lib/auth/auth.ts#L2363-L2364) — used during the OAuth authorization flow with Slack.
- **Token refresh** — [`lib/oauth/oauth.ts:1217-1228`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/lib/oauth/oauth.ts#L1217-L1228) — used to exchange/refresh tokens via `https://slack.com/api/oauth.v2.access`.

### 2. Slack App Configuration

You need to create a Slack App at https://api.slack.com/apps. Here is exactly what to configure:

#### OAuth Redirect URI

The app constructs the redirect URI dynamically:

```
{getBaseUrl()}/api/auth/oauth2/callback/slack
```

For your Vercel deployment, this would be:

```
https://sims.relayvault.ai/api/auth/oauth2/callback/slack
```

(Or whatever `NEXT_PUBLIC_APP_URL` / `BETTER_AUTH_URL` resolves to.)

Set this as the **Redirect URL** in the Slack App under **OAuth & Permissions**.

#### Required Bot Token Scopes

The codebase requests these scopes during OAuth authorization ([`lib/oauth/oauth.ts:686-702`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/lib/oauth/oauth.ts#L686-L702)):

| Scope | Purpose |
|---|---|
| `channels:read` | View public channels |
| `channels:history` | Read channel messages |
| `groups:read` | View private channels |
| `groups:history` | Read private channel messages |
| `chat:write` | Send messages |
| `chat:write.public` | Post to public channels the bot isn't in |
| `im:write` | Send direct messages |
| `im:history` | Read DM history |
| `im:read` | View DM channels |
| `users:read` | View workspace users |
| `files:write` | Upload files |
| `files:read` | Download/access files |
| `canvases:write` | Create and edit canvases |
| `reactions:write` | Add/remove emoji reactions |

Add all of these under **OAuth & Permissions → Bot Token Scopes** in the Slack App.

#### Event Subscriptions (for Trigger mode only)

If you want to use the Slack block in **trigger mode** (workflows that start from Slack events), you also need to configure Event Subscriptions in the Slack App. The trigger setup instructions are embedded in the block UI ([`triggers/slack/webhook.ts:58-67`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/triggers/slack/webhook.ts#L58-L67)):

1. Go to **Event Subscriptions** in your Slack App.
2. Enable events.
3. Subscribe to bot events: `app_mention`, `message.channels`, `message.im`, `message.mpim`, `message.groups`, `reaction_added`, `reaction_removed`.
4. Set the **Request URL** to the webhook URL displayed in the Sim trigger UI.
5. Provide the app's **Signing Secret** in the trigger config for request validation.

The webhook handler validates requests using HMAC-SHA256 signature verification ([`lib/webhooks/providers/slack.ts:191-219`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/lib/webhooks/providers/slack.ts#L191-L219)).

### 3. What's Already Built — Full Inventory

#### Tools (25 operations)

All tools live under `apps/sim/tools/slack/` and are registered in [`tools/registry.ts:2286-2311`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/tools/registry.ts#L2286-L2311):

| Tool ID | File | Description |
|---|---|---|
| `slack_message` | `message.ts` | Send messages to channels or DMs |
| `slack_ephemeral_message` | `ephemeral_message.ts` | Send ephemeral messages (visible to one user) |
| `slack_canvas` | `canvas.ts` | Create Slack canvases |
| `slack_message_reader` | `message_reader.ts` | Read channel/DM history |
| `slack_get_message` | `get_message.ts` | Get a specific message by timestamp |
| `slack_get_thread` | `get_thread.ts` | Get full thread (parent + replies) |
| `slack_list_channels` | `list_channels.ts` | List workspace channels |
| `slack_list_members` | `list_members.ts` | List channel members |
| `slack_list_users` | `list_users.ts` | List workspace users |
| `slack_get_user` | `get_user.ts` | Get user info |
| `slack_get_user_presence` | `get_user_presence.ts` | Get user online status |
| `slack_download` | `download.ts` | Download files from Slack |
| `slack_update_message` | `update_message.ts` | Edit a sent message |
| `slack_delete_message` | `delete_message.ts` | Delete a message |
| `slack_add_reaction` | `add_reaction.ts` | Add emoji reaction |
| `slack_remove_reaction` | `remove_reaction.ts` | Remove emoji reaction |
| `slack_get_channel_info` | `get_channel_info.ts` | Get channel metadata |
| `slack_edit_canvas` | `edit_canvas.ts` | Edit existing canvas |
| `slack_create_channel_canvas` | `create_channel_canvas.ts` | Create canvas pinned to channel |
| `slack_create_conversation` | `create_conversation.ts` | Create a new channel |
| `slack_invite_to_conversation` | `invite_to_conversation.ts` | Invite users to channel |
| `slack_open_view` | `open_view.ts` | Open a modal view |
| `slack_update_view` | `update_view.ts` | Update a modal view |
| `slack_push_view` | `push_view.ts` | Push a view onto the modal stack |
| `slack_publish_view` | `publish_view.ts` | Publish Home tab view |

#### Internal API Routes (10 endpoints)

All under `apps/sim/app/api/tools/slack/`:

- `send-message/route.ts` — POST, sends messages with optional file attachments
- `send-ephemeral/route.ts` — POST, sends ephemeral messages
- `read-messages/route.ts` — POST, reads channel history
- `update-message/route.ts` — POST, edits messages
- `delete-message/route.ts` — POST, deletes messages
- `add-reaction/route.ts` — POST, adds emoji reactions
- `remove-reaction/route.ts` — POST, removes emoji reactions
- `channels/route.ts` — POST, lists channels (used by UI selectors)
- `users/route.ts` — POST, lists users (used by UI selectors)
- `download/route.ts` — POST, downloads files
- `utils.ts` — Shared helpers (message sending, file upload, DM channel opening)

#### Block Definition

[`blocks/blocks/slack.ts`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/blocks/blocks/slack.ts) — 1,665 lines. Registered in [`blocks/registry.ts:424`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/blocks/registry.ts#L424) as `slack: SlackBlock`.

Key features:
- 24 operations via dropdown selector
- Two auth methods: **Sim Bot** (OAuth — default) and **Custom Bot** (manual bot token)
- Channel selector and user selector UIs that fetch live data from Slack API
- Block Kit JSON editor with AI wand for generating layouts
- File upload support (basic mode: file picker, advanced mode: block reference)
- Trigger mode: spreads `slackWebhookTrigger.subBlocks` for event-driven workflows

#### Trigger

[`triggers/slack/webhook.ts`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/triggers/slack/webhook.ts) — Registered as `slack_webhook` in [`triggers/registry.ts:281`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/triggers/registry.ts#L281).

Config fields:
- **Webhook URL** (auto-generated, read-only)
- **Signing Secret** (required — from Slack App → Basic Information)
- **Bot Token** (optional — needed for file downloads)
- **Include File Attachments** toggle

Outputs a rich `event` object with: `event_type`, `subtype`, `channel`, `channel_type`, `user`, `user_name`, `text`, `timestamp`, `thread_ts`, `team_id`, `event_id`, `reaction`, `item_user`, `hasFiles`, `files`.

#### Webhook Provider Handler

[`lib/webhooks/providers/slack.ts`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/lib/webhooks/providers/slack.ts) — 364 lines. Handles:

- **Auth verification**: HMAC-SHA256 signature validation with 5-minute timestamp skew check
- **Challenge handling**: Responds to Slack's `url_verification` challenge during Event Subscription setup
- **Idempotency**: Extracts `event_id` or `team_id:ts` composite key to deduplicate events
- **Input formatting**: Maps raw Slack event payloads to the trigger output schema
- **File downloads**: Downloads up to 15 files (50 MB max each) from `url_private` with DNS validation
- **Reaction events**: Fetches original message text via `reactions.get` API for reaction events

#### Knowledge Base Connector

[`connectors/slack/slack.ts`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/connectors/slack/slack.ts) — 509 lines. Registered as `slackConnector`.

Syncs Slack channel messages into the knowledge base. Uses OAuth auth with scopes: `channels:read`, `channels:history`, `groups:read`, `groups:history`, `users:read`. Resolves channel by name or ID, fetches message history with pagination, resolves user display names, and produces a chronological text document.

#### Notification System Integration

The logs/notifications UI has built-in Slack support ([`notifications.tsx`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/app/workspace/%5BworkspaceId%5D/logs/components/logs-toolbar/components/notifications/notifications.tsx)):
- `SlackChannelSelector` component for picking channels
- OAuth connection flow for Slack accounts
- Slack is a first-class notification type alongside webhook and email

### 4. Authentication Flow

The OAuth flow works as follows:

1. User clicks "Connect Slack" in the block's credential selector.
2. App redirects to `https://slack.com/oauth/v2/authorize` with the scopes listed above.
3. User authorizes in Slack, Slack redirects to `{baseUrl}/api/auth/oauth2/callback/slack`.
4. App exchanges the code for an access token via `https://slack.com/api/oauth.v2.access`.
5. App calls `https://slack.com/api/auth.test` to get workspace info (team ID, user ID, team name).
6. Credential is stored with a unique ID of `{teamId}-{userId}`.
7. Token refresh is handled automatically via the `supportsRefreshTokenRotation: true` setting.

Alternatively, users can bypass OAuth entirely by selecting "Custom Bot" auth method and pasting a `xoxb-...` bot token directly.

---

## Step-by-Step Setup Checklist

### A. Create the Slack App

1. Go to https://api.slack.com/apps and click **Create New App → From scratch**.
2. Name it (e.g., "Sim Workflows") and select your target Slack workspace.
3. Go to **Basic Information** and note the **Client ID**, **Client Secret**, and **Signing Secret**.

### B. Configure OAuth & Permissions

1. In the Slack App, go to **OAuth & Permissions**.
2. Under **Redirect URLs**, add:
   ```
   https://<YOUR_DEPLOYMENT_URL>/api/auth/oauth2/callback/slack
   ```
   For production: `https://sims.relayvault.ai/api/auth/oauth2/callback/slack`
3. Under **Bot Token Scopes**, add all 14 scopes listed in section 2 above.
4. Install the app to your workspace. Copy the **Bot User OAuth Token** if you plan to use Custom Bot mode.

### C. Set Vercel Environment Variables

In Vercel → Project Settings → Environment Variables, add:

| Variable | Value | Environments |
|---|---|---|
| `SLACK_CLIENT_ID` | Client ID from step A.3 | Production, Preview |
| `SLACK_CLIENT_SECRET` | Client Secret from step A.3 | Production, Preview |

Redeploy after setting these.

### D. (Optional) Configure Event Subscriptions for Triggers

Only needed if you want Slack events (mentions, messages, reactions) to trigger workflows:

1. In the Slack App, go to **Event Subscriptions** and enable events.
2. In Sim, create a workflow with a Slack trigger block — it will display a webhook URL.
3. Paste that webhook URL into the Slack App's **Request URL** field.
4. Subscribe to bot events as needed: `app_mention`, `message.channels`, `message.im`, etc.
5. Paste the **Signing Secret** from step A.3 into the trigger config in Sim.

---

## Code References

- `apps/sim/lib/core/config/env.ts:299-300` — Env var definitions
- `apps/sim/lib/auth/auth.ts:2360-2404` — OAuth provider config (authorization URL, token URL, user info)
- `apps/sim/lib/oauth/oauth.ts:676-705` — Scopes and provider definition
- `apps/sim/lib/oauth/oauth.ts:1217-1228` — Token exchange/refresh config
- `apps/sim/blocks/blocks/slack.ts` — Block definition (1,665 lines, 24 operations)
- `apps/sim/tools/slack/` — All 25 tool implementations
- `apps/sim/tools/registry.ts:2286-2311` — Tool registry entries
- `apps/sim/blocks/registry.ts:424` — Block registry entry
- `apps/sim/triggers/slack/webhook.ts` — Trigger definition
- `apps/sim/triggers/registry.ts:281` — Trigger registry entry
- `apps/sim/lib/webhooks/providers/slack.ts` — Webhook handler (auth, challenge, formatting)
- `apps/sim/connectors/slack/slack.ts` — Knowledge base connector
- `apps/sim/app/api/tools/slack/` — Internal API routes (10 endpoints)
- `apps/sim/app/api/tools/slack/utils.ts` — Shared message/file upload helpers

## Architecture Documentation

The Slack integration follows Sim's standard integration pattern:

```
User ←→ Block UI (slack.ts)
           ↓ selects operation
       Tool Config (tools/slack/*.ts)
           ↓ makes request to
       Internal API Route (app/api/tools/slack/*)
           ↓ calls
       Slack Web API (slack.com/api/*)
```

Authentication flows through either:
- **OAuth** (default): Stored credential → access token injected via `visibility: 'hidden'` param
- **Custom Bot**: User-provided `xoxb-...` token via `visibility: 'user-only'` param

Trigger flow:
```
Slack Event → Sim Webhook Endpoint → Provider Handler (slack.ts)
    ↓ validates signature
    ↓ handles challenge
    ↓ formats input
    ↓ queues workflow execution
```

## Open Questions

- **Slack App Review**: The codebase has a TODO comment ([`lib/oauth/oauth.ts:697`](https://github.com/relayvault/sim/blob/1cff3aac8/apps/sim/lib/oauth/oauth.ts#L697)): `// TODO: Add 'users:read.email' once Slack app review is approved`. This scope requires Slack App Directory review. It's not needed for basic functionality.
- **Preview Deployment OAuth**: Each Vercel preview deployment gets a unique URL. The OAuth redirect URI must match exactly. For preview testing, you'd need to either add the preview URL to the Slack App's redirect URLs or use the Custom Bot auth method with a manually-created bot token.
