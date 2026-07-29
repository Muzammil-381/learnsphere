import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";
import { extractTextFromPDF } from "@/lib/embeddings";

// 1. Import Groq instead of Ollama
import Groq from "groq-sdk";

// 2. Initialize Groq (it will automatically use process.env.GROQ_API_KEY)
const groq = new Groq();

export async function POST(request: NextRequest) {
  try {
    // 1. AUTHENTICATION
    const token = await getToken({ req: request });
    if (!token?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { count = 5, topic = "all", difficulty = "Medium" } = await request.json();

    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    const ALLOWED_KEYWORDS = [
      "LECTURE", "DATA_TYPES", "STRUCTURE", "FILE",
      "FUNCTIONS", "QUIZ", "ASSIGNMENT", "SOLUTION",
    ];

    if (!fs.existsSync(uploadsDir)) {
      return NextResponse.json({ error: "Uploads directory not found" }, { status: 404 });
    }

    // 2. FILTER FILES
    const filesInDir = fs.readdirSync(uploadsDir);
    const targetFiles = filesInDir.filter((fileName) => {
      const upperFileName = fileName.toUpperCase().replace(/\s/g, "_");
      return ALLOWED_KEYWORDS.some((keyword) => upperFileName.includes(keyword));
    });

    // 3. EXTRACT TEXT
    let fullContext = "";
    for (const file of targetFiles) {
      const filePath = path.join(uploadsDir, file);
      const ext = path.extname(file).toLowerCase();
      try {
        if (ext === ".pdf") {
          const text = await extractTextFromPDF(filePath);
          fullContext += `\n--- SOURCE: ${file} ---\n${text}\n`;
        } else if (ext === ".txt" || ext === ".md") {
          const text = fs.readFileSync(filePath, "utf-8");
          fullContext += `\n--- SOURCE: ${file} ---\n${text}\n`;
        }
      } catch (err) {
        console.error(`Failed to read ${file}:`, err);
      }
    }

    if (fullContext.length > 15000) {
      fullContext = fullContext.substring(0, 15000) + "...[truncated]";
    }

    // 4. PROMPT (Optimized for LLaMA 3)
    const systemPrompt = `
      You are a strict academic assistant.
      Your task is to generate a quiz with exactly ${count} multiple-choice questions.

      Topic: ${topic}
      Difficulty: ${difficulty}

      JSON OUTPUT INSTRUCTIONS:
      You must output valid JSON.
      The object MUST have a key "quiz_questions" which is an Array of ${count} objects.

      REQUIRED SCHEMA:
      {
        "quiz_questions": [
          {
            "question": "Question text...",
            "options": ["A", "B", "C", "D"],
            "correctAnswer": "Option String",
            "explanation": "Short explanation",
            "topic": "${topic}",
            "difficulty": "${difficulty}"
          }
        ]
      }
    `;

    console.log(`Sending request to Groq LLaMA 3 (Count: ${count})...`);

    // 5. CALL LLaMA 3 VIA GROQ
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant", // Using Meta's fast LLaMA 3 8B model
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: fullContext
            ? `Context: ${fullContext}`
            : `Generate ${count} questions about ${topic}`,
        },
      ],
      response_format: { type: "json_object" }, // This guarantees it returns perfect JSON
      temperature: 0.2, // Lower temperature makes it more accurate/academic
    });

    const rawContent = chatCompletion.choices[0]?.message?.content || "{}";
    
    // 6. PARSE 
    let parsedData: any;
    try {
      parsedData = JSON.parse(rawContent);
    } catch (e) {
      console.error("JSON Parse Error:", rawContent);
      return NextResponse.json({ error: "Failed to parse model output" }, { status: 500 });
    }

    // 7. EXTRACT QUESTIONS
    let rawQuestions: any[] = [];
    if (parsedData.quiz_questions && Array.isArray(parsedData.quiz_questions)) {
      rawQuestions = parsedData.quiz_questions;
    } else {
      const possibleArray = Object.values(parsedData).find(val => Array.isArray(val));
      if (possibleArray) rawQuestions = possibleArray as any[];
    }

    // 8. MAP & VALIDATE
    const validQuestions = rawQuestions
      .map((q: any) => ({
        question: q.question || q.Question || q.query, 
        options: q.options || q.Options || q.choices || [], 
        correctAnswer: q.correctAnswer || q.CorrectAnswer || q.answer || "",
        explanation: q.explanation || q.Explanation || "No explanation provided.",
        topic: q.topic || topic,
        difficulty: q.difficulty || difficulty,
      }))
      .filter((q) => q.question && Array.isArray(q.options) && q.options.length > 0 && q.correctAnswer);

    if (validQuestions.length === 0) {
      return NextResponse.json({ error: "No valid questions found in response" }, { status: 500 });
    }

    // 9. SAVE TO DATABASE
    const savedQuestions = await Promise.all(
      validQuestions.map((q) =>
        prisma.practiceQuestion.create({
          data: {
            userId: token.id as string,
            question: String(q.question).trim(),
            options: q.options.map(String),
            correctAnswer: String(q.correctAnswer),
            explanation: String(q.explanation),
            topic: String(q.topic),
            difficulty: String(q.difficulty),
          },
        })
      )
    );

    return NextResponse.json(
      { message: "Questions generated successfully", questions: savedQuestions },
      { status: 200 }
    );

  } catch (error) {
    console.error("LLaMA Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate questions",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}