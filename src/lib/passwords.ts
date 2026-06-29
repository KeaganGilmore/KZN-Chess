import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;
const BCRYPT_RE = /^\$2[aby]\$\d{2}\$/;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verifies a password against a stored bcrypt hash. Returns whether the
 * password matched and whether the hash should be re-written — true only when
 * a valid hash uses an out-of-date cost factor, so the auth flow can
 * transparently upgrade it on the user's next successful login.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (!storedHash || !BCRYPT_RE.test(storedHash)) {
    return { valid: false, needsUpgrade: false };
  }

  const valid = await bcrypt.compare(password, storedHash);
  if (!valid) return { valid: false, needsUpgrade: false };

  let needsUpgrade = false;
  try {
    needsUpgrade = bcrypt.getRounds(storedHash) < BCRYPT_ROUNDS;
  } catch {
    needsUpgrade = false;
  }
  return { valid, needsUpgrade };
}
