import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "希沃学习助手 — AI 智能学情",
    short_name: "希沃学习",
    description: "AI 智能伴学，作业、批阅、薄弱知识点一站式管理",
    start_url: "/student",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0f1e",
    theme_color: "#2563eb",
    icons: [
      {
        src: "/icon-192.jpg",
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any",
      },
      {
        src: "/icon-512.jpg",
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "any",
      },
    ],
    categories: ["education", "productivity"],
    lang: "zh-CN",
  }
}
