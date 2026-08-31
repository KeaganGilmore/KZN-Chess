import { describe, it, expect, afterEach } from 'vitest';
import { envFlag, envStr } from '@/lib/env';
import { getDbMode } from '@/lib/db/mode';

const KEYS = [
  'DB_DIRECT',
  'DATABASE_URL',
  'UPLOAD_DIR',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('envFlag', () => {
  it('accepts plain and quoted truthy values (Railway raw editor keeps quotes)', () => {
    for (const v of ['true', '"true"', "'true'", ' TRUE ', '1', 'yes', 'on']) {
      process.env.DB_DIRECT = v;
      expect(envFlag('DB_DIRECT'), `value ${JSON.stringify(v)}`).toBe(true);
    }
  });
  it('rejects falsy and unset values', () => {
    for (const v of ['false', '"false"', '0', 'no', '', '   ']) {
      process.env.DB_DIRECT = v;
      expect(envFlag('DB_DIRECT'), `value ${JSON.stringify(v)}`).toBe(false);
    }
    delete process.env.DB_DIRECT;
    expect(envFlag('DB_DIRECT')).toBe(false);
  });
});

describe('envStr', () => {
  it('strips surrounding quotes and whitespace', () => {
    process.env.UPLOAD_DIR = '"/data/uploads"';
    expect(envStr('UPLOAD_DIR')).toBe('/data/uploads');
    process.env.UPLOAD_DIR = '  /data/uploads  ';
    expect(envStr('UPLOAD_DIR')).toBe('/data/uploads');
  });
  it('returns null for empty or unset', () => {
    process.env.UPLOAD_DIR = '""';
    expect(envStr('UPLOAD_DIR')).toBeNull();
    delete process.env.UPLOAD_DIR;
    expect(envStr('UPLOAD_DIR')).toBeNull();
  });
  it('keeps inner quotes intact', () => {
    process.env.DATABASE_URL = 'postgresql://u:p"a@host:5432/db';
    expect(envStr('DATABASE_URL')).toBe('postgresql://u:p"a@host:5432/db');
  });
});

describe('getDbMode', () => {
  it('is direct when DB_DIRECT is set, quoted or not', () => {
    process.env.DB_DIRECT = '"true"';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
    expect(getDbMode()).toBe('direct');
  });
  it('falls back to direct when Supabase is not configured but DATABASE_URL is', () => {
    delete process.env.DB_DIRECT;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    process.env.DATABASE_URL = 'postgresql://u:p@h:5432/d';
    expect(getDbMode()).toBe('direct');
  });
  it('stays on supabase when configured and the flag is off', () => {
    process.env.DB_DIRECT = 'false';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://x.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
    expect(getDbMode()).toBe('supabase');
  });
});
