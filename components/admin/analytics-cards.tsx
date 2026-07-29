"use client"

import { useEffect, useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Users, GraduationCap, ShieldCheck, UserCheck, UserX, FolderKanban } from "lucide-react"
import Link from "next/link"

interface UserStats {
  totalUsers: number
  activeStudents: number
  activeTeachers: number
  activeAdmins: number
  inactiveUsers: number
  totalBatches: number
}

export function AnalyticsCards() {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/users/stats")
      
      if (!response.ok) {
        throw new Error("Failed to fetch statistics")
      }

      const data = await response.json()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()

    // Listen for refresh events from user table actions
    const handleRefresh = () => {
      fetchStats()
    }

    window.addEventListener("refreshAnalytics", handleRefresh)

    return () => {
      window.removeEventListener("refreshAnalytics", handleRefresh)
    }
  }, [fetchStats])

  // Helper function to keep JSX clean and handle layout states uniformly
  const renderCardContent = (value: number | undefined) => {
    if (loading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    if (error) return <div className="text-sm text-destructive font-medium">Error</div>
    return <div className="text-2xl font-bold tracking-tight">{value ?? 0}</div>
  }

  return (
    /* Changed to grid-cols-6 on large screens to cleanly contain all six blocks */
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
      
      {/* Total Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground opacity-60" />
        </CardHeader>
        <CardContent>{renderCardContent(stats?.totalUsers)}</CardContent>
      </Card>

      {/* Active Students */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Students</CardTitle>
          <GraduationCap className="h-4 w-4 text-muted-foreground opacity-60" />
        </CardHeader>
        <CardContent>{renderCardContent(stats?.activeStudents)}</CardContent>
      </Card>

      {/* Active Teachers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Teachers</CardTitle>
          <UserCheck className="h-4 w-4 text-muted-foreground opacity-60" />
        </CardHeader>
        <CardContent>{renderCardContent(stats?.activeTeachers)}</CardContent>
      </Card>

      {/* Active Admins */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Admins</CardTitle>
          <ShieldCheck className="h-4 w-4 text-muted-foreground opacity-60" />
        </CardHeader>
        <CardContent>{renderCardContent(stats?.activeAdmins)}</CardContent>
      </Card>

     {/* Total Academic Batches (Wrapped with Link for Routing) */}
      <Link href="/admin/batches" className="block transition-transform hover:scale-[1.02] active:scale-[0.99]">
        <Card className="cursor-pointer border-primary/30 bg-primary/[0.02] hover:bg-primary/[0.04] shadow-sm transition-colors duration-200 h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-primary">Total Batches</CardTitle>
            <FolderKanban className="h-4 w-4 text-primary opacity-90 animate-pulse" />
          </CardHeader>
          <CardContent>{renderCardContent(stats?.totalBatches)}</CardContent>
        </Card>
      </Link>

      {/* Inactive Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Inactive Users</CardTitle>
          <UserX className="h-4 w-4 text-muted-foreground opacity-60" />
        </CardHeader>
        <CardContent>{renderCardContent(stats?.inactiveUsers)}</CardContent>
      </Card>
      
    </div>
  )
}