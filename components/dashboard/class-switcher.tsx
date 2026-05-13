"use client"

import { ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ClassInfo } from "@/lib/types"

export function ClassSwitcher({
  classes,
  value,
  onChange,
}: {
  classes: ClassInfo[]
  value: string
  onChange: (id: string) => void
}) {
  const current = classes.find((c) => c.id === value) ?? classes[0]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-1.5 bg-card">
          <span className="text-muted-foreground text-xs">当前班级:</span>
          <span className="font-medium">{current?.name}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>切换班级</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {classes.map((c) => (
            <DropdownMenuRadioItem key={c.id} value={c.id}>
              <div className="flex items-center justify-between w-full">
                <span>{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.student_count} 人</span>
              </div>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
