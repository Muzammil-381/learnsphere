export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from "next/server"
import Groq from "groq-sdk"

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const problemText = formData.get("problem") as string
    const imageFile = formData.get("image") as File | null

    if (!problemText && !imageFile) {
      return NextResponse.json({ error: "Please provide text or an image." }, { status: 400 })
    }

    let messages: any[] = []
    let selectedModel = "llama-3.3-70b-versatile" // Default to the heavy-duty text model

    // --- Scenario A: Image Uploaded (Vision Model) ---
    if (imageFile) {
      // Use the official production vision model (NOT the decommissioned preview)
      selectedModel = "llama-3.2-11b-vision-instruct" 
      
      const arrayBuffer = await imageFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const base64Image = buffer.toString("base64")
      
      // Groq Vision requires a properly formatted data URI
      const dataUrl = `data:${imageFile.type};base64,${base64Image}`

      const textPrompt = problemText 
        ? `Solve this problem step-by-step: ${problemText}` 
        : "Please analyze this image, identify the problem inside it, and solve it step-by-step."

      messages = [
        {
          role: "user",
          content: [
            { type: "text", text: textPrompt },
            { type: "image_url", image_url: { url: dataUrl } }
          ],
        },
      ]
    } 
    // --- Scenario B: Text Only (Standard LLM) ---
    else {
      messages = [
        {
          role: "user",
          content: `Please solve this problem step-by-step and provide the final answer clearly. Problem: ${problemText}`,
        },
      ]
    }

    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: selectedModel,
      temperature: 0.3, // Low temperature for more accurate math/logic
      max_completion_tokens: 1024,
    })

    const solution = completion.choices[0]?.message?.content || "Could not generate a solution."

    return NextResponse.json({ solution })

  } catch (error: any) {
    console.error("Groq API Error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to solve problem" }, 
      { status: 500 }
    )
  }
}
