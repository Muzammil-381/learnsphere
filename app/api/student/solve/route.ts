export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import pdf from "pdf-parse";
import mammoth from "mammoth";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const problemText = (formData.get("problem") as string)?.trim();

    const file = (formData.get("file") ||
      formData.get("image")) as File | null;

    if (!problemText && !file) {
      return NextResponse.json(
        { error: "Please provide text or upload a file." },
        { status: 400 }
      );
    }

    let messages: any[] = [];
    let model = "llama-3.3-70b-versatile";

    // =========================
    // IMAGE (REAL VISION FIX)
    // =========================
    if (file && file.type?.startsWith("image/")) {
      console.log("IMAGE detected (VISION MODE)");

      model = "meta-llama/llama-4-scout-17b-16e-instruct"; // keep as you want

      const buffer = Buffer.from(await file.arrayBuffer());
      const base64Image = buffer.toString("base64");

      const dataUrl = `data:${file.type};base64,${base64Image}`;

      messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
You are an expert tutor.

Read the image carefully.
Extract all questions.
Solve step-by-step.
              `.trim(),
            },
            {
              type: "image_url",
              image_url: { url: dataUrl },
            },
          ],
        },
      ];
    }

    // =========================
    // PDF
    // =========================
    else if (file && file.type === "application/pdf") {
      console.log("PDF detected");

      const buffer = Buffer.from(await file.arrayBuffer());
      const pdfData = await pdf(buffer);

      messages = [
        {
          role: "user",
          content: `Solve step-by-step:\n\n${pdfData.text}`,
        },
      ];
    }

    // =========================
    // DOCX
    // =========================
    else if (file && file.name?.endsWith(".docx")) {
      console.log("DOCX detected");

      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await mammoth.extractRawText({ buffer });

      messages = [
        {
          role: "user",
          content: `Solve step-by-step:\n\n${result.value}`,
        },
      ];
    }

    // =========================
    // TXT / TEXT
    // =========================
    else {
      const text = file ? await file.text() : problemText;

      messages = [
        {
          role: "user",
          content: `Solve step-by-step:\n\n${text}`,
        },
      ];
    }

    const completion = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
      max_completion_tokens: 2048,
    });

    return NextResponse.json({
      solution: completion.choices?.[0]?.message?.content,
    });
  } catch (error: any) {
    console.error("API ERROR:", error);

    return NextResponse.json(
      { error: error.message || "Server error" },
      { status: 500 }
    );
  }
}
