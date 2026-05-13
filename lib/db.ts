import { createClient } from "./supabase/client"
import type {
  AppNotification,
  AppUser,
  ClassInfo,
  Submission,
  Task,
  ActivityEvent,
} from "./types"

const supabase = () => createClient()

/* ---------- Classes ---------- */
export async function listClasses(): Promise<ClassInfo[]> {
  const { data, error } = await supabase()
    .from("classes")
    .select("*")
    .order("display_order")
  if (error) throw error
  return (data ?? []) as ClassInfo[]
}

/* ---------- Users ---------- */
export async function listStudentsByClass(classId: string): Promise<AppUser[]> {
  const { data, error } = await supabase()
    .from("app_users")
    .select("*")
    .eq("role", "student")
    .eq("class_id", classId)
    .order("display_order")
  if (error) throw error
  return (data ?? []) as AppUser[]
}

export async function listAllUsers(): Promise<AppUser[]> {
  const { data, error } = await supabase()
    .from("app_users")
    .select("*")
    .order("display_order")
  if (error) throw error
  return (data ?? []) as AppUser[]
}

export async function getUser(id: string): Promise<AppUser | null> {
  const { data } = await supabase().from("app_users").select("*").eq("id", id).single()
  return (data ?? null) as AppUser | null
}

/* ---------- Tasks ---------- */
export async function listTasksByTeacher(teacherId: string): Promise<Task[]> {
  const { data, error } = await supabase()
    .from("tasks")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Task[]
}

export async function listTasksForStudent(studentId: string): Promise<Task[]> {
  // First get student's class
  const user = await getUser(studentId)
  if (!user?.class_id) return []
  const { data, error } = await supabase()
    .from("tasks")
    .select("*")
    .contains("class_ids", [user.class_id])
    .eq("status", "active")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Task[]
}

export async function getTask(id: string): Promise<Task | null> {
  const { data } = await supabase().from("tasks").select("*").eq("id", id).single()
  return (data ?? null) as Task | null
}

export async function createTask(
  task: Omit<Task, "id" | "created_at" | "target_student_count" | "status"> & {
    status?: Task["status"]
  },
): Promise<Task> {
  // Calculate target_student_count
  const { data: students } = await supabase()
    .from("app_users")
    .select("id")
    .eq("role", "student")
    .in("class_id", task.class_ids)
  const targetCount = students?.length ?? 0

  const { data, error } = await supabase()
    .from("tasks")
    .insert({
      ...task,
      status: task.status ?? "active",
      target_student_count: targetCount,
    })
    .select()
    .single()
  if (error) throw error

  const created = data as Task

  // Fan-out notifications to all target students
  if (students && students.length > 0) {
    const notifications = students.map((s) => ({
      user_id: s.id,
      type: "new_homework" as const,
      title: `${task.teacher_name}布置了新作业`,
      content: `《${task.title}》· 截止 ${new Date(task.due_at).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
      related_task_id: created.id,
    }))
    await supabase().from("notifications").insert(notifications)
  }

  // Insert class activity
  for (const cid of task.class_ids) {
    await supabase().from("activities").insert({
      class_id: cid,
      type: "new_task",
      actor_id: task.teacher_id,
      actor_name: task.teacher_name,
      task_id: created.id,
      description: `${task.teacher_name}布置了新作业《${task.title}》`,
    })
  }

  return created
}

/* ---------- Submissions ---------- */
export async function listSubmissionsByTask(taskId: string): Promise<Submission[]> {
  const { data, error } = await supabase()
    .from("submissions")
    .select("*")
    .eq("task_id", taskId)
    .order("submitted_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Submission[]
}

export async function listSubmissionsByStudent(studentId: string): Promise<Submission[]> {
  const { data, error } = await supabase()
    .from("submissions")
    .select("*")
    .eq("student_id", studentId)
    .order("submitted_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as Submission[]
}

export async function getSubmissionByStudentTask(
  taskId: string,
  studentId: string,
): Promise<Submission | null> {
  const { data } = await supabase()
    .from("submissions")
    .select("*")
    .eq("task_id", taskId)
    .eq("student_id", studentId)
    .maybeSingle()
  return (data ?? null) as Submission | null
}

export async function getSubmission(id: string): Promise<Submission | null> {
  const { data } = await supabase().from("submissions").select("*").eq("id", id).single()
  return (data ?? null) as Submission | null
}

export async function createSubmission(input: {
  task_id: string
  student_id: string
  student_name: string
  class_id: string
  image_urls: string[]
  note: string | null
  teacher_id: string
  task_title: string
}): Promise<Submission> {
  const { data, error } = await supabase()
    .from("submissions")
    .insert({
      task_id: input.task_id,
      student_id: input.student_id,
      student_name: input.student_name,
      class_id: input.class_id,
      image_urls: input.image_urls,
      note: input.note,
      status: "submitted",
    })
    .select()
    .single()
  if (error) throw error
  const created = data as Submission

  // Notify teacher
  await supabase().from("notifications").insert({
    user_id: input.teacher_id,
    type: "submission_received",
    title: `${input.student_name}提交了作业`,
    content: `《${input.task_title}》· 共 ${input.image_urls.length} 张图片`,
    related_task_id: input.task_id,
    related_submission_id: created.id,
  })

  // Insert class activity
  await supabase().from("activities").insert({
    class_id: input.class_id,
    type: "submit",
    actor_id: input.student_id,
    actor_name: input.student_name,
    task_id: input.task_id,
    description: `${input.student_name}提交了《${input.task_title}》（${input.image_urls.length} 张图片）`,
  })

  return created
}

export async function updateSubmissionGrading(
  submissionId: string,
  payload: {
    score: number
    ai_comment: string
    teacher_comment: string
    ai_issues: any[]
    weak_points: any[]
    student_id: string
    student_name: string
    task_id: string
    task_title: string
    class_id: string
    teacher_name: string
  },
): Promise<Submission> {
  const { data, error } = await supabase()
    .from("submissions")
    .update({
      score: payload.score,
      ai_comment: payload.ai_comment,
      teacher_comment: payload.teacher_comment,
      ai_issues: payload.ai_issues,
      weak_points: payload.weak_points,
      status: "graded",
      graded_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .select()
    .single()
  if (error) throw error

  // Notify student
  await supabase().from("notifications").insert({
    user_id: payload.student_id,
    type: "graded",
    title: "作业批阅完成",
    content: `你的《${payload.task_title}》已批阅完成，得分 ${payload.score} 分`,
    related_task_id: payload.task_id,
    related_submission_id: submissionId,
  })

  // Activity feed
  await supabase().from("activities").insert({
    class_id: payload.class_id,
    type: "graded",
    actor_id: payload.student_id,
    actor_name: payload.teacher_name,
    target_name: payload.student_name,
    task_id: payload.task_id,
    description: `${payload.teacher_name}完成了对 ${payload.student_name} 的批阅，得分 ${payload.score}`,
  })

  return data as Submission
}

/* ---------- Notifications ---------- */
export async function listNotifications(userId: string, limit = 30): Promise<AppNotification[]> {
  const { data, error } = await supabase()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as AppNotification[]
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase()
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false)
}

export async function markNotificationRead(id: string): Promise<void> {
  await supabase().from("notifications").update({ read: true }).eq("id", id)
}

/* ---------- Reminders ---------- */
export async function sendReminders(input: {
  task_id: string
  task_title: string
  teacher_name: string
  teacher_id: string
  student_ids: string[]
  message?: string
}): Promise<number> {
  if (input.student_ids.length === 0) return 0
  const rows = input.student_ids.map((sid) => ({
    user_id: sid,
    type: "reminder" as const,
    title: `${input.teacher_name}催交作业`,
    content: input.message ?? `请尽快提交《${input.task_title}》，老师在等你哦~`,
    related_task_id: input.task_id,
    urgent: true,
  }))
  const { error } = await supabase().from("notifications").insert(rows)
  if (error) throw error

  // Activity log
  const { data: task } = await supabase().from("tasks").select("class_ids").eq("id", input.task_id).single()
  if (task?.class_ids?.[0]) {
    await supabase().from("activities").insert({
      class_id: task.class_ids[0],
      type: "reminder_sent",
      actor_id: input.teacher_id,
      actor_name: input.teacher_name,
      task_id: input.task_id,
      description: `${input.teacher_name}向 ${input.student_ids.length} 名学生发送了催交通知`,
    })
  }

  return rows.length
}

/* ---------- Activities ---------- */
export async function listActivitiesByClass(
  classId: string,
  limit = 20,
): Promise<ActivityEvent[]> {
  const { data, error } = await supabase()
    .from("activities")
    .select("*")
    .eq("class_id", classId)
    .order("created_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  return (data ?? []) as ActivityEvent[]
}
