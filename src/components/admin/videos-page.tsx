'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  Play,
  Eye,
  Loader2,
  Video,
  RefreshCw,
  Film,
  X,
  ArrowLeft,
  Save,
} from 'lucide-react'
import { toast } from 'sonner'

interface VideoItem {
  id: string
  title: string
  description: string | null
  videoUrl: string
  thumbnailUrl: string | null
  duration: number
  categoryId: string | null
  status: string
  viewsCount: number
  createdAt: string
  category: { name: string; color: string } | null
}

interface Category {
  id: string
  name: string
  color: string
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

function parseDuration(formatted: string): number {
  const parts = formatted.split(':')
  if (parts.length === 2) {
    const mins = parseInt(parts[0], 10) || 0
    const secs = parseInt(parts[1], 10) || 0
    return mins * 60 + secs
  }
  if (parts.length === 3) {
    const hrs = parseInt(parts[0], 10) || 0
    const mins = parseInt(parts[1], 10) || 0
    const secs = parseInt(parts[2], 10) || 0
    return hrs * 3600 + mins * 60 + secs
  }
  const val = parseInt(formatted, 10)
  return isNaN(val) ? 0 : val
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'published':
      return 'bg-green-100 text-green-700 border-green-200'
    case 'draft':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    case 'archived':
      return 'bg-purple-100 text-purple-700 border-purple-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default function VideosPage() {
  const { pendingAction, setPendingAction } = useAppStore()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Page-based form state
  const [formMode, setFormMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editItem, setEditItem] = useState<VideoItem | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<VideoItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [importingYt, setImportingYt] = useState(false)

  const handleAutoImportYouTube = async () => {
    setImportingYt(true)
    try {
      const res = await authFetchJSON('/api/admin/videos/import-youtube', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      if (!res.ok) throw new Error('Import failed')
      const data = await res.json()
      toast.success(`Auto-imported ${data.importedCount || 0} YouTube Shorts (${data.skippedCount || 0} existing skipped)`)
      fetchVideos()
    } catch {
      toast.error('Failed to auto-import YouTube Shorts')
    } finally {
      setImportingYt(false)
    }
  }

  const fetchVideos = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authFetchJson<VideoItem[]>('/api/admin/videos')
      setVideos(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load videos')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const data = await authFetchJson<Category[]>('/api/admin/categories')
      setCategories(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load categories')
    }
  }, [])

  useEffect(() => {
    fetchVideos()
    fetchCategories()
  }, [fetchVideos, fetchCategories])

  // Refetch when returning to list
  useEffect(() => {
    if (formMode === 'list') {
      fetchVideos()
    }
  }, [formMode, fetchVideos])

  // Handle pending action from dashboard
  useEffect(() => {
    if (pendingAction === 'create') {
      setPendingAction(null)
      openCreateForm()
    }
  }, [pendingAction, setPendingAction])

  const openCreateForm = () => {
    setEditItem(null)
    setFormMode('create')
  }

  const openEditForm = (video: VideoItem) => {
    setEditItem(video)
    setFormMode('edit')
  }

  const handleFormCancel = () => {
    setFormMode('list')
    setEditItem(null)
  }

  const handleFormSave = async (formData: Record<string, unknown>) => {
    try {
      if (editItem) {
        const res = await authFetchJSON(`/api/admin/videos/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error()
        toast.success('Video updated successfully')
      } else {
        const res = await authFetchJSON('/api/admin/videos', {
          method: 'POST',
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error()
        toast.success('Video created successfully')
      }
      setFormMode('list')
      setEditItem(null)
    } catch {
      toast.error('Failed to save video')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await authFetch(`/api/admin/videos/${deleteTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete video')
      toast.success('Video deleted successfully')
      setDeleteTarget(null)
      fetchVideos()
    } catch {
      toast.error('Failed to delete video')
    } finally {
      setDeleting(false)
    }
  }

  const filteredVideos = videos.filter((video) => {
    const matchesSearch =
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (video.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false) ||
      (video.category?.name.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
    const matchesStatus = statusFilter === 'all' || video.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const totalViews = videos.reduce((sum, v) => sum + v.viewsCount, 0)
  const publishedCount = videos.filter((v) => v.status === 'published').length
  const draftCount = videos.filter((v) => v.status === 'draft').length

  // Show full-page form for create/edit
  if (formMode === 'create' || formMode === 'edit') {
    return (
      <VideoFormPage
        key={editItem?.id || 'create'}
        editItem={editItem}
        categories={categories}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
      />
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <Film className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Videos</p>
                <p className="text-2xl font-bold">{videos.length}</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <Play className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{publishedCount}</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-50">
                <Video className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold">{draftCount}</p>
              </div>
            </div>
          </Card>
          <Card className="border-0 shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Views</p>
                <p className="text-2xl font-bold">{totalViews.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <Card className="border-0 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search videos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="icon"
                onClick={fetchVideos}
                className="shrink-0"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                variant="outline"
                onClick={handleAutoImportYouTube}
                disabled={importingYt}
                className="border-red-200 text-red-600 hover:bg-red-50 flex-1 sm:flex-none"
              >
                <Film className={`h-4 w-4 mr-2 ${importingYt ? 'animate-spin' : ''}`} />
                {importingYt ? 'Importing Shorts...' : 'Auto-Import Shorts'}
              </Button>
              <Button
                onClick={openCreateForm}
                className="bg-red-600 hover:bg-red-700 text-white flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Video
              </Button>
            </div>
          </div>
        </Card>

        {/* Videos Table */}
        <Card className="border-0 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-red-600" />
              <span className="ml-3 text-muted-foreground">Loading videos...</span>
            </div>
          ) : filteredVideos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Film className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-lg font-medium">No videos found</p>
              <p className="text-sm mt-1">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Click "Add Video" to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/50">
                    <TableHead className="w-[80px]">Thumbnail</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead className="w-[130px]">Category</TableHead>
                    <TableHead className="w-[90px]">Duration</TableHead>
                    <TableHead className="w-[90px] text-right">Views</TableHead>
                    <TableHead className="w-[110px]">Status</TableHead>
                    <TableHead className="w-[100px] text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVideos.map((video) => (
                    <TableRow key={video.id} className="group hover:bg-gray-50/50">
                      <TableCell>
                        <div className="relative w-16 h-10 rounded overflow-hidden bg-gray-100 flex-shrink-0">
                          {video.thumbnailUrl ? (
                            <img
                              src={video.thumbnailUrl}
                              alt={video.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Film className="h-4 w-4 text-gray-400" />
                            </div>
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Play className="h-3 w-3 text-white fill-white" />
                          </div>
                          <div className="absolute bottom-0.5 right-0.5 bg-black/70 text-white text-[9px] px-1 rounded font-mono">
                            {formatDuration(video.duration)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[280px]">
                          <p className="font-medium text-sm truncate">{video.title}</p>
                          {video.description && (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {video.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(video.createdAt)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {video.category ? (
                          <Badge
                            variant="outline"
                            className="text-xs font-medium"
                            style={{
                              borderColor: video.category.color,
                              color: video.category.color,
                              backgroundColor: `${video.category.color}10`,
                            }}
                          >
                            {video.category.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">Uncategorized</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-mono tabular-nums">
                          {formatDuration(video.duration)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-sm tabular-nums">
                          {video.viewsCount.toLocaleString('en-IN')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-xs font-medium capitalize ${getStatusColor(video.status)}`}
                        >
                          {video.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditForm(video)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Edit video</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => setDeleteTarget(video)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Delete video</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {!loading && filteredVideos.length > 0 && (
            <div className="px-4 py-3 border-t bg-gray-50/30 text-sm text-muted-foreground">
              Showing {filteredVideos.length} of {videos.length} video{videos.length !== 1 ? 's' : ''}
            </div>
          )}
        </Card>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Video</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &ldquo;{deleteTarget?.title}&rdquo;? This action
                cannot be undone. The video will be moved to archived status.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  )
}

// ============================================================
// Full-Page Video Form Component
// ============================================================
function VideoFormPage({
  editItem,
  categories,
  onSave,
  onCancel,
}: {
  editItem: VideoItem | null
  categories: Category[]
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    duration: 0,
    categoryId: '',
    status: 'draft',
    ...(editItem
      ? {
          title: editItem.title,
          description: editItem.description || '',
          videoUrl: editItem.videoUrl,
          thumbnailUrl: editItem.thumbnailUrl || '',
          duration: editItem.duration,
          categoryId: editItem.categoryId || '',
          status: editItem.status === 'archived' ? 'draft' : editItem.status,
        }
      : {}),
  })
  const [durationInput, setDurationInput] = useState(
    editItem ? formatDuration(editItem.duration) : '00:00'
  )
  const [uploading, setUploading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const extractYoutubeThumbnail = (url: string): string | null => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    if (match && match[2].length === 11) {
      return `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg`
    }
    return null
  }

  const updateField = (key: string, value: unknown) => setForm((prev) => ({ ...prev, [key]: value }))

  const handleDurationChange = (value: string) => {
    setDurationInput(value)
    const seconds = parseDuration(value)
    updateField('duration', seconds)
  }

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const uploadForm = new FormData()
      uploadForm.append('file', file)
      const res = await authFetch('/api/admin/media/upload', {
        method: 'POST',
        body: uploadForm,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      updateField('thumbnailUrl', data.url || data.filePath || '')
      toast.success('Thumbnail uploaded')
    } catch {
      toast.error('Failed to upload thumbnail')
    } finally {
      setUploading(false)
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingVideo(true)
    try {
      const uploadForm = new FormData()
      uploadForm.append('file', file)
      const res = await authFetch('/api/admin/media/upload', {
        method: 'POST',
        body: uploadForm,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const url = data.url || data.filePath || ''
      updateField('videoUrl', url)
      toast.success('Video file uploaded')

      // Auto-extract duration from video file if possible
      try {
        const videoElement = document.createElement('video')
        videoElement.src = url
        videoElement.onloadedmetadata = () => {
          const duration = Math.round(videoElement.duration)
          updateField('duration', duration)
          setDurationInput(formatDuration(duration))
        }
      } catch (err) {
        console.error('Failed to extract video duration:', err)
      }
    } catch {
      toast.error('Failed to upload video')
    } finally {
      setUploadingVideo(false)
    }
  }

  const handleVideoUrlChange = (url: string) => {
    updateField('videoUrl', url)
    const ytThumb = extractYoutubeThumbnail(url)
    if (ytThumb && (!form.thumbnailUrl || (form.thumbnailUrl as string).startsWith('https://img.youtube.com/'))) {
      updateField('thumbnailUrl', ytThumb)
    }
  }

  const handleSubmit = async () => {
    if (!(form.title as string)?.trim()) {
      toast.error('Title is required')
      return
    }
    if (!(form.videoUrl as string)?.trim()) {
      toast.error('Video URL is required')
      return
    }
    setSaving(true)
    try {
      const payload = {
        title: (form.title as string).trim(),
        description: (form.description as string).trim() || null,
        videoUrl: (form.videoUrl as string).trim(),
        thumbnailUrl: (form.thumbnailUrl as string).trim() || null,
        duration: form.duration as number,
        categoryId: (form.categoryId as string) || null,
        status: form.status as string,
      }
      await onSave(payload)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onCancel} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{editItem ? 'Edit Video' : 'Create Video'}</h1>
          <p className="text-sm text-muted-foreground">
            {editItem
              ? 'Update the video details below'
              : 'Fill in the details to add a new video'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-5">
              {/* Title */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">
                  Title <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={form.title as string}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Enter video title"
                  className="text-base"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Description</Label>
                <Textarea
                  value={form.description as string}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  placeholder="Enter video description (optional)"
                />
              </div>

              {/* Video URL */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  Video URL / File <span className="text-red-600">*</span>
                </Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      value={form.videoUrl as string}
                      onChange={(e) => handleVideoUrlChange(e.target.value)}
                      placeholder="YouTube link or direct video URL"
                    />
                  </div>
                  <label className="cursor-pointer">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploadingVideo}
                      asChild
                    >
                      <span>
                        {uploadingVideo ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1" />
                        )}
                        Upload Video
                      </span>
                    </Button>
                    <input
                      ref={videoInputRef}
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={handleVideoUpload}
                    />
                  </label>
                </div>
              </div>

              {/* Thumbnail */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Thumbnail</Label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      value={form.thumbnailUrl as string}
                      onChange={(e) => updateField('thumbnailUrl', e.target.value)}
                      placeholder="Image URL or upload below"
                    />
                  </div>
                  <label className="cursor-pointer">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={uploading}
                      asChild
                    >
                      <span>
                        {uploading ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1" />
                        )}
                        Upload
                      </span>
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleThumbnailUpload}
                    />
                  </label>
                </div>
                {(form.thumbnailUrl as string) && (
                  <div className="relative inline-block">
                    <img
                      src={form.thumbnailUrl as string}
                      alt="Thumbnail preview"
                      className="h-24 w-40 object-cover rounded-lg border"
                    />
                    <button
                      onClick={() => updateField('thumbnailUrl', '')}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Duration (mm:ss)</Label>
                <Input
                  placeholder="00:00"
                  value={durationInput}
                  onChange={(e) => handleDurationChange(e.target.value)}
                  className="font-mono max-w-[200px]"
                />
                <p className="text-xs text-muted-foreground">
                  {form.duration as number} second{(form.duration as number) !== 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Category & Status */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-sm">Video Settings</h3>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={(form.categoryId as string) || '__none__'}
                  onValueChange={(val) =>
                    updateField('categoryId', val === '__none__' ? '' : val)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Uncategorized</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status as string}
                  onValueChange={(val) => updateField('status', val)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gray-400" />
                        Draft
                      </div>
                    </SelectItem>
                    <SelectItem value="published">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        Published
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editItem ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
