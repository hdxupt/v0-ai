import { NextResponse } from "next/server"
import { createTask } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const task = await createTask(body)
    return NextResponse.json(task)
  } catch (err) {
    console.error("[v0] task create error", err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
