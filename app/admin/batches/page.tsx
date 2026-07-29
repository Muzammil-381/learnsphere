import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/lib/auth-config"
import { prisma } from "@/lib/db"
import { AdminHeader } from "@/components/admin/admin-header" 
import { BatchDashboard } from "@/components/admin/batch-dashboard"

export default async function AdminBatchesPage() {
  const session = await getServerSession(authOptions)

  // Explicit session checking security gate
  if (!session || session.user?.role !== "ADMIN") {
    redirect("/login")
  }

  // Fetch batches with an active count of non-deleted students enrolled
  const batches = await prisma.batch.findMany({
    include: {
      _count: {
        select: {
          users: {
            where: { role: "STUDENT", deletedAt: null },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  })

  return (
    <div className="min-h-screen bg-background">
      <AdminHeader name={session.user?.name} email={session.user?.email} />
      <div className="max-w-7xl mx-auto p-6">
        <BatchDashboard batches={batches} />
      </div>
    </div>
  )
}