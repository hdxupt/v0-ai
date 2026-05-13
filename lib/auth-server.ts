import "server-only"
import { cookies } from "next/headers"
import { AUTH_COOKIE_NAME, deserializeUser } from "./auth"
import type { AppUser } from "./types"

/** Server-side: read current user from cookie. Returns null if not signed in. */
export async function getCurrentUser(): Promise<AppUser | null> {
  const store = await cookies()
  return deserializeUser(store.get(AUTH_COOKIE_NAME)?.value)
}
