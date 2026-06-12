# KZN Chess Admin MCP Server

An [MCP](https://modelcontextprotocol.io) server exposing the platform's
admin and moderation operations as tools, so an AI agent can routinely
manage the site: approve tournament submissions, moderate comments and
photos, manage announcements, and review activity.

It connects directly to Supabase with the service-role key (the same access
model as the Next.js API routes) and writes an `audit_logs` row for every
mutation, so agent actions show up in `/admin/logs` alongside human admin
actions.

## Safety rails (by design)

- **No tournament deletion** — only status changes (reject is reversible).
- **No promotion to admin** and no role/ban changes on admin accounts.
- **No user or district deletion**; districts are read-only.
- Every mutation accepts a `reason` and is audit-logged with `via: 'mcp'`.

## Setup

1. Create `.env.local` at the repo root (gitignored) with:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
   # Optional: attribute audit logs to a real admin account
   MCP_ADMIN_EMAIL=admin@kznchess.co.za
   ```

2. The server is registered in `.mcp.json`, so any Claude Code session
   started in this repo picks it up automatically. Verify with `/mcp`.

## Tools

| Tool | What it does |
| --- | --- |
| `get_site_overview` | Counts + pending approvals + recent activity. Call first. |
| `list_tournaments` / `get_tournament` | Browse and inspect tournaments. |
| `set_tournament_status` | Approve / reject / feature / reset to pending. |
| `set_tournament_verified` | Toggle the "Officially Endorsed" badge. |
| `list_users` | Browse users (no password hashes). |
| `set_user_role` | Promote to organizer / revoke to player. |
| `set_user_active` | Ban / unban (not admins). |
| `list_announcements` / `create_announcement` / `update_announcement` / `delete_announcement` | Home-page banner management. |
| `list_recent_comments` / `delete_comment` | Comment moderation. |
| `list_recent_media` / `delete_media` | Photo moderation. |
| `list_districts` | Read-only district info. |
| `get_audit_logs` | Review the audit trail. |

## Running an agent on a cron job

`mcp/ROUTINE.md` is the caretaker prompt: review pending tournaments,
moderate new comments/media, expire stale announcement banners, and report.

### Option A: crontab (runs on this machine)

```cron
# Every day at 07:00 — routine site management
0 7 * * * cd /Users/keagan/KZN-Chess && claude -p "$(cat mcp/ROUTINE.md)" --allowedTools "mcp__kzn-chess-admin__*" >> ~/kzn-chess-caretaker.log 2>&1
```

`claude -p` runs headless in the repo, auto-loads `.mcp.json`, and
`--allowedTools` pre-approves only this server's tools so the run never
blocks on permission prompts.

### Option B: Claude Code scheduled routine

In a Claude Code session in this repo, ask:
`/schedule run mcp/ROUTINE.md daily at 07:00`. Note that cloud routines need
the Supabase env vars available to the cloud environment.

### Manual run

```
cd /Users/keagan/KZN-Chess && claude -p "$(cat mcp/ROUTINE.md)"
```
