import { type NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// Helper to check admin authorization
async function isAdmin(req: NextRequest) {
  const token = await getToken({ req })
  return token && token.role === "ADMIN"
}

// CREATE BATCH
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
  }

  try {
    const { name } = await req.json()
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Batch name is required" }, { status: 400 })
    }

    const newBatch = await prisma.batch.create({
      data: { name: name.trim() },
    })

    return NextResponse.json(newBatch, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// UPDATE BATCH
export async function PUT(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
  }

  try {
    const { id, name } = await req.json()
    if (!id || !name || name.trim() === "") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const updatedBatch = await prisma.batch.update({
      where: { id },
      data: { name: name.trim() },
    })

    return NextResponse.json(updatedBatch, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE BATCH
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: "Unauthorized access" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "Batch ID is required" }, { status: 400 })
    }

    await prisma.batch.delete({
      where: { id },
    })

    return NextResponse.json({ success: true, message: "Batch deleted successfully" }, { status: 200 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}