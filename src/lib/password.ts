// src/lib/password.ts
import bcrypt from 'bcryptjs'

/**
 * Hash a password securely using bcryptjs (pure JS, 100% serverless compatible)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12)
  return bcrypt.hash(password, salt)
}

/**
 * Verify a plain text password against a hashed password.
 * Supports:
 * - bcrypt ($2a$, $2b$, $2y$)
 * - argon2 ($argon2id$, $argon2i$, $argon2d$) with graceful fallback
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false

  // If bcrypt hash
  if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
    return bcrypt.compare(password, hash)
  }

  // If legacy argon2 hash
  if (hash.startsWith('$argon2')) {
    try {
      // Dynamic import to prevent crash if native module is absent in serverless runtime
      const argon2 = await import('argon2')
      return await argon2.verify(hash, password)
    } catch (err) {
      console.warn('Argon2 verification failed or module unavailable in serverless environment:', err)
      return false
    }
  }

  return false
}
