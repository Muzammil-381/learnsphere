// app/student/batch/page.tsx
import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-config"
import { StudentNavigation } from "@/components/student/navigation" // Update this path if needed
import { BatchRegistration } from "@/components/student/batch-registration"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default async function StudentBatchPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user?.role !== "STUDENT") {
    redirect("/login")
  }

  // 1. Fetch the student to see if they already have a batch
  const student = await prisma.user.findUnique({
    where: { email: session.user.email! },
    select: { batchId: true },
  })

  // 2. Fetch all available batches
  const batches = await prisma.batch.findMany({
    orderBy: { name: 'asc' },
  })

  return (
    <div className="min-h-screen bg-background">
      <StudentNavigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Batch Registration</h2>
          <p className="text-muted-foreground">
            Select and register for your academic batch to access relevant course materials and quizzes.
          </p>
        </div>

        {/* Client component handles the interactivity */}
        <BatchRegistration 
          batches={batches} 
          currentBatchId={student?.batchId || null} 
        />
      </div>
    </div>
  )
}