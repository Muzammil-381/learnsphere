// components/teacher/notes-management.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Plus, Trash2, Download, FileText, Folder, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Added Batch to interfaces
interface Batch {
  id: string;
  name: string;
}

interface Note {
  id: string
  title: string
  content: string | null
  fileUrl: string | null
  fileName: string | null
  fileType: string | null
  student: {
    id: string
    name: string
    email: string
  }
  createdAt: string
}

interface GroupedNote {
  ids: string[]
  title: string
  content: string | null
  fileUrl: string | null
  fileName: string | null
  fileType: string | null
  students: Array<{
    id: string
    name: string
    email: string
  }>
  createdAt: string
}

// Added batches to props
export function NotesManagement() {
    const [batches, setBatches] = useState<Batch[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [students, setStudents] = useState<{ id: string; name: string; email: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isZipDialogOpen, setIsZipDialogOpen] = useState(false)
  
  // New States for Target Selection
  const [targetType, setTargetType] = useState<"all" | "batch" | "student">("all")
  const [selectedBatchId, setSelectedBatchId] = useState("")
  const [selectedStudentId, setSelectedStudentId] = useState("")
  
  const [zipTargetType, setZipTargetType] = useState<"all" | "batch" | "student">("all")
  const [zipSelectedBatchId, setZipSelectedBatchId] = useState("")
  const [zipSelectedStudentId, setZipSelectedStudentId] = useState("")

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [zipFile, setZipFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadingZip, setUploadingZip] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    fetchNotes()
    fetchStudents()
    fetchBatches()
  }, [])


  // 4. Add the fetchBatches function right below fetchStudents
  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/teacher/batches")
      if (response.ok) {
        const data = await response.json()
        setBatches(data.batches) // This will populate your dropdown!
      }
    } catch (error) {
      console.error("Failed to fetch batches:", error)
    }
  }
  
  const fetchNotes = async () => {
    try {
      const response = await fetch("/api/teacher/notes")
      if (response.ok) {
        const data = await response.json()
        setNotes(data.notes)
      }
    } catch (error) {
      console.error("Failed to fetch notes:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/teacher/students")
      if (response.ok) {
        const data = await response.json()
        setStudents(data.students)
      }
    } catch (error) {
      console.error("Failed to fetch students:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!title) return alert("Please enter a title")
    if (targetType === "batch" && !selectedBatchId) return alert("Please select a batch")
    if (targetType === "student" && !selectedStudentId) return alert("Please select a student")

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append("title", title)
      formData.append("targetType", targetType)
      
      if (targetType === "batch") formData.append("batchId", selectedBatchId)
      if (targetType === "student") formData.append("studentId", selectedStudentId)
      if (content) formData.append("content", content)
      if (file) formData.append("file", file)

      const response = await fetch("/api/teacher/notes", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Successfully sent note to ${data.count || 1} student(s)!`)
        
        // Reset states
        setTitle("")
        setContent("")
        setFile(null)
        setTargetType("all")
        setSelectedBatchId("")
        setSelectedStudentId("")
        setIsDialogOpen(false)
        fetchNotes()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to upload note")
      }
    } catch (error) {
      console.error("Error uploading note:", error)
      alert("Failed to upload note")
    } finally {
      setUploading(false)
    }
  }

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!zipFile) return alert("Please choose a ZIP or RAR file")
    if (zipTargetType === "batch" && !zipSelectedBatchId) return alert("Please select a batch")
    if (zipTargetType === "student" && !zipSelectedStudentId) return alert("Please select a student")

    setUploadingZip(true)

    try {
      const formData = new FormData()
      formData.append("zipFile", zipFile)
      formData.append("targetType", zipTargetType)
      
      if (zipTargetType === "batch") formData.append("batchId", zipSelectedBatchId)
      if (zipTargetType === "student") formData.append("studentId", zipSelectedStudentId)

      const response = await fetch("/api/teacher/notes/upload-zip", {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        alert(`Successfully uploaded ${data.filesCount} files from archive to ${data.studentsCount} student(s)!`)
        setZipFile(null)
        setZipTargetType("all")
        setZipSelectedBatchId("")
        setZipSelectedStudentId("")
        setIsZipDialogOpen(false)
        fetchNotes()
      } else {
        const data = await response.json()
        alert(data.error || "Failed to upload archive file")
      }
    } catch (error) {
      console.error("Error uploading ZIP:", error)
      alert("Failed to upload archive file")
    } finally {
      setUploadingZip(false)
    }
  }

  // ... (groupNotes, handleDelete, handleRegenerateEmbeddings stay EXACTLY the same)
  const groupNotes = (notes: Note[]): GroupedNote[] => {
    const groupedMap = new Map<string, Note[]>()
    notes.forEach((note) => {
      const createdAtTime = new Date(note.createdAt).getTime()
      const timeWindow = Math.floor(createdAtTime / 20000) * 5000 
      const key = `${note.title}|${note.content || ""}|${note.fileUrl || ""}|${timeWindow}`
      if (!groupedMap.has(key)) { groupedMap.set(key, []) }
      groupedMap.get(key)!.push(note)
    })
    return Array.from(groupedMap.values()).map((noteGroup) => ({
      ids: noteGroup.map((n) => n.id),
      title: noteGroup[0].title,
      content: noteGroup[0].content,
      fileUrl: noteGroup[0].fileUrl,
      fileName: noteGroup[0].fileName,
      fileType: noteGroup[0].fileType,
      students: noteGroup.map((n) => n.student),
      createdAt: noteGroup[0].createdAt,
    }))
  }

  const handleDelete = async (noteIds: string[]) => {
    const message = noteIds.length > 1 
      ? `Are you sure you want to delete this note for all ${noteIds.length} students?`
      : "Are you sure you want to delete this note?"
    if (!confirm(message)) return
    try {
      await Promise.all(noteIds.map((id) => fetch(`/api/teacher/notes/${id}`, { method: "DELETE" })))
      fetchNotes()
    } catch (error) { console.error("Failed to delete note:", error) }
  }

  const handleRegenerateEmbeddings = async () => {
    if (!confirm("This will regenerate embeddings for all your notes. Continue?")) return
    setRegenerating(true)
    try {
      const response = await fetch("/api/teacher/notes/regenerate-embeddings", { method: "POST" })
      const data = await response.json()
      if (response.ok) {
        toast({ title: "Embeddings Regenerated", description: `Successfully processed ${data.processed} notes.` })
      } else {
        toast({ title: "Error", description: data.error || "Failed", variant: "destructive" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: "Failed", variant: "destructive" })
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Student Notes & Files</h3>
          <p className="text-sm text-muted-foreground">Manage notes, PDFs, and files for your students</p>
        </div>
        <div className="flex gap-2">
          {/* ... (Regenerate Button stays the same) */}
          <Button variant="outline" onClick={handleRegenerateEmbeddings} disabled={regenerating}>
            {regenerating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Regenerating...</> : <><RefreshCw className="w-4 h-4 mr-2" />Regenerate Embeddings</>}
          </Button>

          {/* ZIP DIALOG */}
          <Dialog open={isZipDialogOpen} onOpenChange={setIsZipDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline"><Folder className="w-4 h-4 mr-2" />Upload Archive</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Archive Folder</DialogTitle>
                <DialogDescription>Upload a ZIP or RAR folder containing multiple files.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleZipSubmit} className="space-y-4">
                
                {/* Target Type Selection */}
                <div>
                  <label className="text-sm font-medium">Send To *</label>
                  <Select value={zipTargetType} onValueChange={(val: any) => setZipTargetType(val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      <SelectItem value="batch">Specific Batch</SelectItem>
                      <SelectItem value="student">Specific Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional Dropdowns */}
                {zipTargetType === "batch" && (
                  <div>
                    <label className="text-sm font-medium">Select Batch *</label>
                    <Select value={zipSelectedBatchId} onValueChange={setZipSelectedBatchId}>
                      <SelectTrigger><SelectValue placeholder="Select a batch" /></SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>{batch.name} Batch</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {zipTargetType === "student" && (
                  <div>
                    <label className="text-sm font-medium">Select Student *</label>
                    <Select value={zipSelectedStudentId} onValueChange={setZipSelectedStudentId}>
                      <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium">Archive File (ZIP/RAR) *</label>
                  <Input type="file" accept=".zip,.rar" onChange={(e) => setZipFile(e.target.files?.[0] || null)} required />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsZipDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={uploadingZip}>
                    {uploadingZip ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : "Upload Archive"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* SINGLE FILE / NOTE DIALOG */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="w-4 h-4 mr-2" />Add Note/File</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Note or Upload File</DialogTitle>
                <DialogDescription>Create a note or upload a PDF/file</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Target Type Selection */}
                <div>
                  <label className="text-sm font-medium">Send To *</label>
                  <Select value={targetType} onValueChange={(val: any) => setTargetType(val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      <SelectItem value="batch">Specific Batch</SelectItem>
                      <SelectItem value="student">Specific Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Conditional Dropdowns */}
                {targetType === "batch" && (
                  <div>
                    <label className="text-sm font-medium">Select Batch *</label>
                    <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                      <SelectTrigger><SelectValue placeholder="Select a batch" /></SelectTrigger>
                      <SelectContent>
                        {batches.map((batch) => (
                          <SelectItem key={batch.id} value={batch.id}>{batch.name} Batch</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {targetType === "student" && (
                  <div>
                    <label className="text-sm font-medium">Select Student *</label>
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger><SelectValue placeholder="Select a student" /></SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>{student.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* ... (Rest of the form stays the same) ... */}
                <div>
                  <label className="text-sm font-medium">Title *</label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter note title" required />
                </div>
                <div>
                  <label className="text-sm font-medium">Content (Optional)</label>
                  <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Enter note content..." rows={4} />
                </div>
                <div>
                  <label className="text-sm font-medium">Upload File (Optional)</label>
                  <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} accept=".pdf,.doc,.docx,.txt" />
                </div>

                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={uploading}>
                    {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading...</> : "Upload"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* ... (Table rendering stays EXACTLY the same) ... */}
      {notes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">No notes or files uploaded yet</p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Add Your First Note/File
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupNotes(notes).map((groupedNote, index) => (
                  <TableRow key={`${groupedNote.ids[0]}-${index}`}>
                    <TableCell className="font-medium">{groupedNote.title}</TableCell>
                    <TableCell>
                      <div>
                        {groupedNote.students.length === 1 ? (
                          <>
                            <p className="font-medium">{groupedNote.students[0].name}</p>
                            <p className="text-xs text-muted-foreground">{groupedNote.students[0].email}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-medium">Multiple Students</p>
                            <p className="text-xs text-muted-foreground">{groupedNote.students.length} students</p>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {groupedNote.fileUrl ? (
                        <span className="flex items-center gap-1 text-sm"><FileText className="w-4 h-4" />{groupedNote.fileType || "File"}</span>
                      ) : (
                        <span className="text-sm text-muted-foreground">Note</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(groupedNote.createdAt).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        {groupedNote.fileUrl && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={groupedNote.fileUrl} target="_blank" rel="noopener noreferrer"><Download className="w-4 h-4" /></a>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => handleDelete(groupedNote.ids)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}