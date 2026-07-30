export const dynamic = 'force-dynamic';
import { type NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"
import { prisma } from "@/lib/db"
import { searchRelevantNotes } from "@/lib/vector-search"
import { extractTextFromPDF } from "@/lib/embeddings"
import { readFile } from "fs/promises"
import { join } from "path"
import Groq from "groq-sdk"
import { ExplanationMode } from "@prisma/client"

const groq = new Groq() 

// --- HELPER: CLEAN CONTENT EXTRACTION --- First check if the note has extractedText, else try to read from file(PDF OR txt files) if needed
// --- HELPER: CLEAN CONTENT EXTRACTION ---
async function extractNoteContent(note: any): Promise<string> {
  if (note.extractedText && note.extractedText.trim().length > 0) {
    return note.extractedText.trim()
  }
  
  let fullContent = note.title
  if (note.content && note.content.trim().length > 0) {
    fullContent += `\n\n${note.content}`
  }
  
  if ((!note.content || note.content.trim().length < 50) && note.fileUrl && note.fileName) {
    try {
      const filePath = join(process.cwd(), "public", note.fileUrl.replace(/^\//, ""))
      const fileExtension = note.fileName.split(".").pop()?.toLowerCase() || ""
      
      if (fileExtension === "pdf" || note.fileType === "PDF") {
        const pdfText = await extractTextFromPDF(filePath)
        if (pdfText) fullContent += `\n\n${pdfText}`
      } else if (["txt", "md"].includes(fileExtension)) {
        const textContent = await readFile(filePath, "utf-8")
        if (textContent) fullContent += `\n\n${textContent}`
      }
    } catch (e) { console.error("File read error", e) }
  }
  return fullContent.trim()
}


// --- HELPER: CLEAN ANSWER GENERATION --- HINT ONLY, SHORT, DETAILED
// --- HELPER: CLEAN ANSWER GENERATION ---
function generateAnswerFromContext(context: string, question: string, mode: string): string {
  const query = question.toLowerCase().trim();

  // Handle Greetings
  const greetings = ["hello", "hi", "hey", "asalam o alaikum", "greetings"];
  if (greetings.includes(query)) {
    return "Hey! I'm your LearnSphere tutor. How may I help you with your course today?";
  }

  const fallbackMessage = "This question isn't related to our course. Please ask something about the curriculum!";
  if (!context || context.trim().length === 0) return fallbackMessage;

  const cleanContext = context
    .replace(/\[Source \d+\]/gi, "")
    .replace(/Relevance: \d+\.?\d*%/gi, "")
    .replace(/Title:.*|Content:.*|PDF Content:.*/gi, "")
    .trim();

  const stopWords = new Set(['the', 'is', 'a', 'what', 'how', 'of', 'and', 'to']);
  const keywords = query.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
  
  // FIX: Split by punctuation OR new lines to separate headings from sentences
  const sentences = cleanContext
    .split(/[.!?\n]+/) 
    .map(s => s.trim())
    .filter(s => s.length > 20); // Increased threshold to skip short titles/headings

  const scored = sentences.map(s => {
    let score = 0;
    keywords.forEach(kw => { if (s.toLowerCase().includes(kw)) score += 2 });
    if (s.toLowerCase().includes(query)) score += 5;
    
    // PENALTY: Reduce score for very short sentences (likely headings)
    if (s.length < 40) score -= 3; 
    
    return { s, score };
  }).sort((a, b) => b.score - a.score);

  if (mode === "PAPER_PREDICTION") {
    // Take the top 3 to 4 distinct sentences to formulate questions
    const uniqueResults = Array.from(new Set(scored.filter(x => x.score > -5).map(x => x.s))).slice(0, 4);
    
    if (uniqueResults.length === 0) return fallbackMessage;

    const questionStarters = [
      "Explain in detail:", 
      "Discuss the significance of the following:", 
      "Critically analyze this concept:", 
      "Describe the process involving:"
    ];
    
    let prediction = "Based on my analysis of your notes and the topic you provided, here are the most probable questions for your upcoming paper:\n\n";
    
    uniqueResults.forEach((sentence, index) => {
      const starter = questionStarters[index % questionStarters.length];
      prediction += `Q${index + 1}: ${starter}\n"${sentence}..."\n\n`;
    });
    
    return prediction.trim();
  }

  const count = mode === "SHORT" ? 2 : mode === "HINT_ONLY" ? 1 : 6;
  const results = scored.filter(x => x.score > 0).slice(0, count).map(x => x.s);

  if (results.length === 0) return fallbackMessage;

  if (mode === "HINT_ONLY") {
    // We use the top result but ensure it's a descriptive sentence
    return ` ${keywords.join(", ")}. It relates to: ${results[0]}...`;
  }

  return results.join(". ") + ".";
}
// --- MAIN POST HANDLER ---
export async function POST(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { question, mode } = await request.json()
    
    // 1. Vector Search
    const relevantNotes = await searchRelevantNotes(question, token.id as string, 5)
    
    const sourceNotes: any[] = []
    const contextParts = await Promise.all(
      relevantNotes.filter(n => n.similarity > 0.25).map(async (note) => {
        const fullNote = await prisma.studentNote.findUnique({ where: { id: note.noteId } })
        if (fullNote) {
          if (!sourceNotes.find(s => s.id === fullNote.id)) {
            sourceNotes.push({ id: fullNote.id, title: fullNote.title, fileUrl: fullNote.fileUrl })
          }
          return await extractNoteContent(fullNote)
        }
        return ""
      })
    )

    const rawContext = contextParts.join("\n\n")
    const trimmedContext = rawContext.trim();
    if (trimmedContext.length < 50 && relevantNotes.filter(n => n.similarity > 0.25).length === 0) {
      const apologyAnswer = "I apologize, This Question is not part of content.";
      const chatHistory = await prisma.chatHistory.create({
        data: {
          userId: token.id as string,
          question,
          mode: mode as any,
          answer: apologyAnswer,
          topic: "General",
          struggleScore: 5,
        },
      });
      return NextResponse.json({ ...chatHistory, sourceNotes: [] }, { status: 200 });
    }

    // 2. LLaMA Dynamic Academic Prompt
    // 2. LLaMA Dynamic Academic Prompt
    const systemPrompt = `
You are a strict academic tutor. You MUST answer ONLY using the provided context.
NEVER use your own knowledge. If the context does not contain the answer, you MUST say exactly:
"I apologize, This Question is not part of content."

CURRENT MODE: ${mode}
GREETING HANDLING:
- If the student's message is only a greeting (e.g., "hi", "hello", "hey", "salam", "assalamualaikum", "good morning", "good afternoon", "good evening", "how are you", or similar greetings), respond politely with a greeting and ask how you can help.
- For greetings, do NOT require academic context.
- Example response:
{
  "answer": "Hello! How may I help you today?",
  "topic": "Greeting",
  "struggle_score": 1
}

CRITICAL EXECUTION RULES BASED ON THE CURRENT MODE:
- If MODE is "SHORT": Provide a concise, direct answer in exactly 1 to 2 sentences max. Get straight to the point.
- If MODE is "DETAILED": Provide an in-depth, comprehensive academic explanation. Break it down into logical paragraphs or bullet points if helpful.
- If MODE is "HINT_ONLY": Do not give the direct answer. Instead, identify the key terms from their question and guide them toward the relevant area in their notes with a helpful clue or guiding question.
- If MODE is "PAPER_PREDICTION": Formulate 2 to 3 likely exam questions based strictly on the provided context that match the student's query.
CRITICAL GUARDRAIL:
- If the provided context is empty, blank, or does not contain any relevant information to answer the student's question, you MUST return the exact phrase "I apologize, This Question is not part of content." inside the "answer" field of your JSON response. Do not use your own pre-trained knowledge to answer out-of-context questions.
- Greetings are the ONLY exception to this rule.
DIAGNOSTIC TASK:
Analyze the phrasing of the student's question to determine their comprehension level.
- Score 1-2: Confident, curious, asking advanced or theoretical questions.
- Score 3: Standard clarification.
- Score 4-5: Confused, frustrated, asking for extremely basic definitions they should already know, or explicitly stating they don't understand.

OUTPUT FORMAT:
You must return a JSON object with three keys:
{
  "answer": "Your formatted response string here conforming strictly to the CURRENT MODE rules.",
  "topic": "A 1-to-2 word classification of the specific academic topic",
  "struggle_score": <Integer between 1 and 5>
}
`

    // 3. Call Groq
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Context from student's notes:\n${rawContext}\n\nStudent Question: ${question}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    })

    const responseData = JSON.parse(completion.choices[0]?.message?.content || "{}")
    let answer = responseData.answer || "I apologize, I couldn't generate an answer."
    const extractedTopic = responseData.topic || "General"
    const struggleScore = responseData.struggle_score || 1 // Extract the new score

    // ... (Keep the source mapping code here) ...

    // 4. Save to DB 
    const chatHistory = await prisma.chatHistory.create({
      data: { 
        userId: token.id as string, 
        question, 
        mode: mode as any, 
        answer,
        topic: extractedTopic,
        struggleScore: struggleScore // Save it to the database!
      }
    })

    return NextResponse.json({ ...chatHistory, sourceNotes }, { status: 200 })
    
  } catch (error: any) {
    console.error("Chat API Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


export async function GET(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const chats = await prisma.chatHistory.findMany({
      where: { userId: token.id as string },
      orderBy: { createdAt: "asc" },
    })

    return NextResponse.json(chats)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const token = await getToken({ req: request })
    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const action = searchParams.get("action")

    // DELETE SELECTED OR SINGLE
    if (action === "selected") {
      const { ids } = await request.json()

      await prisma.chatHistory.deleteMany({
        where: {
          id: { in: ids },
          userId: token.id as string,
        },
      })

      return NextResponse.json({ success: true })
    }

    // DELETE ALL
    if (action === "all") {
      await prisma.chatHistory.deleteMany({
        where: { userId: token.id as string },
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

