import { redirect } from "next/navigation"
import { getCurrentTeacher } from "@/lib/auth-server"
import { LabelWorkspace } from "@/components/label/label-workspace"

export const metadata = {
  title: "训练数据标注 · SeWise",
  description: "逐条确认题块判定，产出模型微调所需的金标准数据集",
}

export default async function LabelPage() {
  const teacher = await getCurrentTeacher()
  if (!teacher) redirect("/login")
  return <LabelWorkspace />
}
