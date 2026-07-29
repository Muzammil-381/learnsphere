"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { Loader2 } from "lucide-react"

// Types for the real data
interface CourseCoverage {
  name: string      // subject/topic name
  value: number     // percentage (0-100)
}

interface QuickStats {
  questionsAnswered: number
  accuracyRate: number
  studyStreak: number
  topicsMastered: number
}

export function DashboardWidgets() {
  const [mockTestScores, setMockTestScores] = useState<any[]>([])
  const [courseCoverage, setCourseCoverage] = useState<CourseCoverage[]>([])
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Fetch all three endpoints in parallel
        const [scoresRes, coverageRes, statsRes] = await Promise.all([
          fetch("/api/student/dashboard/mock-scores"),
          fetch("/api/student/dashboard/course-coverage"),
          fetch("/api/student/dashboard/quick-stats")
        ])

        const scoresData = scoresRes.ok ? await scoresRes.json() : []
        const coverageData = coverageRes.ok ? await coverageRes.json() : []
        const statsData = statsRes.ok ? await statsRes.json() : null

        setMockTestScores(scoresData)
        setCourseCoverage(coverageData)
        setQuickStats(statsData)
      } catch (error) {
        console.error("Failed to load dashboard data", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-32 bg-muted animate-pulse rounded" />
              <div className="h-4 w-48 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* --- Course Coverage Widget (REAL DATA) --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Course Coverage</CardTitle>
          <CardDescription>Progress across subjects</CardDescription>
        </CardHeader>
        <CardContent>
          {courseCoverage.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={courseCoverage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="value" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No subject performance data yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Mock Test Scores Widget (REAL DATA) --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mock Test Scores</CardTitle>
          <CardDescription>Performance trend (Last 10 Quizzes)</CardDescription>
        </CardHeader>
        <CardContent>
          {mockTestScores.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockTestScores}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }} 
                  interval={0} 
                  angle={-15} 
                  textAnchor="end" 
                  height={60}
                />
                <YAxis domain={[0, 100]} />
                <Tooltip formatter={(value: number) => [`${value}%`, "Score"]} />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No quiz attempts found yet.
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Quick Stats Widget (REAL DATA) --- */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Stats</CardTitle>
          <CardDescription>Your learning metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {quickStats ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Questions Answered</span>
                <span className="text-2xl font-bold">{quickStats.questionsAnswered}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Accuracy Rate</span>
                <span className="text-2xl font-bold">{quickStats.accuracyRate}%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Study Streak</span>
                <span className="text-2xl font-bold">{quickStats.studyStreak} days</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">Topics Mastered</span>
                <span className="text-2xl font-bold">{quickStats.topicsMastered}</span>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No stats available.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Optional: Topic Weaknesses Widget (can be added later with real data) */}
    </div>
  )
}