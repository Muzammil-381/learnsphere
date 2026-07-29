"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScatterChart, Scatter, ZAxis, Cell } from "recharts";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
} from "recharts";
import { Loader2 } from "lucide-react";

interface Recommendation {
  type: "warning" | "success" | "info";
  title: string;
  message: string;
}

interface PerformanceChartsProps {
  overallAccuracy: number;
  questionsSolved: number;
  weeklyProgressData: { day: string; correct: number; total: number }[];
  skillRadarData: { skill: string; value: number }[];
  recommendations: Recommendation[];
  studentId?: string
}

export function PerformanceCharts({
  overallAccuracy,
  questionsSolved,
  weeklyProgressData,
  skillRadarData,
  recommendations,
  studentId, // <-- Just add this right here!
}: PerformanceChartsProps) {
  // 1. Add state to hold the Q&A Tutor data
  const [topicFocusData, setTopicFocusData] = useState<any[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(true);

  // 2. Fetch the Tutor Performance data on component mount
  // Find this useEffect in performance-charts.tsx
  useEffect(() => {
    async function fetchPerformance() {
      try {
        // DYNAMIC URL: Use Teacher API if studentId exists, else use Student API
        const fetchUrl = studentId 
          ? `/api/teacher/students/${studentId}/diagnostics` 
          : "/api/student/performance"

        const res = await fetch(fetchUrl)
        if (res.ok) {
          const json = await res.json()
          setTopicFocusData(json)
        }
      } catch (err) {
        console.error("Failed to fetch performance data", err)
      } finally {
        setLoadingTopics(false)
      }
    }
    fetchPerformance()
  }, [studentId]) // <-- Don't forget to add studentId to the dependency array []);

  return (
    <>
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{overallAccuracy}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on all attempts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quizzes Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{questionsSolved}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total submitted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Study Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">Active</div>
            <p className="text-xs text-muted-foreground mt-1">Keep it up!</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Topics Mastered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {overallAccuracy > 80 ? "High" : "Learning"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current proficiency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Weekly Progress */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Progress</CardTitle>
            <CardDescription>Daily performance this week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyProgressData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="correct"
                  stroke="#10b981"
                  name="Score Achieved"
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="#ef4444"
                  name="Max Possible"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Skill Assessment */}
        <Card>
          <CardHeader>
            <CardTitle>Skill Assessment</CardTitle>
            <CardDescription>
              Your competency across different skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={skillRadarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="skill" />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar
                  name="Skill Level"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* TEACHER DIAGNOSTIC PANEL */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>AI Diagnostic: Struggle vs. Engagement</CardTitle>
            <CardDescription>
              Evaluated by LLaMA based on student question phrasing. 
              <span className="text-red-500 font-medium ml-1">Top-Right indicates critical intervention needed.</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTopics ? (
              <div className="flex h-[300px] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : topicFocusData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                Not enough chat data to generate a diagnostic profile.
              </div>
            ) : (
              <div className="flex flex-col md:flex-row gap-6">
                
                {/* Quadrant Chart */}
                <div className="h-[300px] flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                      <XAxis 
                        type="number" 
                        dataKey="engagement" 
                        name="Questions Asked" 
                        label={{ value: "Engagement (Count)", position: "bottom", offset: 0 }} 
                      />
                      <YAxis 
                        type="number" 
                        dataKey="struggleLevel" 
                        name="Confusion Level" 
                        domain={[1, 5]} 
                        label={{ value: "Struggle Score (1-5)", angle: -90, position: "left" }} 
                      />
                      <ZAxis type="category" dataKey="subject" name="Topic" />
                      <Tooltip 
                        cursor={{ strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-background border p-3 rounded-lg shadow-lg">
                                <p className="font-bold">{data.subject}</p>
                                <p className="text-sm">Struggle Score: {data.struggleLevel}/5</p>
                                <p className="text-sm">Questions Asked: {data.engagement}</p>
                                <p className={`text-xs mt-1 font-semibold`} style={{ color: data.color }}>
                                  Action: {data.status}
                                </p>
                              </div>
                            )
                          }
                          return null;
                        }}
                      />
                      <Scatter data={topicFocusData}>
                        {topicFocusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>

                {/* Teacher Action Items List */}
                <div className="w-full md:w-1/3 flex flex-col gap-3 overflow-y-auto max-h-[300px]">
                  <h4 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-2">
                    Suggested Interventions
                  </h4>
                  {topicFocusData.map((topic, i) => (
                    <div key={i} className="flex items-start justify-between p-3 border rounded-md" style={{ borderLeftColor: topic.color, borderLeftWidth: '4px' }}>
                      <div>
                        <p className="font-semibold text-sm">{topic.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {topic.status === "Critical Struggle" ? "Assign targeted practice." : 
                           topic.status === "Needs Review" ? "Review concepts in next class." : 
                           "Student is understanding well."}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold" style={{ color: topic.color }}>{topic.struggleLevel}</p>
                        <p className="text-[10px] text-muted-foreground">AVG SCORE</p>
                      </div>
                    </div>
                  ))}
                </div>

              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recommendations</CardTitle>
          <CardDescription>
            Areas to focus on based on your recent activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Complete more quizzes to get personalized recommendations.
              </p>
            )}

            {recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-3 border rounded-lg ${
                  rec.type === "warning"
                    ? "bg-yellow-50 border-yellow-200"
                    : rec.type === "success"
                      ? "bg-green-50 border-green-200"
                      : "bg-blue-50 border-blue-200"
                }`}
              >
                <p
                  className={`font-semibold text-sm ${
                    rec.type === "warning"
                      ? "text-yellow-900"
                      : rec.type === "success"
                        ? "text-green-900"
                        : "text-blue-900"
                  }`}
                >
                  {rec.title}
                </p>
                <p
                  className={`text-xs mt-1 ${
                    rec.type === "warning"
                      ? "text-yellow-800"
                      : rec.type === "success"
                        ? "text-green-800"
                        : "text-blue-800"
                  }`}
                >
                  {rec.message}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
