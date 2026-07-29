"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingUp } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { StudentPerformanceForm } from "./student-performance-form"
import { PerformanceCharts } from "@/components/student/performance-charts"

interface Student {
  id: string
  name: string
  email: string
  createdAt: string
}

interface Performance {
  id: string
  subject: string
  score: number
  maxScore: number
  grade: string | null
  notes: string | null
  createdAt: string
}
function TeacherAnalyticsWrapper({ studentId }: { studentId: string }) {
  // In a real app, you would fetch these stats from another Teacher API endpoint based on the studentId.
  // For now, we are passing fallback/placeholder data for the standard charts, 
  // while the LLaMA Diagnostic chart will securely fetch real data using the studentId.
  
  return (
    <div className="mt-4">
      <PerformanceCharts 
        studentId={studentId} // This triggers the real LLaMA fetch!
        overallAccuracy={85} 
        questionsSolved={42}
        weeklyProgressData={[
          { day: "Mon", correct: 8, total: 10 },
          { day: "Tue", correct: 6, total: 10 },
          { day: "Wed", correct: 9, total: 10 },
        ]}
        skillRadarData={[
          { skill: "Problem Solving", value: 80 },
          { skill: "Theory", value: 65 },
          { skill: "Math", value: 90 }
        ]}
        recommendations={[
          { type: "warning", title: "Focus Needed", message: "Review Theory concepts." }
        ]}
      />
    </div>
  )
}
export function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [performances, setPerformances] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/teacher/students")
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students)
      }
    } catch (error) {
      console.error("Failed to fetch students:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudentPerformance = async (studentId: string) => {
    try {
      const response = await fetch(`/api/teacher/students/${studentId}/performance`)
      if (response.ok) {
        const data = await response.json()
        setPerformances(data.performances)
      }
    } catch (error) {
      console.error("Failed to fetch performance:", error)
    }
  }

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>All Students</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Search students by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  
                  {/* === UPDATED: CLICKABLE NAME COLUMN === */}
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="font-medium text-left text-primary hover:underline hover:text-blue-600 transition-colors">
                          {student.name}
                        </button>
                      </DialogTrigger>
                      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>{student.name}'s Analytics Dashboard</DialogTitle>
                          <DialogDescription>Review complete diagnostic data and study progress.</DialogDescription>
                        </DialogHeader>
                        
                        {/* Render the charts wrapper for this specific student */}
                        <TeacherAnalyticsWrapper studentId={student.id} />
                        
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                  
                  <TableCell>{student.email}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-2 justify-end">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedStudent(student)
                              fetchStudentPerformance(student.id)
                            }}
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Grades
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Grades - {student.name}</DialogTitle>
                            <DialogDescription>Manage manual grades and performance scores.</DialogDescription>
                          </DialogHeader>
                          <StudentPerformanceForm
                            studentId={student.id}
                            studentName={student.name}
                            performances={performances}
                            onSuccess={() => fetchStudentPerformance(student.id)}
                          />
                        </DialogContent>
                      </Dialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}