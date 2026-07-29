"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { BatchFormDialog } from "./batch-form-dialog"
import { Plus, Pencil, Trash2, GraduationCap, Loader2 } from "lucide-react"

interface BatchWithCount {
  id: string
  name: string
  createdAt: Date | string
  _count: { users: number }
}

interface BatchDashboardProps {
  batches: BatchWithCount[]
}

export function BatchDashboard({ batches }: BatchDashboardProps) {
  const router = useRouter()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState<{ id: string; name: string } | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleEditClick = (batch: { id: string; name: string }) => {
    setEditingBatch(batch)
    setDialogOpen(true)
  }

  const handleCreateClick = () => {
    setEditingBatch(null)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this batch? All enrollment linkages will be removed.")) return

    setDeletingId(id)
    try {
      const res = await fetch(`/api/admin/batch?id=${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      
      // Fires global event so your AnalyticsCards component updates instantly!
      window.dispatchEvent(new Event("refreshAnalytics"))
      router.refresh()
    } catch (err) {
      console.error(err)
      alert("Failed to delete the batch.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Academic Batches</h2>
          <p className="text-muted-foreground mt-1">Configure and manage institutional student cohorts.</p>
        </div>
        <Button onClick={handleCreateClick} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" /> Create New Batch
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.map((batch) => (
          <div key={batch.id} className="bg-card rounded-xl border border-border p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-semibold tracking-tight">{batch.name}</h3>
                </div>
                <span className="bg-secondary text-secondary-foreground text-xs font-medium px-2.5 py-1 rounded-full">
                  {batch._count.users} Enrolled
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                Created: {new Date(batch.createdAt).toLocaleDateString()}
              </p>
            </div>

            <div className="flex gap-2 border-t pt-4 mt-auto">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditClick({ id: batch.id, name: batch.name })}>
                <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" disabled={deletingId === batch.id} onClick={() => handleDelete(batch.id)}>
                {deletingId === batch.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        ))}

        {batches.length === 0 && (
          <div className="col-span-full text-center py-16 bg-muted/30 rounded-xl border border-dashed border-border">
            <p className="text-muted-foreground">No structural educational batches found.</p>
          </div>
        )}
      </div>

      <BatchFormDialog isOpen={dialogOpen} onClose={() => setDialogOpen(false)} editBatch={editingBatch} />
    </div>
  )
}