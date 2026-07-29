import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const performances = await prisma.studentPerformance.groupBy({
    by: ["subject"],
    where: { studentId: token.id },
    _avg: { score: true, maxScore: true },
  })

  const coverage = performances.map(p => ({
    name: p.subject,
    value: Math.round((p._avg.score! / p._avg.maxScore!) * 100),
  }))

  return NextResponse.json(coverage)
}