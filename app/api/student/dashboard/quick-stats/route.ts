export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"

export async function GET(req: NextRequest) {
  const token = await getToken({ req })
  if (!token?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const userId = token.id

  // 1. Questions Answered = total chat messages
  const chatCount = await prisma.chatHistory.count({ where: { userId } })

  // 2. Accuracy Rate = average score from quiz attempts
  const attempts = await prisma.quizAttempt.findMany({
    where: { studentId: userId },
    select: { score: true, totalScore: true },
  })
  let accuracyRate = 0
  if (attempts.length) {
    const totalPercent = attempts.reduce((sum, a) => sum + (a.score / a.totalScore) * 100, 0)
    accuracyRate = Math.round(totalPercent / attempts.length)
  }

  // 3. Study Streak – consecutive days with any activity (chat or quiz)
  const activities = await prisma.$queryRaw<{ date: Date }[]>`
    SELECT DISTINCT DATE("createdAt") as date
    FROM (
      SELECT "createdAt" FROM "ChatHistory" WHERE "userId" = ${userId}
      UNION
      SELECT "createdAt" FROM "QuizAttempt" WHERE "studentId" = ${userId}
    ) AS activities
    ORDER BY date DESC
  `
  let streak = 0
  const today = new Date()
  today.setHours(0,0,0,0)
  for (let i = 0; i < activities.length; i++) {
    const activityDate = new Date(activities[i].date)
    activityDate.setHours(0,0,0,0)
    const expectedDate = new Date(today)
    expectedDate.setDate(today.getDate() - i)
    if (activityDate.getTime() === expectedDate.getTime()) streak++
    else break
  }

  // 4. Topics Mastered = subjects where average score > 80%
  const masteredSubjects = await prisma.studentPerformance.groupBy({
    by: ["subject"],
    where: { studentId: userId },
    _avg: { score: true, maxScore: true },
    having: { score: { _avg: { gt: 80 } } },
  })

  return NextResponse.json({
    questionsAnswered: chatCount,
    accuracyRate,
    studyStreak: streak,
    topicsMastered: masteredSubjects.length,
  })
}
