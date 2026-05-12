import { Wifi, Battery, Bell, Volume2 } from "lucide-react"
import { studentProfile } from "@/lib/mock-data"

export function DeviceStatusBar() {
  return (
    <div className="flex items-center justify-between px-4 h-8 bg-foreground text-background text-[11px]">
      <div className="flex items-center gap-3">
        <span className="font-medium tracking-wide">{studentProfile.device}</span>
        <span className="text-background/60">·</span>
        <span className="text-background/60">{studentProfile.className}</span>
      </div>
      <div className="flex items-center gap-3 tabular-nums">
        <span>21:48</span>
        <Volume2 className="w-3 h-3" />
        <Wifi className="w-3 h-3" />
        <div className="flex items-center gap-1">
          <Battery className="w-3.5 h-3.5" />
          <span>78%</span>
        </div>
        <div className="relative">
          <Bell className="w-3 h-3" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-destructive" />
        </div>
      </div>
    </div>
  )
}
