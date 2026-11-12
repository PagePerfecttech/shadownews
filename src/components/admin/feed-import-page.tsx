'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Rss,
  Sparkles,
  Bot,
  MapPin,
  Tag,
  FolderOpen,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Layers,
  ArrowRight,
  Clock,
  CheckCheck,
  Globe,
  Radio,
  FileText,
  Zap,
  Play,
  Copy,
  ChevronRight,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { authFetch, authFetchJson } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { TELUGU_FEED_SOURCES, type TeluguFeedSource } from '@/lib/feed-sources'

interface PreviewItem {
  id: string
  title: string
  link: string
  pubDate: string
  publishedAt: string
  description: string
  content?: string
  sourceName?: string
  categoryHint?: string
  thumbnailUrl: string
  isAlreadyImported: boolean
}

interface CategoryOption {
  id: string
  name: string
  slug: string
  color?: string
}

interface StateOption {
  id: string
  name: string
  code: string
}

interface DistrictOption {
  id: string
  name: string
  stateId: string
}

interface HistoryItem {
  id: string
  title: string
  shortDesc?: string
  aiTitle?: string
  aiStatus?: string
  sourceType: string
  sourceUrl?: string
  thumbnailUrl: string
  status: string
  createdAt: string
  publishedAt?: string
  category?: { id: string; name: string; slug: string; color?: string }
  state?: { id: string; name: string; code: string }
  district?: { id: string; name: string }
  tags?: { tag: { id: string; name: string } }[]
}

export default function FeedImportPage() {
  const { setActiveView } = useAppStore()

  // Feed & Sources State
  const [sources, setSources] = useState<TeluguFeedSource[]>(TELUGU_FEED_SOURCES)
  const [selectedSourceId, setSelectedSourceId] = useState<string>('gnews-te-top')
  const [customFeedUrl, setCustomFeedUrl] = useState<string>(
    'https://news.google.com/rss?hl=te&gl=IN&ceid=IN:te'
  )
  const [batchLimit, setBatchLimit] = useState<string>('10')

  // Categories & Location Metadata
  const [categories, setCategories] = useState<CategoryOption[]>([])
  const [states, setStates] = useState<StateOption[]>([])
  const [districts, setDistricts] = useState<DistrictOption[]>([])
  const [defaultCategoryId, setDefaultCategoryId] = useState<string>('')
  const [defaultStateId, setDefaultStateId] = useState<string>('')

  // Processing & Options
  const [targetStatus, setTargetStatus] = useState<'published' | 'draft'>('published')
  const [autoRewrite, setAutoRewrite] = useState<boolean>(true)
  const [autoCategory, setAutoCategory] = useState<boolean>(true)
  const [autoLocation, setAutoLocation] = useState<boolean>(true)

  // Preview & Selection State
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([])
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [fetchingPreview, setFetchingPreview] = useState<boolean>(false)

  // Import Execution State
  const [isImporting, setIsImporting] = useState<boolean>(false)
  const [importProgress, setImportProgress] = useState<number>(0)
  const [currentImportLog, setCurrentImportLog] = useState<string>('')
  const [importSummary, setImportSummary] = useState<{ imported: number; skipped: number } | null>(null)

  // History State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false)

  // Cron test state
  const [runningCronTest, setRunningCronTest] = useState<boolean>(false)
  const [cronTestResult, setCronTestResult] = useState<{ success: boolean; message: string } | null>(null)

  // 1. Initial Load of Metadata (categories, states, districts)
  const loadMetadata = useCallback(async () => {
    try {
      const data = await authFetchJson<{
        sources: TeluguFeedSource[]
        categories: CategoryOption[]
        states: StateOption[]
        districts: DistrictOption[]
      }>('/api/admin/feed-import/sources')

      if (data) {
        if (data.sources) setSources(data.sources)
        if (data.categories) {
          setCategories(data.categories)
          const pol = data.categories.find(c => c.slug === 'politics') || data.categories[0]
          if (pol) setDefaultCategoryId(pol.id)
        }
        if (data.states) {
          setStates(data.states)
          const tg = data.states.find(s => s.code === 'TG') || data.states[0]
          if (tg) setDefaultStateId(tg.id)
        }
        if (data.districts) setDistricts(data.districts)
      }
    } catch (err: any) {
      console.warn('Could not load feed metadata:', err)
    }
  }, [])

  // 2. Load History
  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true)
      const data = await authFetchJson<{ success: boolean; count: number; news: HistoryItem[] }>(
        '/api/admin/feed-import/history?limit=25'
      )
      if (data?.news) {
        setHistoryItems(data.news)
      }
    } catch {
      toast.error('Failed to load feed import history')
    } finally {
      setLoadingHistory(false)
    }
  }, [])

  useEffect(() => {
    loadMetadata()
    loadHistory()
  }, [loadMetadata, loadHistory])

  // Handle source preset change
  const handleSelectPreset = (source: TeluguFeedSource) => {
    setSelectedSourceId(source.id)
    setCustomFeedUrl(source.url)
    if (source.categorySlug && categories.length > 0) {
      const cat = categories.find(c => c.slug === source.categorySlug)
      if (cat) setDefaultCategoryId(cat.id)
    }
    if (source.stateCode && states.length > 0) {
      const st = states.find(s => s.code === source.stateCode)
      if (st) setDefaultStateId(st.id)
    }
    setPreviewItems([])
    setSelectedItemIds(new Set())
  }

  // 3. Fetch Feed Preview
  const handleFetchPreview = async () => {
    if (!customFeedUrl.trim()) {
      toast.error('Please enter a valid RSS feed URL')
      return
    }

    try {
      setFetchingPreview(true)
      setPreviewItems([])
      setSelectedItemIds(new Set())
      setImportSummary(null)

      const res = await authFetch('/api/admin/feed-import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedUrl: customFeedUrl.trim(),
          limit: parseInt(batchLimit, 10) || 10,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to fetch RSS feed')
      }

      const data = await res.json()
      const items: PreviewItem[] = data.items || []

      setPreviewItems(items)

      // Auto-select all new items by default
      const newIds = new Set<string>()
      items.forEach(i => {
        if (!i.isAlreadyImported) newIds.add(i.id)
      })
      setSelectedItemIds(newIds)

      toast.success(`Found ${items.length} stories (${newIds.size} new, ready for AI import)`)
    } catch (err: any) {
      toast.error(err.message || 'Error fetching feed')
    } finally {
      setFetchingPreview(false)
    }
  }

  // Toggle single item selection
  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Select all new items
  const selectAllNew = () => {
    const newIds = new Set<string>()
    previewItems.forEach(i => {
      if (!i.isAlreadyImported) newIds.add(i.id)
    })
    setSelectedItemIds(newIds)
  }

  const clearSelection = () => {
    setSelectedItemIds(new Set())
  }

  // 4. Perform Import with AI Rewrite
  const handleImportSelected = async () => {
    const itemsToImport = previewItems.filter(i => selectedItemIds.has(i.id))

    if (itemsToImport.length === 0) {
      toast.error('No items selected for import')
      return
    }

    try {
      setIsImporting(true)
      setImportProgress(10)
      setCurrentImportLog(`Initializing AI News Agent for ${itemsToImport.length} articles...`)

      // Chunk processing or single batch call
      setImportProgress(30)
      setCurrentImportLog('Contacting Google Gemini AI & classifying Telugu content...')

      const res = await authFetch('/api/admin/feed-import/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedUrl: customFeedUrl.trim(),
          items: itemsToImport,
          options: {
            autoRewrite,
            autoCategory,
            autoLocation,
            status: targetStatus,
            defaultCategoryId,
            defaultStateId,
          },
        }),
      })

      setImportProgress(85)
      setCurrentImportLog('Saving short news, linking tags & districts...')

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to import articles')
      }

      const data = await res.json()
      setImportProgress(100)
      setCurrentImportLog(`Completed! Successfully imported ${data.importedCount} articles.`)

      setImportSummary({
        imported: data.importedCount,
        skipped: data.skippedCount,
      })

      toast.success(
        `Imported ${data.importedCount} short news stories (${targetStatus === 'published' ? 'Live on App' : 'Saved as Draft'})!`
      )

      // Refresh history & update preview imported state
      loadHistory()

      const importedLinks = new Set(data.imported.map((x: any) => x.originalTitle))
      setPreviewItems(prev =>
        prev.map(item =>
          importedLinks.has(item.title) ? { ...item, isAlreadyImported: true } : item
        )
      )
      setSelectedItemIds(new Set())
    } catch (err: any) {
      toast.error(err.message || 'Import failed')
      setCurrentImportLog(`Error: ${err.message}`)
    } finally {
      setIsImporting(false)
    }
  }

  // 5. Test Background Cron
  const handleTestCron = async () => {
    try {
      setRunningCronTest(true)
      setCronTestResult(null)

      const res = await authFetch('/api/admin/feed-import/cron', {
        method: 'POST',
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setCronTestResult({
          success: true,
          message: `Cron executed cleanly: ${data.importedCount} new stories imported, ${data.skippedCount} duplicates skipped.`,
        })
        loadHistory()
      } else {
        setCronTestResult({
          success: false,
          message: data.error || 'Cron test returned non-success response',
        })
      }
    } catch (err: any) {
      setCronTestResult({
        success: false,
        message: err.message || 'Failed to trigger cron test',
      })
    } finally {
      setRunningCronTest(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-red-600/10 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <Rss className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                Content Feed Import & AI News Agent
                <Badge variant="outline" className="border-red-500/30 text-red-600 bg-red-500/10 text-xs py-0.5">
                  Telugu Auto-Crawler
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Import articles from top Telugu portals, auto-rewrite into short news via AI, categorize, and tag districts.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView('news')}
            className="text-xs"
          >
            <Eye className="h-3.5 w-3.5 mr-1.5" />
            View Live News Feed
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={loadHistory}
            disabled={loadingHistory}
            className="text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingHistory ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="importer" className="space-y-6">
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="importer" className="flex items-center gap-1.5 text-xs font-semibold">
            <Rss className="h-3.5 w-3.5" />
            Feed Importer
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5 text-xs font-semibold">
            <Layers className="h-3.5 w-3.5" />
            Import History ({historyItems.length})
          </TabsTrigger>
          <TabsTrigger value="cron" className="flex items-center gap-1.5 text-xs font-semibold">
            <Radio className="h-3.5 w-3.5 text-red-500" />
            24/7 Auto Cron
          </TabsTrigger>
        </TabsList>

        {/* ======================================================== */}
        {/* TAB 1: FEED IMPORTER WORKSPACE */}
        {/* ======================================================== */}
        <TabsContent value="importer" className="space-y-6">
          {/* 1. Curated Sources Selector */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-600" />
                    1. Select Verified Telugu News Source
                  </CardTitle>
                  <CardDescription>
                    Choose a pre-configured feed from top Telugu portals or enter any custom RSS/Atom URL below.
                  </CardDescription>
                </div>
                <Badge variant="secondary" className="text-xs font-mono">
                  {sources.length} Verified Sources
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {sources.map(src => {
                  const isSelected = selectedSourceId === src.id
                  return (
                    <button
                      key={src.id}
                      type="button"
                      onClick={() => handleSelectPreset(src)}
                      className={`text-left p-2.5 rounded-xl border transition-all text-xs flex flex-col justify-between ${
                        isSelected
                          ? 'border-red-600 bg-red-50/70 dark:bg-red-950/30 dark:border-red-500 ring-2 ring-red-600/20'
                          : 'border-border/70 hover:border-border hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider"
                          style={{ backgroundColor: src.badgeColor }}
                        >
                          {src.iconText}
                        </span>
                        {src.stateCode !== 'ALL' && (
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                            {src.stateCode}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-foreground truncate mt-1">{src.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate">{src.nameTe}</div>
                    </button>
                  )
                })}
              </div>

              {/* Feed URL input */}
              <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row items-center gap-3">
                <div className="flex-1 w-full space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Active Feed URL (RSS / Atom / XML)</Label>
                  <div className="relative">
                    <Rss className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={customFeedUrl}
                      onChange={e => {
                        setCustomFeedUrl(e.target.value)
                        setSelectedSourceId('custom')
                      }}
                      placeholder="https://example.com/rss/telugu-news.xml"
                      className="pl-9 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="w-full sm:w-32 space-y-1">
                  <Label className="text-xs font-medium text-muted-foreground">Articles to Fetch</Label>
                  <Select value={batchLimit} onValueChange={setBatchLimit}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Limit" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 Stories</SelectItem>
                      <SelectItem value="10">10 Stories</SelectItem>
                      <SelectItem value="15">15 Stories</SelectItem>
                      <SelectItem value="25">25 Stories</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-auto pt-5">
                  <Button
                    onClick={handleFetchPreview}
                    disabled={fetchingPreview}
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
                  >
                    {fetchingPreview ? (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        Fetching...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        Fetch & Inspect Feed
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. AI Agent & Processing Options */}
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-purple-600" />
                2. AI Short News Agent & Auto-Tagging Controls
              </CardTitle>
              <CardDescription>
                Configure the intelligence pipeline that rewrites long articles into 60-80 word short news and tags them automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* AI Short News Rewriting */}
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground cursor-pointer">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                      AI Short News Rewriter
                    </Label>
                    <Switch checked={autoRewrite} onCheckedChange={setAutoRewrite} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Rewrites raw article into 60-80 word punchy Telugu summary with engaging headline. Removes external media credits.
                  </p>
                </div>

                {/* Auto Categorization */}
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground cursor-pointer">
                      <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
                      Auto-Categorize
                    </Label>
                    <Switch checked={autoCategory} onCheckedChange={setAutoCategory} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Classifies story into Politics, Crime, Sports, Cinema, Business, Agriculture, Health, Tech, etc.
                  </p>
                </div>

                {/* Auto Location Tagging */}
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground cursor-pointer">
                      <MapPin className="h-3.5 w-3.5 text-red-500" />
                      Auto-Tag Location
                    </Label>
                    <Switch checked={autoLocation} onCheckedChange={setAutoLocation} />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Scans all 33 Telangana & 26 AP districts to auto-assign State, District, and hyperlocal tags.
                  </p>
                </div>
              </div>

              {/* Target Status & Fallbacks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">Publishing Status</Label>
                  <Select value={targetStatus} onValueChange={(val: any) => setTargetStatus(val)}>
                    <SelectTrigger className="text-xs font-semibold">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          Publish Immediately (Live on App)
                        </span>
                      </SelectItem>
                      <SelectItem value="draft">
                        <span className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-amber-500" />
                          Save as Draft (Review Before Live)
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">Fallback Category</Label>
                  <Select value={defaultCategoryId} onValueChange={setDefaultCategoryId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1 block">Fallback State</Label>
                  <Select value={defaultStateId} onValueChange={setDefaultStateId}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select State" />
                    </SelectTrigger>
                    <SelectContent>
                      {states.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 3. Live Import Progress Banner (if active) */}
          {isImporting && (
            <Card className="border-red-600/30 bg-red-50/50 dark:bg-red-950/20 shadow-md animate-pulse">
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="flex items-center gap-2 text-red-700 dark:text-red-400">
                    <RefreshCw className="h-4 w-4 animate-spin text-red-600" />
                    {currentImportLog || 'AI News Agent is processing and rewriting articles...'}
                  </span>
                  <span className="font-mono text-red-800 dark:text-red-300">{importProgress}%</span>
                </div>
                <Progress value={importProgress} className="h-2 bg-red-200 dark:bg-red-950" />
              </CardContent>
            </Card>
          )}

          {/* 4. Import Summary Result (if finished) */}
          {importSummary && !isImporting && (
            <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div className="text-xs text-emerald-900 dark:text-emerald-200">
                  <span className="font-bold">Import Batch Finished! </span>
                  Successfully imported <strong>{importSummary.imported}</strong> stories into Shadow News
                  {importSummary.skipped > 0 && ` (${importSummary.skipped} duplicate stories skipped)`}.
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveView('news')}
                className="text-xs border-emerald-400 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-200 shrink-0"
              >
                Inspect in News Manager
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          )}

          {/* 5. Fetched Feed Items Preview */}
          {previewItems.length > 0 && (
            <Card className="border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCheck className="h-4 w-4 text-emerald-600" />
                      3. Select Stories to Import ({selectedItemIds.size} of {previewItems.length} selected)
                    </CardTitle>
                    <CardDescription>
                      Check the stories you want to import. Existing stories are automatically greyed out.
                    </CardDescription>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllNew} className="text-xs h-8">
                      Select All New
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearSelection} className="text-xs h-8">
                      Clear
                    </Button>
                    <Button
                      onClick={handleImportSelected}
                      disabled={isImporting || selectedItemIds.size === 0}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs h-8 px-4"
                    >
                      <Bot className="h-3.5 w-3.5 mr-1.5" />
                      Import & AI Rewrite ({selectedItemIds.size})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {previewItems.map(item => {
                    const isSelected = selectedItemIds.has(item.id)
                    const isImported = item.isAlreadyImported

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-xl border transition-all flex gap-3 text-xs ${
                          isImported
                            ? 'opacity-60 bg-muted/40 border-dashed border-border'
                            : isSelected
                            ? 'border-red-600 bg-red-50/30 dark:bg-red-950/20 shadow-sm'
                            : 'border-border hover:border-border/80 bg-card'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className="pt-0.5">
                          <Checkbox
                            checked={isSelected}
                            disabled={isImported || isImporting}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                            className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                          />
                        </div>

                        {/* Thumbnail */}
                        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 bg-muted border relative">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              onError={e => {
                                ;(e.target as HTMLImageElement).src =
                                  'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400'
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                              No Image
                            </div>
                          )}
                        </div>

                        {/* Content details */}
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                              {isImported ? (
                                <Badge variant="secondary" className="text-[10px] py-0 bg-muted text-muted-foreground">
                                  Already Imported
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] py-0 border-emerald-500/40 text-emerald-600 bg-emerald-50/50">
                                  New Story
                                </Badge>
                              )}

                              {item.sourceName && (
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  {item.sourceName}
                                </span>
                              )}

                              {item.categoryHint && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                                  {item.categoryHint}
                                </span>
                              )}
                            </div>

                            <h3 className="font-semibold text-foreground line-clamp-2 leading-snug">
                              {item.title}
                            </h3>

                            <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">
                              {item.description}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-1 border-t text-[10px] text-muted-foreground">
                            <span>{new Date(item.pubDate || item.publishedAt).toLocaleDateString()}</span>
                            {item.link && (
                              <a
                                href={item.link}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center hover:text-red-600 underline"
                              >
                                View Source <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Bottom CTA */}
                <div className="pt-3 border-t flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    Selected <strong>{selectedItemIds.size}</strong> stories ready for Telugu Short News AI processing.
                  </div>
                  <Button
                    onClick={handleImportSelected}
                    disabled={isImporting || selectedItemIds.size === 0}
                    className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Process & Auto-Import {selectedItemIds.size} Stories
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 2: IMPORTED ARTICLES HISTORY */}
        {/* ======================================================== */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="h-4 w-4 text-red-600" />
                    Recently Imported Feed Articles
                  </CardTitle>
                  <CardDescription>
                    Articles crawled from external Telugu feeds and rewritten into short news.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadHistory}
                  disabled={loadingHistory}
                  className="text-xs"
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loadingHistory ? 'animate-spin' : ''}`} />
                  Refresh History
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {historyItems.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-xs">
                  {loadingHistory ? 'Loading import history...' : 'No feed articles imported yet. Use the Importer tab to fetch stories.'}
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.map(item => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border bg-card flex flex-col sm:flex-row gap-3 text-xs hover:border-red-500/40 transition-colors"
                    >
                      {/* Thumbnail */}
                      <div className="w-24 h-20 rounded-lg overflow-hidden shrink-0 bg-muted border">
                        <img
                          src={item.thumbnailUrl}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={e => {
                            ;(e.target as HTMLImageElement).src =
                              'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=400'
                          }}
                        />
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {/* Category Badge */}
                            {item.category && (
                              <Badge
                                variant="outline"
                                className="text-[10px] py-0 text-white"
                                style={{ backgroundColor: item.category.color || '#2563EB', borderColor: item.category.color }}
                              >
                                {item.category.name}
                              </Badge>
                            )}

                            {/* Location Badge */}
                            {item.district ? (
                              <Badge variant="outline" className="text-[10px] py-0 border-red-500/30 text-red-600 bg-red-50/40">
                                <MapPin className="h-2.5 w-2.5 mr-1 text-red-500" />
                                {item.district.name} ({item.state?.code || 'TG'})
                              </Badge>
                            ) : item.state ? (
                              <Badge variant="outline" className="text-[10px] py-0">
                                <MapPin className="h-2.5 w-2.5 mr-1" />
                                {item.state.name}
                              </Badge>
                            ) : null}

                            {/* AI Badge */}
                            <Badge
                              variant="secondary"
                              className={`text-[10px] py-0 ${
                                item.aiStatus === 'generated'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                  : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              <Bot className="h-2.5 w-2.5 mr-1" />
                              {item.aiStatus === 'generated' ? 'AI Short News' : 'Feed Raw'}
                            </Badge>

                            {/* Status */}
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                item.status === 'published'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.status.toUpperCase()}
                            </span>
                          </div>

                          <h3 className="font-bold text-foreground line-clamp-1 text-sm">
                            {item.aiTitle || item.title}
                          </h3>

                          {item.shortDesc && (
                            <p className="text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                              {item.shortDesc}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(item.createdAt).toLocaleString()}
                          </span>

                          <div className="flex items-center gap-2">
                            {item.sourceUrl && (
                              <a
                                href={item.sourceUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="hover:text-red-600 flex items-center"
                              >
                                Source Link <ExternalLink className="h-2.5 w-2.5 ml-1" />
                              </a>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveView('news')}
                              className="h-6 px-2 text-xs font-semibold text-red-600 hover:text-red-700"
                            >
                              Open in Editor
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ======================================================== */}
        {/* TAB 3: 24/7 AUTOMATED CRON */}
        {/* ======================================================== */}
        <TabsContent value="cron" className="space-y-4">
          <Card className="border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Radio className="h-4 w-4 text-red-600 animate-pulse" />
                Automated 24/7 Telugu News Background Cron
              </CardTitle>
              <CardDescription>
                Schedule automatic crawling and AI Short News rewriting every 15, 30, or 60 minutes with zero manual effort.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-xs">
              <div className="p-4 rounded-xl border bg-muted/30 space-y-3">
                <div className="font-semibold text-foreground text-sm">Cron Webhook Endpoint:</div>
                <div className="p-2.5 rounded-lg bg-black/90 text-emerald-400 font-mono text-xs flex items-center justify-between overflow-x-auto">
                  <code>GET /api/admin/feed-import/cron?secret=a5410a8d6f9459e9cb547b1b60a0866c</code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${window.location.origin}/api/admin/feed-import/cron?secret=a5410a8d6f9459e9cb547b1b60a0866c`
                      )
                      toast.success('Cron webhook URL copied!')
                    }}
                    className="text-white hover:bg-white/20 h-7 px-2 ml-2 shrink-0"
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-muted-foreground">
                  The endpoint requires your secret matching <code>CRON_SECRET</code> configured in your environment.
                  Supports both Bearer authorization header and <code>?secret=...</code> query parameter.
                </p>
              </div>

              {/* How it works */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border space-y-1.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Globe className="h-4 w-4 text-blue-500" />
                    1. Cycles Top Telugu Feeds
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Crawls Google News Telugu Top stories, Telangana regional feeds, and Andhra Pradesh headlines.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border space-y-1.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <Bot className="h-4 w-4 text-purple-500" />
                    2. AI Agent Short News
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Synthesizes 60-80 word Telugu short news summaries, removes competitor watermarks, and classifies category.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border space-y-1.5">
                  <div className="font-bold text-foreground flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-red-500" />
                    3. Hyperlocal Location Tagging
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    Pinpoints the exact district among all 59 districts in Telangana and AP, publishing ready-to-read stories.
                  </p>
                </div>
              </div>

              {/* Instant Manual Test */}
              <div className="pt-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-foreground">Trigger Instant Cron Run</div>
                  <p className="text-muted-foreground">Execute one full crawl cycle right now from the browser to test.</p>
                </div>

                <Button
                  onClick={handleTestCron}
                  disabled={runningCronTest}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shrink-0"
                >
                  {runningCronTest ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Executing Cron...
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Run Cron Now
                    </>
                  )}
                </Button>
              </div>

              {cronTestResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                    cronTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 border-rose-200 text-rose-800'
                  }`}
                >
                  {cronTestResult.success ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <span>{cronTestResult.message}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

