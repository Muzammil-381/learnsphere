import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"
import { searchRelevantNotes } from "@/lib/vector-search" // Your existing RAG search utility

export async function GET(req: NextRequest) {
  try {
    const token = await getToken({ req })
    const { searchParams } = new URL(req.url)
    const query = searchParams.get("query")

    if (!token || token.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let notes;

    if (query && query.trim() !== "") {
      // 1. Perform RAG Vector Search
      const searchResults = await searchRelevantNotes(query, token.id as string, 15);
      
      // 2. NEW FIX: Filter out weak matches. 
      // Adjust the 0.25 (or 0.70 depending on your vector DB math) until it feels strict enough.
      const strongMatches = searchResults.filter(res => res.similarity > 0.25);
      
      const noteIds = strongMatches.map(res => res.noteId);

      // If no strong matches survived the filter, return an empty array early
      if (noteIds.length === 0) {
        return NextResponse.json({ notes: [] })
      }

      // 3. Fetch full note details for the strong IDs
      notes = await prisma.studentNote.findMany({
        where: {
          id: { in: noteIds },
          studentId: token.id as string,
        }
      });

      // Sort results by the similarity order
      notes = notes.sort((a, b) => noteIds.indexOf(a.id) - noteIds.indexOf(b.id));
    } else {
      // Default: Fetch all notes newest first
      notes = await prisma.studentNote.findMany({
        where: { studentId: token.id as string },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ notes })
  } catch (error) {
    console.error("Search error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}