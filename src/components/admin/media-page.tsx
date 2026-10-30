'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Upload, Trash2, ImageIcon, ExternalLink, Copy, FileVideo, X, FolderOpen } from 'lucide-react'
import { authFetch, authFetchJson } from '@/lib/utils'

interface MediaItem {
  id: string
  filename: string
  originalUrl: string
  thumbnailUrl: string | null
  mimeType: string | null
  size: number
  alt: string | null
  createdAt: string
}

export default function MediaPage() {
  const [media, setMedia] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<MediaItem[]>('/api/admin/media')
      setMedia(data)
    } catch { toast.error('Failed to load media') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchMedia() }, [fetchMedia])

  const handleUpload = async (files: FileList | File[]) => {
    setUploading(true)
    let successCount = 0
    let failCount = 0

    for (const file of Array.from(files)) {
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'mov', '3gp', 'mkv', 'avi'].includes(ext)
      const maxSize = isVideo ? 100 * 1024 * 1024 : 25 * 1024 * 1024

      if (file.size > maxSize) {
        toast.error(`"${file.name}" exceeds ${isVideo ? '100MB' : '25MB'} limit`)
        failCount++
        continue
      }

      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: formData })
        if (res.ok) {
          successCount++
        } else {
          const errData = await res.json().catch(() => ({ error: 'Upload failed' }))
          toast.error(errData.error || `Upload failed for ${file.name}`)
          failCount++
        }
      } catch {
        failCount++
      }
    }

    if (successCount > 0) toast.success(`${successCount} file(s) uploaded`)
    if (failCount > 0) toast.error(`${failCount} file(s) failed`)
    setUploading(false)
    fetchMedia()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = () => {
    setDragActive(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this media?')) return
    try {
      await authFetch(`/api/admin/media/${id}`, { method: 'DELETE' })
      toast.success('Media deleted')
      fetchMedia()
    } catch { toast.error('Failed to delete') }
  }

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(window.location.origin + url)
    toast.success('URL copied')
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const imageMedia = media.filter(m => m.mimeType?.startsWith('image/'))
  const videoMedia = media.filter(m => m.mimeType?.startsWith('video/'))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm text-muted-foreground">{media.length} items ({imageMedia.length} images, {videoMedia.length} videos)</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Uploading...' : 'Upload Files'}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleUpload(e.target.files)}
        />
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${dragActive
            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
            : 'border-gray-300 dark:border-gray-700 hover:border-gray-400'
          }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className={`h-10 w-10 mx-auto mb-3 ${dragActive ? 'text-red-500' : 'text-gray-400'}`} />
        <p className="font-medium">{dragActive ? 'Drop files here' : 'Drag & drop files here'}</p>
        <p className="text-sm text-muted-foreground mt-1">or click to browse. Supports images (JPG, PNG, GIF, WebP) and videos (MP4, WebM). Max 10MB per file.</p>
      </div>

      {/* Media Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : media.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">No media yet</p>
          <p className="text-sm">Upload your first image or video</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {media.map(item => (
            <Card key={item.id} className="group overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow">
              <div className="aspect-square bg-muted relative">
                {item.mimeType?.startsWith('image/') ? (
                  <img src={item.thumbnailUrl || item.originalUrl} alt={item.alt || item.filename} className="w-full h-full object-cover" />
                ) : item.mimeType?.startsWith('video/') ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
                    <FileVideo className="h-8 w-8 text-gray-400" />
                    <span className="text-[10px] text-muted-foreground mt-1">Video</span>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <FolderOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => copyUrl(item.originalUrl)} title="Copy URL">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setPreviewItem(item)} title="Preview">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => handleDelete(item.id)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {/* Type badge */}
                <Badge className="absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0 h-4 bg-black/60 text-white border-0">
                  {item.mimeType?.startsWith('image/') ? 'IMG' : 'VID'}
                </Badge>
              </div>
              <CardContent className="p-2">
                <p className="text-xs font-medium truncate" title={item.filename}>{item.filename}</p>
                <p className="text-[10px] text-muted-foreground">{formatSize(item.size)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="truncate">{previewItem?.filename}</span>
              <Button size="sm" variant="outline" onClick={() => previewItem && copyUrl(previewItem.originalUrl)}>
                <Copy className="h-3 w-3 mr-1" /> Copy URL
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {previewItem?.mimeType?.startsWith('image/') ? (
              <img src={previewItem.originalUrl} alt={previewItem.alt || ''} className="w-full rounded-lg" />
            ) : previewItem?.mimeType?.startsWith('video/') ? (
              <video src={previewItem.originalUrl} controls className="w-full rounded-lg" />
            ) : null}
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Size:</span> {formatSize(previewItem?.size || 0)}</div>
              <div><span className="text-muted-foreground">Type:</span> {previewItem?.mimeType}</div>
              <div className="col-span-2"><span className="text-muted-foreground">URL:</span> <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">{previewItem?.originalUrl}</code></div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
