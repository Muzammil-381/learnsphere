"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { signOut } from "next-auth/react"
import Link from "next/link"
import { LayoutDashboard } from "lucide-react"

interface AdminHeaderProps {
  name?: string | null
  email?: string | null
}

export function AdminHeader({ name, email }: AdminHeaderProps) {
  return (
    <div className="border-b">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
  {/* Dashboard Icon Link */}
  <Link 
    href="/admin" 
    className="p-2 rounded-lg bg-muted text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors duration-200"
    title="Go to Admin Dashboard Home"
  >
    <LayoutDashboard className="w-5 h-5" />
  </Link>
  
  <div>
    <h1 className="text-2xl font-bold">Admin Dashboard</h1>
    <p className="text-muted-foreground">Manage users and system settings</p>
  </div>
</div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
          <Button
            variant="outline"
            onClick={() => signOut({ redirect: true, callbackUrl: "/login" })}
            className="gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}

