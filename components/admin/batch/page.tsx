import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-config"
import { StudentNavigation } from "@/components/student/navigation" // Replace with admin layout panel path if separate
import { BatchDashboard } from "@/components/admin/batch-dashboard"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export default async function AdminBatchPage() {
  const session = await getServerSession(authOptions)

  // Guard routing loop explicitly for administrators
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/login")
  }

  // Gather system data instantly via server engine query assembly
  const batches = await prisma.batch.findMany({
    include: {
      _count: {
        select: {
          users: {
            where: { role: "STUDENT" },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="min-h-screen bg-background">
      <StudentNavigation />
      <BatchDashboard batches={batches} />
    </div>
  )
}