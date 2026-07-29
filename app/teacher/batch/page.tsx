// app/teacher/batch/page.tsx

import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-config"
import { TeacherNavigation } from "@/components/teacher/navigation"
import Batches from "@/components/teacher/batch"

export default async function TeacherBatchPage() {
  // 1. Protect the route: Check if user is logged in and is a TEACHER
  const session = await getServerSession(authOptions)

  if (!session || session.user?.role !== "TEACHER") {
    redirect("/login")
  }

  // 2. Render the standardized layout
  return (
    <div className="min-h-screen bg-background">
      <TeacherNavigation />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">My Batches</h2>
          <p className="text-muted-foreground">Manage your assigned batches and view student enrollments</p>
        </div>

        {/* Your server component that fetches the Prisma data */}
        <Batches />
      </div>
    </div>
  )
}