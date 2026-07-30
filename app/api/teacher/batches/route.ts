// app/api/teacher/batches/route.ts
import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-config"

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Basic security check
    const session = await getServerSession(authOptions)
    if (!session || session.user?.role !== "TEACHER") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    // Fetch all batches
    const batches = await prisma.batch.findMany({
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({ batches }, { status: 200 })
  } catch (error) {
    console.error("Get batches error:", error)
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 })
  }
}