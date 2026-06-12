import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 10;

/** Legacy hash written by the old register route: `$2b$10$dummy_<base64(password)>` */
const LEGACY_REGISTER_PREFIX = '$2b$10$dummy_';
/** Legacy placeholder hash from seed.sql; those accounts use the documented dev password. */
const LEGACY_SEED_PREFIX = '$2b$10$dummyhash';
const LEGACY_SEED_PASSWORD = 'password123';

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/**
 * Verifies a password against a stored hash, supporting the two legacy
 * placeholder formats that predate real hashing. Returns whether the
 * password matched and whether the stored hash should be upgraded.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (storedHash.startsWith(LEGACY_REGISTER_PREFIX)) {
    const encoded = Buffer.from(password).toString('base64');
    const valid = storedHash === `${LEGACY_REGISTER_PREFIX}${encoded}`;
    return { valid, needsUpgrade: valid };
  }

  if (storedHash.startsWith(LEGACY_SEED_PREFIX)) {
    const valid = password === LEGACY_SEED_PASSWORD;
    return { valid, needsUpgrade: valid };
  }

  const valid = await bcrypt.compare(password, storedHash);
  return { valid, needsUpgrade: false };
}
