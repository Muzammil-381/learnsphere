export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const history = await prisma.chatHistory.findMany({
      where: { userId: token.id as string },
      select: { topic: true, mode: true, struggleScore: true }
    })

    const topicStats: Record<string, { count: number, totalStruggle: number, isPriority: boolean }> = {}
    
    history.forEach(chat => {
      const t = chat.topic
      if (t === "General") return 
      
      if (!topicStats[t]) topicStats[t] = { count: 0, totalStruggle: 0, isPriority: false }
      
      topicStats[t].count += 1
      topicStats[t].totalStruggle += chat.struggleScore
      
      // If they ask for a paper prediction on this, flag it as a priority study area
      if (chat.mode === "PAPER_PREDICTION") topicStats[t].isPriority = true
    })

    const diagnosticData = Object.entries(topicStats).map(([subject, stats]) => {
      const avgStruggle = parseFloat((stats.totalStruggle / stats.count).toFixed(1))
      
      // Determine the Teacher Action
      let status = "Mastering"
      let color = "#10b981" // Green
      if (avgStruggle >= 3.5) {
        status = "Critical Struggle"
        color = "#ef4444" // Red
      } else if (avgStruggle >= 2.5 || stats.isPriority) {
        status = "Needs Review"
        color = "#f59e0b" // Yellow
      }

      return { 
        subject, 
        engagement: stats.count, // How often they ask
        struggleLevel: avgStruggle, // How confused they are
        status,
        color
      }
    }).sort((a, b) => b.struggleLevel - a.struggleLevel)

    return NextResponse.json(diagnosticData)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
