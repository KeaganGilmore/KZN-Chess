#!/usr/bin/env node
/**
 * KZN Chess Admin MCP server.
 *
 * Exposes the platform's admin/moderation operations as MCP tools so an
 * agent (e.g. a scheduled Claude Code session) can routinely manage the
 * site: approve tournaments, moderate comments/media, manage announcements,
 * and review activity.
 *
 * Talks directly to Supabase with the service-role key — the same access
 * model as the Next.js API routes (authorization is app-level, RLS is
 * bypassed). Every mutation writes an audit_logs row, like the web admin.
 *
 * Deliberately excluded, so an autonomous agent cannot do them:
 *   - hard-deleting tournaments (reject instead — it's reversible)
 *   - promoting users to admin (humans only)
 *   - deleting users or districts
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Environment: prefer process.env, fall back to .env.local / .env in repo root
// ---------------------------------------------------------------------------
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.replace(/^["']|["']$/g, '');
  }
}
loadEnvFile(join(repoRoot, '.env.local'));
loadEnvFile(join(repoRoot, '.env'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Set them in the environment or in .env.local at the repo root.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// Identity used for audit_logs rows written by this server
const AGENT_EMAIL = process.env.MCP_ADMIN_EMAIL || 'mcp-agent@kznchess.co.za';
let agentUserIdPromise;
function getAgentUserId() {
  agentUserIdPromise ??= supabase
    .from('users')
    .select('id')
    .eq('email', AGENT_EMAIL)
    .single()
    .then(({ data }) => data?.id ?? null);
  return agentUserIdPromise;
}

async function auditLog(action, entityType, entityId, details) {
  const adminId = await getAgentUserId();
  await supabase.from('audit_logs').insert({
    admin_id: adminId,
    admin_email: AGENT_EMAIL,
    action,
    entity_type: entityType,
    entity_id: entityId,
    details: details ?? null,
  });
}

// ---------------------------------------------------------------------------
// Tool plumbing
// ---------------------------------------------------------------------------
const server = new McpServer({ name: 'kzn-chess-admin', version: '1.0.0' });

function ok(data) {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function tool(name, description, shape, handler) {
  server.tool(name, description, shape, async (args) => {
    try {
      return ok(await handler(args));
    } catch (err) {
      return {
        isError: true,
        content: [{ type: 'text', text: `Error: ${err.message}` }],
      };
    }
  });
}

function throwIfError(error) {
  if (error) throw new Error(error.message);
}

const USER_COLUMNS = 'id, email, name, role, district_id, is_active, created_at';

// ---------------------------------------------------------------------------
// Overview & activity
// ---------------------------------------------------------------------------
tool(
  'get_site_overview',
  'Snapshot of the platform: tournament counts by status, pending approvals, user/organizer counts, upcoming events, and recent admin activity. Call this first to decide what needs attention.',
  {},
  async () => {
    const today = new Date().toISOString().split('T')[0];
    const [total, pending, upcoming, users, organizers, recentLogs, recentComments, recentMedia] =
      await Promise.all([
        supabase.from('tournaments').select('id', { count: 'exact', head: true }),
        supabase
          .from('tournaments')
          .select('id, name, date, created_at, district:districts(name), organizer:users(name, email)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false }),
        supabase
          .from('tournaments')
          .select('id', { count: 'exact', head: true })
          .in('status', ['approved', 'featured'])
          .gte('date', today),
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('role', 'organizer'),
        supabase
          .from('audit_logs')
          .select('action, entity_type, admin_email, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('tournament_comments')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
        supabase
          .from('tournament_media')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

    return {
      tournaments_total: total.count ?? 0,
      tournaments_pending_approval: pending.data ?? [],
      upcoming_public_tournaments: upcoming.count ?? 0,
      users_total: users.count ?? 0,
      organizers_total: organizers.count ?? 0,
      comments_last_7_days: recentComments.count ?? 0,
      media_uploads_last_7_days: recentMedia.count ?? 0,
      recent_admin_activity: recentLogs.data ?? [],
    };
  }
);

tool(
  'get_audit_logs',
  'Recent admin audit log entries (includes actions taken by this agent and by human admins).',
  {
    limit: z.number().int().min(1).max(200).optional().describe('Default 50'),
    entity_type: z
      .enum(['tournament', 'user', 'district', 'announcement', 'content', 'comment', 'media'])
      .optional(),
  },
  async ({ limit = 50, entity_type }) => {
    let query = supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (entity_type) query = query.eq('entity_type', entity_type);
    const { data, error } = await query;
    throwIfError(error);
    return data;
  }
);

// ---------------------------------------------------------------------------
// Tournaments
// ---------------------------------------------------------------------------
tool(
  'list_tournaments',
  'List tournaments with optional filters. Use status="pending" to find submissions awaiting review.',
  {
    status: z.enum(['pending', 'approved', 'rejected', 'featured']).optional(),
    search: z.string().optional().describe('Case-insensitive match on tournament name'),
    from_date: z.string().optional().describe('YYYY-MM-DD — only tournaments on/after this date'),
    to_date: z.string().optional().describe('YYYY-MM-DD — only tournaments on/before this date'),
    limit: z.number().int().min(1).max(200).optional().describe('Default 50'),
  },
  async ({ status, search, from_date, to_date, limit = 50 }) => {
    let query = supabase
      .from('tournaments')
      .select(
        'id, name, date, end_date, venue, status, is_verified, time_control, rounds, created_at, district:districts(name), organizer:users(id, name, email)'
      )
      .order('date', { ascending: true })
      .limit(limit);
    if (status) query = query.eq('status', status);
    if (search) query = query.ilike('name', `%${search}%`);
    if (from_date) query = query.gte('date', from_date);
    if (to_date) query = query.lte('date', to_date);
    const { data, error } = await query;
    throwIfError(error);
    return data;
  }
);

tool(
  'get_tournament',
  'Full details of one tournament, including description, contact info, registration procedure, and organizer.',
  { id: z.string().uuid() },
  async ({ id }) => {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*, district:districts(*), organizer:users(id, name, email, role)')
      .eq('id', id)
      .single();
    throwIfError(error);
    return data;
  }
);

tool(
  'set_tournament_status',
  'Approve, reject, feature, or reset a tournament to pending. Rejecting hides it from public listings but keeps it visible to its organizer (reversible — prefer this over deletion). The action is audit-logged.',
  {
    id: z.string().uuid(),
    status: z.enum(['pending', 'approved', 'rejected', 'featured']),
    reason: z.string().optional().describe('Why — recorded in the audit log'),
  },
  async ({ id, status, reason }) => {
    const { data, error } = await supabase
      .from('tournaments')
      .update({ status })
      .eq('id', id)
      .select('id, name, status')
      .single();
    throwIfError(error);
    await auditLog(`tournament_${status}`, 'tournament', id, { status, reason, via: 'mcp' });
    return data;
  }
);

tool(
  'set_tournament_verified',
  'Set or remove the "Officially Endorsed" badge on a tournament. Audit-logged.',
  {
    id: z.string().uuid(),
    is_verified: z.boolean(),
    reason: z.string().optional(),
  },
  async ({ id, is_verified, reason }) => {
    const { data, error } = await supabase
      .from('tournaments')
      .update({ is_verified })
      .eq('id', id)
      .select('id, name, is_verified')
      .single();
    throwIfError(error);
    await auditLog(
      is_verified ? 'tournament_endorsed' : 'tournament_endorsement_removed',
      'tournament',
      id,
      { is_verified, reason, via: 'mcp' }
    );
    return data;
  }
);

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------
tool(
  'list_users',
  'List users (never includes password hashes). Filter by role, active status, or search name/email.',
  {
    role: z.enum(['player', 'organizer', 'admin']).optional(),
    active: z.boolean().optional(),
    search: z.string().optional().describe('Case-insensitive match on name or email'),
    limit: z.number().int().min(1).max(200).optional().describe('Default 50'),
  },
  async ({ role, active, search, limit = 50 }) => {
    let query = supabase
      .from('users')
      .select(`${USER_COLUMNS}, district:districts(name)`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (role) query = query.eq('role', role);
    if (active !== undefined) query = query.eq('is_active', active);
    if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    const { data, error } = await query;
    throwIfError(error);
    return data;
  }
);

tool(
  'set_user_role',
  'Promote a player to organizer or revoke organizer back to player. Promotion to admin is intentionally not possible from this tool. Audit-logged.',
  {
    id: z.string().uuid(),
    role: z.enum(['player', 'organizer']),
    reason: z.string().optional(),
  },
  async ({ id, role, reason }) => {
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('id, role, email, name')
      .eq('id', id)
      .single();
    throwIfError(fetchError);
    if (existing.role === 'admin') {
      throw new Error('Refusing to change the role of an admin account from the MCP server.');
    }
    const { data, error } = await supabase
      .from('users')
      .update({ role })
      .eq('id', id)
      .select(USER_COLUMNS)
      .single();
    throwIfError(error);
    await auditLog('user_role_changed', 'user', id, {
      role,
      previous_role: existing.role,
      reason,
      via: 'mcp',
    });
    return data;
  }
);

tool(
  'set_user_active',
  'Ban (is_active=false) or unban a user. Banned users cannot sign in or submit tournaments. Admin accounts cannot be banned from this tool. Audit-logged.',
  {
    id: z.string().uuid(),
    is_active: z.boolean(),
    reason: z.string().optional(),
  },
  async ({ id, is_active, reason }) => {
    const { data: existing, error: fetchError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();
    throwIfError(fetchError);
    if (existing.role === 'admin' && !is_active) {
      throw new Error('Refusing to deactivate an admin account from the MCP server.');
    }
    const { data, error } = await supabase
      .from('users')
      .update({ is_active })
      .eq('id', id)
      .select(USER_COLUMNS)
      .single();
    throwIfError(error);
    await auditLog(is_active ? 'user_unbanned' : 'user_banned', 'user', id, {
      is_active,
      reason,
      via: 'mcp',
    });
    return data;
  }
);

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------
tool(
  'list_announcements',
  'All announcements, including inactive and expired ones. The home page shows the newest active, in-window announcement.',
  {},
  async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    throwIfError(error);
    return data;
  }
);

tool(
  'create_announcement',
  'Publish a site-wide announcement banner on the home page. Audit-logged.',
  {
    title: z.string().min(1),
    content: z.string().min(1),
    is_active: z.boolean().optional().describe('Default true'),
    start_date: z.string().optional().describe('ISO timestamp; default now'),
    end_date: z.string().optional().describe('ISO timestamp; banner hides after this'),
  },
  async ({ title, content, is_active = true, start_date, end_date }) => {
    const adminId = await getAgentUserId();
    const { data, error } = await supabase
      .from('announcements')
      .insert({
        title,
        content,
        is_active,
        start_date: start_date || new Date().toISOString(),
        end_date: end_date || null,
        created_by: adminId,
      })
      .select()
      .single();
    throwIfError(error);
    await auditLog('announcement_created', 'announcement', data.id, { title, via: 'mcp' });
    return data;
  }
);

tool(
  'update_announcement',
  'Update an announcement (e.g. deactivate an outdated banner). Audit-logged.',
  {
    id: z.string().uuid(),
    title: z.string().optional(),
    content: z.string().optional(),
    is_active: z.boolean().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
  },
  async ({ id, ...fields }) => {
    const update = Object.fromEntries(
      Object.entries(fields).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(update).length === 0) throw new Error('No fields to update');
    const { data, error } = await supabase
      .from('announcements')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    throwIfError(error);
    await auditLog('announcement_updated', 'announcement', id, { ...update, via: 'mcp' });
    return data;
  }
);

tool(
  'delete_announcement',
  'Permanently delete an announcement. Prefer update_announcement with is_active=false unless it is spam. Audit-logged.',
  { id: z.string().uuid(), reason: z.string().optional() },
  async ({ id, reason }) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    throwIfError(error);
    await auditLog('announcement_deleted', 'announcement', id, { reason, via: 'mcp' });
    return { deleted: true, id };
  }
);

// ---------------------------------------------------------------------------
// Moderation: comments & media
// ---------------------------------------------------------------------------
tool(
  'list_recent_comments',
  'Recent tournament comments for moderation review, newest first.',
  {
    limit: z.number().int().min(1).max(200).optional().describe('Default 50'),
    since: z.string().optional().describe('ISO timestamp — only comments after this'),
  },
  async ({ limit = 50, since }) => {
    let query = supabase
      .from('tournament_comments')
      .select('id, content, created_at, tournament:tournaments(id, name), user:users(id, name, email, role)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (since) query = query.gte('created_at', since);
    const { data, error } = await query;
    throwIfError(error);
    return data;
  }
);

tool(
  'delete_comment',
  'Remove a comment (spam, abuse, off-topic). Audit-logged with the original content.',
  { id: z.string().uuid(), reason: z.string().optional() },
  async ({ id, reason }) => {
    const { data: existing } = await supabase
      .from('tournament_comments')
      .select('content, user_id, tournament_id')
      .eq('id', id)
      .single();
    const { error } = await supabase.from('tournament_comments').delete().eq('id', id);
    throwIfError(error);
    await auditLog('comment_deleted', 'comment', id, {
      reason,
      original_content: existing?.content,
      author_id: existing?.user_id,
      tournament_id: existing?.tournament_id,
      via: 'mcp',
    });
    return { deleted: true, id };
  }
);

tool(
  'list_recent_media',
  'Recent photo uploads for moderation review, newest first. Each entry includes the public URL so the image can be inspected.',
  {
    limit: z.number().int().min(1).max(200).optional().describe('Default 50'),
    since: z.string().optional().describe('ISO timestamp — only uploads after this'),
  },
  async ({ limit = 50, since }) => {
    let query = supabase
      .from('tournament_media')
      .select('id, url, caption, media_type, created_at, tournament:tournaments(id, name), uploader:users(id, name, email)')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (since) query = query.gte('created_at', since);
    const { data, error } = await query;
    throwIfError(error);
    return data;
  }
);

tool(
  'delete_media',
  'Remove an uploaded photo (inappropriate or off-topic content). Deletes the database record; the storage object is left for manual cleanup. Audit-logged.',
  { id: z.string().uuid(), reason: z.string().optional() },
  async ({ id, reason }) => {
    const { data: existing } = await supabase
      .from('tournament_media')
      .select('url, uploaded_by, tournament_id')
      .eq('id', id)
      .single();
    const { error } = await supabase.from('tournament_media').delete().eq('id', id);
    throwIfError(error);
    await auditLog('media_deleted', 'media', id, {
      reason,
      url: existing?.url,
      uploader_id: existing?.uploaded_by,
      tournament_id: existing?.tournament_id,
      via: 'mcp',
    });
    return { deleted: true, id };
  }
);

// ---------------------------------------------------------------------------
// Districts (read-only — structural changes are a human decision)
// ---------------------------------------------------------------------------
tool(
  'list_districts',
  'All districts with coordinator contacts and active status.',
  {},
  async () => {
    const { data, error } = await supabase.from('districts').select('*').order('name');
    throwIfError(error);
    return data;
  }
);

// ---------------------------------------------------------------------------
await server.connect(new StdioServerTransport());
console.error(`kzn-chess-admin MCP server running (audit identity: ${AGENT_EMAIL})`);
