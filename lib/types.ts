export type UserRole = "teacher" | "student"

export interface AppUser {
  id: string
  name: string
  role: UserRole
  class_id: string | null
  student_no: string | null
  avatar_color: string
  display_order: number
  created_at?: string
}

export interface ClassInfo {
  id: string
  name: string
  grade: string
  student_count: number
  display_order: number
}

export type TaskStatus = "draft" | "active" | "closed"

export interface Task {
  id: string
  title: string
  subject: string
  class_ids: string[]
  requirements: string
  notes: string | null
  due_at: string
  estimated_minutes: number
  teacher_id: string
  teacher_name: string
  status: TaskStatus
  target_student_count: number
  created_at: string
}

export type SubmissionStatus = "submitted" | "grading" | "graded"

export interface AIIssueAnnotation {
  id: string
  x: number
  y: number
  w: number
  h: number
  type: "error" | "warning"
  message: string
}

export interface WeakPoint {
  name: string
  myScore: number
  classAverage: number
  lostPoints: number
  reason: string
}

export interface Submission {
  id: string
  task_id: string
  student_id: string
  student_name: string
  class_id: string
  image_urls: string[]
  note: string | null
  status: SubmissionStatus
  score: number | null
  total_score: number
  ai_comment: string | null
  teacher_comment: string | null
  ai_issues: AIIssueAnnotation[]
  weak_points: WeakPoint[]
  submitted_at: string
  graded_at: string | null
}

export type NotificationType =
  | "new_homework"
  | "reminder"
  | "submission_received"
  | "graded"
  | "system"

export interface AppNotification {
  id: string
  user_id: string
  type: NotificationType
  title: string
  content: string
  related_task_id: string | null
  related_submission_id: string | null
  read: boolean
  urgent: boolean
  created_at: string
}

export type ActivityType =
  | "submit"
  | "view"
  | "graded"
  | "reminder_sent"
  | "new_task"
  | "late_warning"

export interface ActivityEvent {
  id: string
  class_id: string | null
  type: ActivityType
  actor_id: string | null
  actor_name: string | null
  target_id: string | null
  target_name: string | null
  task_id: string | null
  description: string
  metadata: Record<string, any>
  created_at: string
}
