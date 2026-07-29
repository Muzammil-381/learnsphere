// components/student/batch-registration.tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, GraduationCap, Loader2 } from "lucide-react"

interface Batch {
  id: string
  name: string
}

interface BatchRegistrationProps {
  batches: Batch[]
  currentBatchId: string | null
}

export function BatchRegistration({ batches, currentBatchId }: BatchRegistrationProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null)

  const handleRegister = async (batchId: string) => {
    try {
      setIsSubmitting(batchId)
      
      const response = await fetch("/api/student/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ batchId }),
      })

      if (!response.ok) {
        throw new Error("Failed to register")
      }

      // Refresh the page to show the updated server state
      router.refresh()
    } catch (error) {
      console.error("Error registering for batch:", error)
      alert("Failed to register for batch. Please try again.")
    } finally {
      setIsSubmitting(null)
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {batches.map((batch) => {
        const isRegistered = currentBatchId === batch.id

        return (
          <div 
            key={batch.id} 
            className={`relative p-6 rounded-xl border ${
              isRegistered 
                ? "border-primary bg-primary/5 shadow-sm" 
                : "border-border bg-card hover:shadow-md transition-shadow"
            }`}
          >
            {isRegistered && (
              <div className="absolute top-4 right-4 flex items-center text-primary text-sm font-medium gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Registered
              </div>
            )}

            <div className="flex items-center gap-4 mb-6">
              <div className={`p-3 rounded-lg ${isRegistered ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{batch.name} Batch</h3>
                <p className="text-sm text-muted-foreground">Standard Curriculum</p>
              </div>
            </div>

            <Button
              className="w-full"
              variant={isRegistered ? "outline" : "default"}
              disabled={isRegistered || isSubmitting !== null}
              onClick={() => handleRegister(batch.id)}
            >
              {isSubmitting === batch.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : isRegistered ? (
                "Currently Enrolled"
              ) : (
                "Register for Batch"
              )}
            </Button>
          </div>
        )
      })}

      {batches.length === 0 && (
        <div className="col-span-full p-8 text-center bg-muted/50 rounded-xl border border-dashed">
          <p className="text-muted-foreground">No batches are currently available for registration.</p>
        </div>
      )}
    </div>
  )
}