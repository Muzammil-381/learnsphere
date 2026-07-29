import { type NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db" // Reverted back to your custom shared db instance

export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })

    if (!token?.id || token.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Run all database operations concurrently for optimal performance
    const [
      totalUsers,
      activeStudents,
      activeTeachers,
      activeAdmins,
      inactiveUsers,
      totalBatches
    ] = await Promise.all([
      // Get total users (not deleted)
      prisma.user.count({
        where: { deletedAt: null },
      }),

      // Get active students
      prisma.user.count({
        where: {
          role: "STUDENT",
          status: "ACTIVE",
          deletedAt: null,
        },
      }),

      // Get active teachers
      prisma.user.count({
        where: {
          role: "TEACHER",
          status: "ACTIVE",
          deletedAt: null,
        },
      }),

      // Get active admins
      prisma.user.count({
        where: {
          role: "ADMIN",
          status: "ACTIVE",
          deletedAt: null,
        },
      }),

      // Get inactive users
      prisma.user.count({
        where: {
          status: { in: ["INACTIVE", "SUSPENDED"] },
          deletedAt: null,
        },
      }),

      // Get total structural batches
      prisma.batch.count(),
    ])

    return NextResponse.json(
      {
        totalUsers,
        activeStudents,
        activeTeachers,
        activeAdmins,
        inactiveUsers,
        totalBatches, // Newly exposed field sent back to AnalyticsCards
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Get user stats error:", error)
    return NextResponse.json({ error: "Failed to fetch user statistics" }, { status: 500 })
  }
}