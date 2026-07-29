// app/student/performance/page.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-config"
import { StudentNavigation } from "@/components/student/navigation"
import { PerformanceCharts } from "@/components/student/performance-charts"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default async function PerformancePage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user?.role !== "STUDENT") {
    redirect("/login")
  }

  const studentId = session.user.id

  // 1. Fetch all quiz attempts for this student
  const attempts = await prisma.quizAttempt.findMany({
    where: { studentId: studentId },
    orderBy: { createdAt: 'asc' },
    include: {
      quiz: { select: { title: true } } 
    }
  })

  // 2. Calculate Overall Stats
  let totalScore = 0
  let totalMaxScore = 0
  const questionsSolved = attempts.length 
  
  attempts.forEach(attempt => {
    totalScore += attempt.score || 0
    totalMaxScore += attempt.totalScore || 100 
  })

  const overallAccuracy = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0

  // 3. Calculate Weekly Progress (Group by Day)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const weeklyMap = new Map()
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    weeklyMap.set(days[d.getDay()], { day: days[d.getDay()], correct: 0, total: 0 })
  }

  attempts.forEach(attempt => {
    const dayName = days[attempt.createdAt.getDay()]
    if (weeklyMap.has(dayName)) {
      const current = weeklyMap.get(dayName)
      current.correct += attempt.score || 0
      current.total += attempt.totalScore || 100
      weeklyMap.set(dayName, current)
    }
  })

  const weeklyProgressData = Array.from(weeklyMap.values())

  // 4. Generate Dynamic Radar Data & Recommendations
  const skillRadarData = [
    { skill: "Problem Solving", value: Math.min(100, overallAccuracy + 5) },
    { skill: "Conceptual Understanding", value: overallAccuracy },
    { skill: "Speed", value: 75 },
    { skill: "Accuracy", value: overallAccuracy },
    { skill: "Consistency", value: attempts.length > 5 ? 85 : 40 },
  ]

  // explicitly tell TypeScript the exact shape of this array
  type RecommendationItem = {
    type: "warning" | "success" | "info";
    title: string;
    message: string;
  };

  const recommendations: RecommendationItem[] = [];

  if (overallAccuracy < 70) {
    recommendations.push({
      type: "warning",
      title: "Focus on Core Concepts",
      message: `Your overall accuracy is ${overallAccuracy}%. Consider reviewing fundamental materials before taking more quizzes.`
    })
  } else {
    recommendations.push({
      type: "success",
      title: "Great Accuracy!",
      message: `You are maintaining a strong ${overallAccuracy}% accuracy rate. Keep up the good work.`
    })
  }
  
  if (attempts.length < 3) {
    recommendations.push({
      type: "info",
      title: "Take More Quizzes",
      message: "You need to complete more quizzes to generate better performance insights."
    })
  }

  return (
    <div className="min-h-screen bg-background">
      <StudentNavigation />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Performance Analytics</h2>
          <p className="text-muted-foreground">Track your learning progress and identify areas for improvement</p>
        </div>

        {/* Pass dynamic data to the client component */}
        <PerformanceCharts 
          overallAccuracy={overallAccuracy}
          questionsSolved={questionsSolved}
          weeklyProgressData={weeklyProgressData}
          skillRadarData={skillRadarData}
          recommendations={recommendations}
        />
      </div>
    </div>
  )
}