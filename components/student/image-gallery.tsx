"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { toFileSrc } from "@/lib/blob-url"

export function ImageGallery({ pathnames }: { pathnames: string[] }) {
  const [active, setActive] = useState<string | null>(null)

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {pathnames.map((p, idx) => (
          <button
            key={p}
            type="button"
            onClick={() => setActive(p)}
            className="relative aspect-square overflow-hidden rounded-lg border bg-muted group"
          >
            <img
              src={toFileSrc(p)}
              alt={`第 ${idx + 1} 张`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
            <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-foreground/70 text-background text-[10px] font-medium flex items-center justify-center">
              {idx + 1}
            </div>
          </button>
        ))}
      </div>

      {active ? (
        <div
          className="fixed inset-0 z-50 bg-foreground/90 flex items-center justify-center p-4"
          onClick={() => setActive(null)}
        >
          <button
            onClick={() => setActive(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-background/20 text-background flex items-center justify-center hover:bg-background/30"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={toFileSrc(active)}
            alt="预览"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      ) : null}
    </>
  )
}
