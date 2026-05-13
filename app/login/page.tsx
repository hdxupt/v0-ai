import { LoginCard } from "./login-card"
import { listAllUsers } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function LoginPage() {
  const users = await listAllUsers()
  // Pick first 2 teachers + first 2 students for demo
  const teachers = users.filter((u) => u.role === "teacher").slice(0, 2)
  const students = users.filter((u) => u.role === "student").slice(0, 2)
  return <LoginCard teachers={teachers} students={students} />
}
