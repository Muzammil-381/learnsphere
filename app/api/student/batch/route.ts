// app/api/student/batch/route.ts
import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { authOptions } from "@/lib/auth-config"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    // Ensure the user is logged in and is a student
    if (!session?.user?.email || session.user.role !== "STUDENT") {
      return new NextResponse("Unauthorized", { status: 401 })
    }

    const body = await req.json()
    const { batchId } = body

    if (!batchId) {
      return new NextResponse("Batch ID is required", { status: 400 })
    }

    // Update the user's batch in the database using their email
    await prisma.user.update({
      where: {
        email: session.user.email,
      },
      data: {
        batchId: batchId,
      },
    })

    return NextResponse.json({ message: "Successfully registered for batch" })
  } catch (error) {
    console.error("[BATCH_REGISTRATION_ERROR]", error)
    return new NextResponse("Internal Error", { status: 500 })
  }
}