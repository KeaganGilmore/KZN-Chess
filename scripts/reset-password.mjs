// Resets a user's password directly in the database (there is no
// self-service reset flow). Uses the same bcrypt cost as src/lib/passwords.ts.
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/reset-password.mjs <email> [newPassword]
//
// If newPassword is omitted, a random one is generated and printed.

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const BCRYPT_ROUNDS = 10;

const [email, given] = process.argv.slice(2);
if (!email || !process.env.DATABASE_URL) {
  console.error('Usage: DATABASE_URL=... node scripts/reset-password.mjs <email> [newPassword]');
  process.exit(1);
}

const password = given || crypto.randomBytes(12).toString('base64url');
const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    'UPDATE users SET password_hash = $1 WHERE lower(email) = lower($2) RETURNING id, email',
    [hash, email]
  );
  if (rows.length === 0) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }
  console.log(`Password reset for ${rows[0].email}`);
  if (!given) console.log(`New password: ${password}`);
} finally {
  await client.end();
}
