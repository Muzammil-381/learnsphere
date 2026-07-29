import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = await getToken({ req: request })
    // Ensure the user is a logged-in Teacher
    if (!token?.id || token.role !== "TEACHER") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const studentId = params.id

    // Fetch history specifically for this student
    const history = await prisma.chatHistory.findMany({
      where: { userId: studentId },
      select: { topic: true, mode: true, struggleScore: true }
    })

    const topicStats: Record<string, { count: number, totalStruggle: number, isPriority: boolean }> = {}
    
    history.forEach(chat => {
      const t = chat.topic
      if (t === "General") return 
      
      if (!topicStats[t]) topicStats[t] = { count: 0, totalStruggle: 0, isPriority: false }
      
      topicStats[t].count += 1
      topicStats[t].totalStruggle += chat.struggleScore
      if (chat.mode === "PAPER_PREDICTION") topicStats[t].isPriority = true
    })

    const diagnosticData = Object.entries(topicStats).map(([subject, stats]) => {
      const avgStruggle = parseFloat((stats.totalStruggle / stats.count).toFixed(1))
      
      let status = "Mastering"
      let color = "#10b981"
      if (avgStruggle >= 3.5) {
        status = "Critical Struggle"
        color = "#ef4444"
      } else if (avgStruggle >= 2.5 || stats.isPriority) {
        status = "Needs Review"
        color = "#f59e0b"
      }

      return { subject, engagement: stats.count, struggleLevel: avgStruggle, status, color }
    }).sort((a, b) => b.struggleLevel - a.struggleLevel)

    return NextResponse.json(diagnosticData)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}