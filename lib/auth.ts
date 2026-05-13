import { cookies } from "next/headers"
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

/** Server-side: read current user from cookie. Returns null if not signed in. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const store = await cookies()
  return deserializeUser(store.get(AUTH_COOKIE_NAME)?.value)
}
