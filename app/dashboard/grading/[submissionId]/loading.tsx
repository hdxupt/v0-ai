import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex h-screen">
      <Skeleton className="flex-1" />
      <Skeleton className="w-80 m-2 rounded-xl" />
    </div>
  )
}
