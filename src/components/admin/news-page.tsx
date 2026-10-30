'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Search, CheckCircle, XCircle, Upload, X, ImageIcon, ArrowLeft, Save, Loader2, Sparkles } from 'lucide-react'

interface NewsItem {
  id: string
  title: string
  shortDesc: string | null
  status: string
  priority: string
  createdAt: string
  publishedAt: string | null
  viewsCount: number
  thumbnailUrl: string
  imagesUrls: string[]
  videoUrl: string | null
  category: { name: string; color: string }
  district: { name: string } | null
  reporter: { name: string } | null
  tags: { tag: { name: string; slug: string } }[]
}

interface Category { id: string; name: string }
interface State { id: string; name: string; code: string }
interface District { id: string; name: string; stateId: string }
interface Mandal { id: string; name: string; districtId: string }
interface Reporter { id: string; name: string }
interface Tag { id: string; name: string; slug: string; type: string }

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  pending_review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  archived: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

const priorityColors: Record<string, string> = {
  normal: 'bg-gray-100 text-gray-600',
  high: 'bg-orange-100 text-orange-700',
  breaking: 'bg-red-600 text-white',
}

export default function NewsPage() {
  const { currentUser, pendingAction, setPendingAction } = useAppStore()
  const [news, setNews] = useState<NewsItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [states, setStates] = useState<State[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [mandals, setMandals] = useState<Mandal[]>([])
  const [reporters, setReporters] = useState<Reporter[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectId, setRejectId] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Page-based form state
  const [formMode, setFormMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editItemId, setEditItemId] = useState<string | null>(null)

  const limit = 15

  const fetchNews = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (search) params.set('search', search)
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus)
      if (filterCategory && filterCategory !== 'all') params.set('categoryId', filterCategory)
      if (filterPriority && filterPriority !== 'all') params.set('priority', filterPriority)
      if (activeTab === 'pending') params.set('status', 'pending_review')

      const data = await authFetchJson<{ news: NewsItem[]; total: number }>(`/api/admin/news?${params}`)
      setNews(data.news || [])
      setTotal(data.total || 0)
    } catch (err) {
      console.error('Fetch news error:', err)
      toast.error('Failed to load news')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus, filterCategory, filterPriority, activeTab])

  useEffect(() => {
    const loadDeps = async () => {
      try {
        const [cats, stateList, dists, mands, reps, tagList] = await Promise.all([
          // skipLogout=true: loading dropdown deps shouldn't log user out on transient 401
          authFetchJson<Category[]>('/api/admin/categories', undefined, true),
          authFetchJson<State[]>('/api/admin/states', undefined, true),
          authFetchJson<District[]>('/api/admin/districts', undefined, true),
          authFetchJson<Mandal[]>('/api/admin/mandals', undefined, true),
          authFetchJson<Reporter[]>('/api/admin/reporters', undefined, true),
          authFetchJson<Tag[]>('/api/admin/tags', undefined, true),
        ])
        setCategories(cats)
        setStates(stateList)
        setDistricts(dists)
        setMandals(mands)
        setReporters(reps)
        setTags(tagList)
      } catch (err) {
        console.error('Failed to load dependencies:', err)
      }
    }
    loadDeps()
  }, [])

  useEffect(() => {
    if (formMode === 'list') {
      fetchNews()
    }
  }, [fetchNews, formMode])

  // Handle pending action from dashboard (e.g., "Create Breaking News")
  useEffect(() => {
    if (pendingAction === 'create-breaking' || pendingAction === 'create') {
      setPendingAction(null)
      openCreateForm()
    }
  }, [pendingAction, setPendingAction])

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const res = await authFetchJSON(`/api/admin/news/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, adminId: currentUser?.id }),
      })
      if (!res.ok) throw new Error()
      toast.success(`News ${status}`)
      fetchNews()
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleReject = async () => {
    await handleStatusChange(rejectId, 'rejected')
    setRejectDialogOpen(false)
    setRejectReason('')
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this news?')) return
    try {
      await authFetch(`/api/admin/news/${id}`, { method: 'DELETE' })
      toast.success('News deleted')
      fetchNews()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const openCreateForm = () => {
    setEditItemId(null)
    setFormMode('create')
  }

  const openEditForm = (id: string) => {
    setEditItemId(id)
    setFormMode('edit')
  }

  const handleFormSave = async (formData: Record<string, unknown>) => {
    try {
      if (editItemId) {
        const res = await authFetchJSON(`/api/admin/news/${editItemId}`, {
          method: 'PUT',
          body: JSON.stringify({ ...formData, updatedBy: currentUser?.id }),
        })
        if (!res.ok) throw new Error()
        toast.success('News updated successfully')
      } else {
        const res = await authFetchJSON('/api/admin/news', {
          method: 'POST',
          body: JSON.stringify({ ...formData, createdBy: currentUser?.id }),
        })
        if (!res.ok) throw new Error()
        toast.success('News created successfully')
      }
      setFormMode('list')
      setEditItemId(null)
    } catch {
      toast.error('Failed to save news')
    }
  }

  const handleFormCancel = () => {
    setFormMode('list')
    setEditItemId(null)
  }

  const totalPages = Math.ceil(total / limit)

  // Show full-page form for create/edit
  if (formMode === 'create' || formMode === 'edit') {
    return (
      <NewsFormPage
        key={editItemId || 'create'}
        editItemId={editItemId}
        onSave={handleFormSave}
        onCancel={handleFormCancel}
        categories={categories}
        states={states}
        districts={districts}
        mandals={mandals}
        reporters={reporters}
        tags={tags}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">News Management</h1>
          <p className="text-sm text-muted-foreground">{total} total articles</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700" onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-2" /> Create News
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All News</TabsTrigger>
          <TabsTrigger value="pending">Pending Review</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search news..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending_review">Pending</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Priority" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="breaking">Breaking</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="min-w-[250px]">Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>District</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Views</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {news.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        {item.thumbnailUrl || (item.imagesUrls?.length > 0) ? (
                          <img src={item.thumbnailUrl || item.imagesUrls[0]} alt="" className="w-10 h-10 rounded object-cover bg-muted" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">N</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium max-w-[300px] truncate">{item.title}</div>
                        {item.tags?.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {item.tags.slice(0, 3).map(t => (
                              <span key={t.tag.slug} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{t.tag.name}</span>
                            ))}
                            {item.tags.length > 3 && <span className="text-[10px] text-muted-foreground">+{item.tags.length - 3}</span>}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" style={{ borderColor: item.category?.color, color: item.category?.color }}>
                          {item.category?.name}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.district?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge className={priorityColors[item.priority] || ''}>{item.priority}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[item.status] || ''}>{item.status.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item.viewsCount?.toLocaleString()}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {item.status === 'pending_review' && (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-green-600" onClick={() => handleStatusChange(item.id, 'published')}>
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => { setRejectId(item.id); setRejectDialogOpen(true) }}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditForm(item.id)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDelete(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {news.length === 0 && (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No news found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject News</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label>Rejection Reason</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Enter reason for rejection..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject}>Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Full-Page News Form Component
// ============================================================
function NewsFormPage({
  editItemId, onSave, onCancel, categories, states, districts, mandals, reporters, tags,
}: {
  editItemId: string | null
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
  categories: Category[]
  states: State[]
  districts: District[]
  mandals: Mandal[]
  reporters: Reporter[]
  tags: Tag[]
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    title: '', shortDesc: '', content: '', categoryId: '', stateId: '', districtId: '', mandalId: '',
    thumbnailUrl: '', imagesUrls: [] as string[], videoUrl: '', sourceType: 'original', reporterId: '',
    priority: 'normal', status: 'draft', isFeatured: false, sendNotification: true, tagIds: [] as string[],
    externalLink: '', scheduledAt: '',
  })
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pageLoading, setPageLoading] = useState(!!editItemId)

  // Gemini AI state
  const [aiState, setAiState] = useState<{
    aiTitle?: string | null
    aiShortDesc?: string | null
    aiContent?: string | null
    aiStatus?: string | null
  }>({})
  const [generatingAI, setGeneratingAI] = useState(false)
  const [actingAI, setActingAI] = useState(false)

  // Crop state
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop>({ unit: '%', width: 50, height: 50, x: 25, y: 25 })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null)
  const [uploadTarget, setUploadTarget] = useState<'thumbnail' | 'image'>('thumbnail')
  const imgRef = useRef<HTMLImageElement>(null)

  // Load edit data
  useEffect(() => {
    if (editItemId && !loaded) {
      authFetchJson<Record<string, unknown>>(`/api/admin/news/${editItemId}`)
        .then(data => {
          // Robustly extract tag IDs from the API response
          const tagIds = Array.isArray(data.tags)
            ? data.tags
              .map((t: Record<string, unknown>) => {
                const tag = t.tag as Record<string, unknown> | undefined
                return tag?.id as string | undefined
              })
              .filter((id: string | undefined): id is string => !!id)
            : []

          setForm({
            title: data.title || '',
            shortDesc: data.shortDesc || '',
            content: data.content || '',
            categoryId: data.categoryId || '',
            stateId: data.stateId || '',
            districtId: data.districtId || '',
            mandalId: data.mandalId || '',
            thumbnailUrl: data.thumbnailUrl || '',
            imagesUrls: Array.isArray(data.imagesUrls) ? data.imagesUrls : [],
            videoUrl: data.videoUrl || '',
            sourceType: data.sourceType || 'original',
            reporterId: data.reporterId || '',
            priority: data.priority || 'normal',
            status: data.status || 'draft',
            isFeatured: data.isFeatured || false,
            sendNotification: data.sendNotification !== false,
            tagIds,
            externalLink: data.externalLink || '',
            scheduledAt: data.scheduledAt ? new Date(new Date(data.scheduledAt as string).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '',
          })
          setAiState({
            aiTitle: (data.aiTitle as string) || null,
            aiShortDesc: (data.aiShortDesc as string) || null,
            aiContent: (data.aiContent as string) || null,
            aiStatus: (data.aiStatus as string) || null,
          })
          setLoaded(true)
          setPageLoading(false)
        })
        .catch(() => {
          toast.error('Failed to load news data')
          setPageLoading(false)
        })
    } else if (!editItemId) {
      setLoaded(true)
      setPageLoading(false)
    }
  }, [editItemId, loaded])

  const handleGenerateAIRewrite = async () => {
    if (!editItemId) {
      toast.error('Please save the article first before generating AI rewrite')
      return
    }
    setGeneratingAI(true)
    try {
      const res = await authFetch(`/api/admin/news/${editItemId}/ai-rewrite`, { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.news) {
        setAiState({
          aiTitle: data.news.aiTitle,
          aiShortDesc: data.news.aiShortDesc,
          aiContent: data.news.aiContent,
          aiStatus: data.news.aiStatus,
        })
        toast.success('✨ AI Rewrite generated successfully!')
      } else {
        toast.error(data.error || 'Failed to generate AI rewrite')
      }
    } catch {
      toast.error('AI Rewrite generation failed')
    } finally {
      setGeneratingAI(false)
    }
  }

  const handleApplyAISuggestions = async () => {
    if (!aiState.aiTitle) return
    setActingAI(true)
    try {
      updateField('title', aiState.aiTitle)
      if (aiState.aiShortDesc) updateField('shortDesc', aiState.aiShortDesc)
      if (aiState.aiContent) updateField('content', aiState.aiContent)

      if (editItemId) {
        await authFetch(`/api/admin/news/${editItemId}/ai-rewrite`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'accept' }),
        })
      }
      setAiState(prev => ({ ...prev, aiStatus: 'accepted' }))
      toast.success('✨ Applied AI Suggestions to News Article!')
    } catch {
      toast.error('Failed to apply AI suggestions')
    } finally {
      setActingAI(false)
    }
  }

  const handleDeclineAISuggestions = async () => {
    setActingAI(true)
    try {
      if (editItemId) {
        await authFetch(`/api/admin/news/${editItemId}/ai-rewrite`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'decline' }),
        })
      }
      setAiState(prev => ({ ...prev, aiStatus: 'declined' }))
      toast.info('AI Suggestions declined')
    } catch {
      toast.error('Failed to decline AI suggestions')
    } finally {
      setActingAI(false)
    }
  }

  const updateField = (key: string, value: unknown) => setForm(prev => ({ ...prev, [key]: value }))

  const extractYoutubeThumbnail = (url: string): string | null => {
    if (!url) return null
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/
    const match = url.match(regExp)
    if (match && match[2].length === 11) {
      return `https://img.youtube.com/vi/${match[2]}/hqdefault.jpg`
    }
    return null
  }

  const handleVideoUrlChange = (url: string) => {
    updateField('videoUrl', url)
    const ytThumb = extractYoutubeThumbnail(url)
    if (ytThumb && (!form.thumbnailUrl || (form.thumbnailUrl as string).startsWith('https://img.youtube.com/'))) {
      updateField('thumbnailUrl', ytThumb)
    }
  }

  const handleThumbnailUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result?.toString() || null)
        setUploadTarget('thumbnail')
        setCropModalOpen(true)
      })
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const handleMultipleImagesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const currentImages = (form.imagesUrls as string[]) || []
    if (currentImages.length >= 5) {
      toast.error('Maximum 5 images allowed per article')
      return
    }

    const availableSlots = 5 - currentImages.length
    const filesToUpload = files.slice(0, availableSlots)
    if (files.length > availableSlots) {
      toast.info(`Only uploading the first ${availableSlots} images (max 5 allowed)`)
    }

    setUploadingImages(true)
    let addedCount = 0
    const newUrls: string[] = []

    for (const file of filesToUpload) {
      if (file.size > 25 * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds 25MB limit and was skipped`)
        continue
      }
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: formData })
        if (res.ok) {
          const data = await res.json()
          if (data.url) {
            newUrls.push(data.url)
            addedCount++
          }
        }
      } catch (err) {
        console.error('Image upload error:', err)
      }
    }

    if (newUrls.length > 0) {
      const updated = [...currentImages, ...newUrls]
      updateField('imagesUrls', updated)
      if (!form.thumbnailUrl) {
        updateField('thumbnailUrl', newUrls[0])
      }
      toast.success(`${addedCount} image(s) uploaded successfully!`)
    } else {
      toast.error('Failed to upload selected images')
    }
    setUploadingImages(false)
    if (e.target) e.target.value = ''
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = (file.name.split('.').pop() || '').toLowerCase()
    const isVideo = file.type.startsWith('video/') || ['mp4', 'webm', 'mov', '3gp', 'mkv', 'avi'].includes(ext)
    if (!isVideo) {
      toast.error('Please select a valid video file (.mp4, .mov, .webm, .3gp)')
      return
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error(`Video file too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Max 100MB allowed.`)
      return
    }

    setUploadingVideo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authFetch('/api/admin/media/upload', {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        const data = await res.json()
        updateField('videoUrl', data.url)
        toast.success('Video uploaded successfully!')
      } else {
        const errData = await res.json().catch(() => ({ error: 'Upload failed' }))
        toast.error(errData.error || 'Video upload failed')
      }
    } catch {
      toast.error('Video upload network error')
    } finally {
      setUploadingVideo(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleImagesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const currentImages = (form.imagesUrls as string[]) || []
      if (currentImages.length >= 5) {
        toast.error('Maximum 5 images allowed')
        return
      }
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result?.toString() || null)
        setUploadTarget('image')
        setCropModalOpen(true)
      })
      reader.readAsDataURL(e.target.files[0])
    }
  }

  const getCroppedImg = async (): Promise<Blob | null> => {
    const image = imgRef.current
    if (!image || !completedCrop) return null

    const canvas = document.createElement('canvas')
    const scaleX = image.naturalWidth / image.width
    const scaleY = image.naturalHeight / image.height

    // Set canvas dimensions to the actual high-resolution cropped size
    const destWidth = completedCrop.width * scaleX
    const destHeight = completedCrop.height * scaleY

    // Upscale if the crop is too small to prevent blurriness on mobile devices
    const pixelRatio = destWidth < 800 ? 800 / destWidth : 1

    canvas.width = Math.floor(destWidth * pixelRatio)
    canvas.height = Math.floor(destHeight * pixelRatio)

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.scale(pixelRatio, pixelRatio)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'

    ctx.drawImage(
      image,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      destWidth,
      destHeight
    )

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 1.0)
    })
  }

  const uploadCroppedImage = async () => {
    const croppedBlob = await getCroppedImg()
    if (!croppedBlob) {
      toast.error('Failed to crop image')
      return
    }

    if (uploadTarget === 'thumbnail') setUploadingThumbnail(true)
    else setUploadingImages(true)

    try {
      const formData = new FormData()
      formData.append('file', croppedBlob, 'cropped.jpg')
      const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        if (uploadTarget === 'thumbnail') {
          updateField('thumbnailUrl', data.url)
        } else {
          const currentImages = (form.imagesUrls as string[]) || []
          updateField('imagesUrls', [...currentImages, data.url])
        }
        toast.success('Image uploaded successfully')
        setCropModalOpen(false)
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      if (uploadTarget === 'thumbnail') setUploadingThumbnail(false)
      else setUploadingImages(false)
    }
  }

  const removeImage = (index: number) => {
    const current = (form.imagesUrls as string[]) || []
    updateField('imagesUrls', current.filter((_, i) => i !== index))
  }

  const toggleTag = (tagId: string) => {
    const current = (form.tagIds as string[]) || []
    if (current.includes(tagId)) {
      updateField('tagIds', current.filter(id => id !== tagId))
    } else {
      updateField('tagIds', [...current, tagId])
    }
  }

  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [pendingFormSubmit, setPendingFormSubmit] = useState(false)

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error('Title is required')
      return
    }
    if (!form.categoryId) {
      toast.error('Category is required')
      return
    }
    if (!form.stateId) {
      toast.error('State is required')
      return
    }

    if (form.status === 'scheduled' && !form.scheduledAt) {
      toast.error('Scheduled Date & Time is required when status is scheduled')
      return
    }

    if (form.status === 'published' && form.sendNotification !== false && !pendingFormSubmit) {
      setShowNotificationDialog(true)
      return
    }

    await executeSubmit()
  }

  const executeSubmit = async () => {
    setSaving(true)
    try {
      await onSave(form)
      setPendingFormSubmit(false)
    } finally {
      setSaving(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onCancel} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{editItemId ? 'Edit News' : 'Create News'}</h1>
          <p className="text-sm text-muted-foreground">
            {editItemId ? 'Update the news article details below' : 'Fill in the details to create a new news article'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-5">
              {/* Gemini AI Suggested Rewrite Card */}
              <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/60 via-indigo-50/40 to-purple-50/30 dark:from-purple-950/30 dark:to-indigo-950/20 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-sm">
                      <Sparkles className="h-4 w-4 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1.5">
                        Gemini AI Professional Rewrite Suggestions
                        {aiState.aiStatus === 'accepted' && (
                          <Badge className="bg-green-600 text-white text-[10px] px-1.5">Accepted</Badge>
                        )}
                        {aiState.aiStatus === 'declined' && (
                          <Badge className="bg-gray-500 text-white text-[10px] px-1.5">Declined</Badge>
                        )}
                      </h4>
                      <p className="text-xs text-purple-700/80 dark:text-purple-300/70">
                        AI-crafted professional Telugu headline & journalistic prose
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateAIRewrite}
                    disabled={generatingAI || !editItemId}
                    className="border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-900/40 text-xs font-semibold"
                  >
                    {generatingAI ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        Writing with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1 text-purple-600" />
                        {aiState.aiTitle ? 'Re-Generate AI' : 'Generate AI Rewrite'}
                      </>
                    )}
                  </Button>
                </div>

                {aiState.aiTitle ? (
                  <div className="space-y-3 pt-2 border-t border-purple-200/60 dark:border-purple-900/40">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                        Suggested Title (శీర్షిక):
                      </span>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-100 bg-white/90 dark:bg-gray-900/80 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/30">
                        {aiState.aiTitle}
                      </p>
                    </div>

                    {aiState.aiContent && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                          Suggested Content (వివరణ):
                        </span>
                        <div className="text-xs text-gray-700 dark:text-gray-300 bg-white/90 dark:bg-gray-900/80 p-3 rounded-lg border border-purple-100 dark:border-purple-900/30 max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {aiState.aiContent}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleApplyAISuggestions}
                        disabled={actingAI}
                        className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs flex-1"
                      >
                        {actingAI ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1" />}
                        Apply AI Suggestions to News
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleDeclineAISuggestions}
                        disabled={actingAI}
                        className="text-gray-500 hover:text-gray-700 text-xs"
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-purple-600/80 italic pt-1">
                    {editItemId
                      ? 'No AI rewrite generated yet. Click "Generate AI Rewrite" above to generate a professional Telugu title and content using Gemini API.'
                      : 'Save the draft first to enable automatic Gemini AI professional rewrite suggestions.'}
                  </p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Title *</Label>
                <Input
                  value={form.title as string}
                  onChange={(e) => updateField('title', e.target.value)}
                  placeholder="Enter news title"
                  className="text-base"
                />
              </div>

              {/* Short Description */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Short Description</Label>
                <Textarea
                  value={form.shortDesc as string}
                  onChange={(e) => updateField('shortDesc', e.target.value)}
                  rows={2}
                  placeholder="Brief summary (max 500 chars)"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground">{(form.shortDesc as string)?.length || 0}/500 characters</p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Full Content</Label>
                <Textarea
                  value={form.content as string}
                  onChange={(e) => updateField('content', e.target.value)}
                  rows={8}
                  placeholder="Detailed news content (optional)"
                  className="min-h-[200px]"
                />
              </div>

              {/* Article Media (1 to 5 Images) */}
              <div className="space-y-4 rounded-lg border p-4 bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <ImageIcon className="h-4 w-4 text-red-600" />
                      Article Images (1 to 5 Images)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Upload between 1 and 5 images. The first image or designated cover acts as the thumbnail.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <Button
                        type="button"
                        variant="default"
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white font-medium"
                        disabled={uploadingImages || (form.imagesUrls as string[]).length >= 5}
                        asChild
                      >
                        <span>
                          {uploadingImages ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4 mr-1.5" />
                          )}
                          {uploadingImages ? 'Uploading...' : 'Add Images (1-5)'}
                        </span>
                      </Button>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleMultipleImagesUpload}
                        disabled={uploadingImages || (form.imagesUrls as string[]).length >= 5}
                      />
                    </label>

                    <label className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingThumbnail || (form.imagesUrls as string[]).length >= 5}
                        asChild
                      >
                        <span>
                          {uploadingThumbnail ? (
                            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 mr-1.5" />
                          )}
                          Crop & Add
                        </span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>Uploaded: <strong className="text-foreground">{(form.imagesUrls as string[]).length} of 5</strong> images</span>
                  {(form.imagesUrls as string[]).length === 0 && (
                    <span className="text-amber-600 font-medium">Please add at least 1 image for the article</span>
                  )}
                </div>

                {/* Uploaded Images Grid (1 to 5) */}
                {(form.imagesUrls as string[]).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                    {(form.imagesUrls as string[]).map((url, i) => {
                      const isCover = form.thumbnailUrl === url || (!form.thumbnailUrl && i === 0)
                      return (
                        <div
                          key={i}
                          className={`relative group rounded-lg overflow-hidden border-2 transition-all ${isCover ? 'border-red-600 shadow-md ring-2 ring-red-200' : 'border-gray-200'
                            }`}
                        >
                          <img
                            src={url}
                            alt={`Article Image ${i + 1}`}
                            className="h-28 w-full object-cover"
                          />
                          {/* Cover Badge */}
                          {isCover && (
                            <span className="absolute top-1.5 left-1.5 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow">
                              Cover
                            </span>
                          )}

                          {/* Hover Actions */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-1.5">
                            <div className="flex justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  removeImage(i)
                                  if (form.thumbnailUrl === url) {
                                    const remaining = (form.imagesUrls as string[]).filter((_, idx) => idx !== i)
                                    updateField('thumbnailUrl', remaining[0] || '')
                                  }
                                }}
                                className="bg-red-600 text-white rounded-full p-1 hover:bg-red-700 shadow"
                                title="Delete image"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {!isCover && (
                              <button
                                type="button"
                                onClick={() => updateField('thumbnailUrl', url)}
                                className="w-full text-[11px] bg-white/90 hover:bg-white text-gray-800 font-semibold py-1 rounded shadow"
                              >
                                Set as Cover
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Direct Thumbnail URL Override */}
                <div className="pt-2">
                  <Label className="text-xs text-muted-foreground">Primary Cover URL (auto-set from images above or paste direct link):</Label>
                  <Input
                    value={form.thumbnailUrl as string}
                    onChange={(e) => updateField('thumbnailUrl', e.target.value)}
                    placeholder="Cover thumbnail URL"
                    className="text-xs h-8 mt-1"
                  />
                </div>
              </div>

              {/* Video URL & Video File Upload */}
              <div className="space-y-3 rounded-lg border p-4 bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <Label className="text-sm font-semibold flex items-center gap-1.5">
                      <Upload className="h-4 w-4 text-red-600" />
                      Video Attachment (optional)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Upload an MP4 / MOV video file (max 100MB) or paste a YouTube / direct video URL.
                    </p>
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
                          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4 mr-1.5" />
                        )}
                        {uploadingVideo ? 'Uploading Video...' : 'Upload Video File'}
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/3gpp,video/*"
                      className="hidden"
                      onChange={handleVideoUpload}
                      disabled={uploadingVideo}
                    />
                  </label>
                </div>

                <Input
                  value={form.videoUrl as string}
                  onChange={(e) => handleVideoUrlChange(e.target.value)}
                  placeholder="https://youtube.com/watch?v=... or click Upload Video File"
                />

                {(form.videoUrl as string) && (
                  <div className="flex items-center justify-between p-2.5 bg-background rounded-md border text-xs">
                    <div className="flex items-center gap-2 truncate max-w-[80%]">
                      <span className="font-semibold text-emerald-600">Attached:</span>
                      <span className="truncate text-muted-foreground font-mono">{form.videoUrl as string}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateField('videoUrl', '')}
                      className="text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* External Link */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">External Link (optional)</Label>
                <Input
                  value={form.externalLink as string}
                  onChange={(e) => updateField('externalLink', e.target.value)}
                  placeholder="https://... (e.g. source link)"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-sm">Publish Settings</h3>

              {/* Category */}
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={form.categoryId as string} onValueChange={(v) => updateField('categoryId', v)}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* State */}
              <div className="space-y-2">
                <Label>State *</Label>
                <Select value={(form.stateId as string) || 'none'} onValueChange={(v) => {
                  const newStateId = v === 'none' ? '' : v
                  updateField('stateId', newStateId)
                  // Reset district when state changes
                  updateField('districtId', '')
                }}>
                  <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select state</SelectItem>
                    {states.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* District */}
              <div className="space-y-2">
                <Label>District</Label>
                <Select value={(form.districtId as string) || 'none'} onValueChange={(v) => { updateField('districtId', v === 'none' ? '' : v); updateField('mandalId', '') }}>
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No District</SelectItem>
                    {(form.stateId && form.stateId !== 'none'
                      ? districts.filter(d => d.stateId === form.stateId)
                      : districts
                    ).map(d => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mandal Dropdown */}
              <div className="space-y-2">
                <Label>Mandal</Label>
                <Select value={(form.mandalId as string) || 'none'} onValueChange={(v) => updateField('mandalId', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select mandal" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Mandal</SelectItem>
                    {(form.districtId && form.districtId !== 'none'
                      ? mandals.filter(m => m.districtId === form.districtId)
                      : mandals
                    ).map(m => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority as string} onValueChange={(v) => updateField('priority', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="breaking">Breaking</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status as string} onValueChange={(v) => updateField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending_review">Submit for Review</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Publish</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Scheduled At */}
              {form.status === 'scheduled' && (
                <div className="space-y-2 pt-2">
                  <Label>Scheduled Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={form.scheduledAt as string}
                    onChange={(e) => updateField('scheduledAt', e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Select when the news should automatically be published.</p>
                </div>
              )}

              {/* Featured toggle */}
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={form.isFeatured as boolean} onCheckedChange={(v) => updateField('isFeatured', v)} />
                <Label>Featured / Breaking</Label>
              </div>

              {/* Notification toggle */}
              <div className="flex items-center gap-3 pt-2">
                <Switch checked={form.sendNotification as boolean} onCheckedChange={(v) => updateField('sendNotification', v)} />
                <Label>Send Push Notification (if published)</Label>
              </div>
            </CardContent>
          </Card>

          {/* Source & Reporter */}
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-sm">Source & Reporter</h3>

              <div className="space-y-2">
                <Label>Source Type</Label>
                <Select value={form.sourceType as string} onValueChange={(v) => updateField('sourceType', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="original">Original</SelectItem>
                    <SelectItem value="reporter">Reporter</SelectItem>
                    <SelectItem value="rss">RSS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Reporter</Label>
                <Select value={(form.reporterId as string) || 'none'} onValueChange={(v) => updateField('reporterId', v === 'none' ? '' : v)}>
                  <SelectTrigger><SelectValue placeholder="Select reporter" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {reporters.map(r => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          {tags.length > 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-6 space-y-3">
                <h3 className="font-semibold text-sm">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => {
                    const selected = ((form.tagIds as string[]) || []).includes(tag.id)
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => toggleTag(tag.id)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${selected
                            ? 'bg-red-50 border-red-300 text-red-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                          }`}
                      >
                        {tag.name}
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleSubmit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editItemId ? 'Update' : 'Create'}
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={cropModalOpen} onOpenChange={setCropModalOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crop Image</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center max-h-[60vh] overflow-auto">
            {imageToCrop && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => setCrop(percentCrop)}
                onComplete={(c) => setCompletedCrop(c)}
                aspect={uploadTarget === 'thumbnail' ? 16 / 9 : undefined}
              >
                <img ref={imgRef} src={imageToCrop} alt="Crop" style={{ maxHeight: '50vh' }} />
              </ReactCrop>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCropModalOpen(false)}>Cancel</Button>
            <Button onClick={uploadCroppedImage} disabled={uploadingThumbnail || uploadingImages}>
              {(uploadingThumbnail || uploadingImages) ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Crop & Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showNotificationDialog} onOpenChange={setShowNotificationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Push Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to send a push notification to users about this news?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              updateField('sendNotification', false)
              setShowNotificationDialog(false)
              setPendingFormSubmit(true)
              setTimeout(() => executeSubmit(), 0)
            }}>
              No, don't send
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowNotificationDialog(false)
              setPendingFormSubmit(true)
              setTimeout(() => executeSubmit(), 0)
            }} className="bg-red-600 hover:bg-red-700">
              Yes, send notification
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
