import type { AppUser } from "./types"

export const AUTH_COOKIE_NAME = "sewise_session_user"
export const AUTH_STORAGE_KEY = "sewise_current_user"

/**
 * Demo-mode auth: we don't use Supabase Auth because the user wants
 * one-click password-less login with predefined accounts.
 * Sessions live in a cookie (for server read) + localStorage (for client read).
 */

export function serializeUser(user: AppUser): string {
  return encodeURIComponent(JSON.stringify(user))
}

export function deserializeUser(raw: string | undefined | null): AppUser | null {
  if (!raw) return null
  try {
    return JSON.parse(decodeURIComponent(raw)) as AppUser
  } catch {
    return null
  }
}
