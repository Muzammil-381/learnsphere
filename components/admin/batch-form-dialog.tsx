"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

interface BatchFormDialogProps {
  isOpen: boolean
  onClose: () => void
  editBatch: { id: string; name: string } | null
}

export function BatchFormDialog({ isOpen, onClose, editBatch }: BatchFormDialogProps) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (editBatch) setName(editBatch.name)
    else setName("")
  }, [editBatch, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setLoading(true)
    try {
      const method = editBatch ? "PUT" : "POST"
      const payload = editBatch ? { id: editBatch.id, name } : { name }

      const response = await fetch("/api/admin/batch", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) throw new Error("Operation failed")

      window.dispatchEvent(new Event("refreshAnalytics"))
      router.refresh()
      onClose()
    } catch (error) {
      console.error(error)
      alert("Something went wrong saving the batch configuration.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editBatch ? "Edit Batch Details" : "Create New Batch"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none">Batch Name</label>
            <Input
              placeholder="e.g., Spring 2026, Cohort Alpha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              required
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editBatch ? "Save Changes" : "Create Batch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}