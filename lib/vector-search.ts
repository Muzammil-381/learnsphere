import { prisma } from "@/lib/db"
import { generateEmbedding, cosineSimilarity } from "@/lib/embeddings"

interface SearchResult {
  content: string
  noteId: string
  title: string
  similarity: number
}

// Search for relevant note content using vector similarity
// Search for relevant note content using vector similarity
export async function searchRelevantNotes(
  query: string,
  studentId: string,
  limit: number = 5
): Promise<SearchResult[]> {
  try {
    // Get all notes accessible to the student
    const notes = await prisma.studentNote.findMany({
      where: {
        studentId: studentId,
      },
      include: {
        embeddings: true,
      },
    })

    console.log(`Found ${notes.length} notes for student ${studentId}`)

    if (notes.length === 0) {
      return []
    }

    const totalEmbeddings = notes.reduce((sum, note) => sum + note.embeddings.length, 0)
    let vectorResults: SearchResult[] = []
    
    // 1. TRY VECTOR SEARCH FIRST
    if (totalEmbeddings > 0) {
      try {
        let queryEmbedding = await generateEmbedding(query)
        const rawResults: SearchResult[] = []

        for (const note of notes) {
          for (const embedding of note.embeddings) {
            let embeddingVector: number[] = []
            if (Array.isArray(embedding.embedding)) {
              embeddingVector = embedding.embedding as number[]
            } else if (typeof embedding.embedding === 'object' && embedding.embedding !== null) {
              embeddingVector = Object.values(embedding.embedding) as number[]
            }
            
            if (Array.isArray(embeddingVector) && embeddingVector.length > 0) {
              rawResults.push({
                content: embedding.content,
                noteId: note.id,
                title: note.title,
                similarity: cosineSimilarity(queryEmbedding, embeddingVector),
              })
            }
          }
        }

        // Sort and Filter Vector Results
        rawResults.sort((a, b) => b.similarity - a.similarity)
        
        // Lower threshold to catch more potential vector matches
        const MINIMUM_SIMILARITY = 0.30; 
        
        vectorResults = rawResults
          .filter((r) => r.similarity >= MINIMUM_SIMILARITY)
          .slice(0, limit);

        console.log(`Vector search found ${vectorResults.length} valid results`);

        // IF VECTOR SEARCH SUCCEEDED, RETURN IT. OTHERWISE, LET IT FALLBACK TO TEXT SEARCH.
        if (vectorResults.length > 0) {
          return vectorResults;
        } else {
          console.log("Vector search returned 0 results above threshold. Falling back to text search...");
        }

      } catch (embeddingError) {
        console.error("Error in vector search, falling back to text search:", embeddingError)
      }
    }

    // 2. FALLBACK TEXT SEARCH (Now includes extractedText from PDFs!)
    const queryLower = query.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2)
    const textResults: SearchResult[] = []

    for (const note of notes) {
      let score = 0
      let bestContent = ""
      
      const titleLower = note.title.toLowerCase()
      if (titleLower.includes(queryLower)) score += 0.4
      
      // Check standard content
      if (note.content) {
        const contentLower = note.content.toLowerCase()
        if (contentLower.includes(queryLower)) {
          score += 0.5
          bestContent = note.content
        }
      }

      // CRITICAL FIX: Check the extracted PDF text!
      if (note.extractedText) {
        const extractedLower = note.extractedText.toLowerCase()
        if (extractedLower.includes(queryLower)) {
          score += 0.6 // High score for exact phrase match in the PDF
          bestContent = "Match found inside document text."
        } else {
          // Check for partial word matches in PDF
          const wordMatches = queryWords.filter(word => extractedLower.includes(word)).length
          if (wordMatches > 0) {
            score += (wordMatches / queryWords.length) * 0.4
            bestContent = "Partial match found inside document text."
          }
        }
      }
      
      // Check embeddings chunks content
      for (const embedding of note.embeddings) {
        const embeddingLower = embedding.content.toLowerCase()
        if (embeddingLower.includes(queryLower)) {
          score += 0.5
          bestContent = embedding.content
          break
        }
      }

      if (score > 0) {
        textResults.push({
          content: bestContent || note.content || note.title,
          noteId: note.id,
          title: note.title,
          similarity: Math.min(score, 1.0),
        })
      }
    }

    // Sort text results and return
    textResults.sort((a, b) => b.similarity - a.similarity)
    console.log(`Text search fallback found ${textResults.length} results`)
    
    return textResults.slice(0, limit)

  } catch (error) {
    console.error("Error searching notes:", error)
    return []
  }
}

// Get all note content for a student (for context)
export async function getAllNoteContent(studentId: string): Promise<string> {
  try {
    const notes = await prisma.studentNote.findMany({
      where: {
        studentId: studentId,
      },
      select: {
        title: true,
        content: true,
      },
    })

    return notes
      .map((note) => `Title: ${note.title}\nContent: ${note.content || ""}`)
      .join("\n\n---\n\n")
  } catch (error) {
    console.error("Error getting note content:", error)
    return ""
  }
}

