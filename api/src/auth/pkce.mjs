import { randomBytes, createHash } from 'node:crypto'

export function createVerifier() {
  return randomBytes(32).toString('base64url')
}

export async function challengeFor(verifier) {
  return createHash('sha256').update(verifier).digest('base64url')
}

export function randomToken() {
  return randomBytes(32).toString('base64url')
}
