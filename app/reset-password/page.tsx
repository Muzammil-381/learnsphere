"use client"

import type React from "react"
import { useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

// 1. Core Form Logic Component
function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })

    if (res.ok) {
      alert("Password updated!")
      router.push("/login")
    } else {
      alert("Failed to reset password")
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Set New Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleReset} className="space-y-4">
            <Input
              type="password"
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

// 2. Default Page Export wrapped in Suspense
export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4">Loading reset screen...</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}

// 3. Dynamic route flags to prevent build static checks
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;