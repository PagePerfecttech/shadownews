'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, ImageIcon, Film, Upload, X, Megaphone,
  Settings, Play, LayoutGrid, ArrowLeft, Save, Loader2, BarChart2,
  ExternalLink, CheckCircle2, ShieldAlert
} from 'lucide-react'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'

interface AdItem {
  id: string
  title: string
  advertiser: string
  type: string // poster or video
  imagesUrls: string[]
  layout: string
  videoUrl: string | null
  videoThumbnailUrl: string | null
  skipAfterSeconds: number
  clickUrl: string | null
  buttonText: string | null
  ctaText: string | null
  placement: string
  priority: number
  frequency: number
  dailyCap: number
  impressionsLimit: number
  impressionsServed: number
  clicksServed: number
  startDate: string | null
  endDate: string | null
  isActive: boolean
  targetStateIds: string[]
  targetDistrictIds?: string[]
  targetMandalIds?: string[]
  targetCategoryIds: string[]
}

interface AdMobConfigData {
  id: string
  isEnabled: boolean
  testMode: boolean
  primaryStrategy: string
  feedAdFrequency: number
  nativeEnabled: boolean
  bannerEnabled: boolean
  interstitialEnabled: boolean
  rewardedEnabled: boolean
  appOpenEnabled: boolean
  androidAppId: string
  androidNativeId: string
  androidBannerId: string
  androidInterstitialId: string
  androidRewardedId: string
  androidAppOpenId: string
  iosAppId: string
  iosNativeId: string
  iosBannerId: string
  iosInterstitialId: string
  iosRewardedId: string
  iosAppOpenId: string
}

const defaultAdMobConfig: AdMobConfigData = {
  id: 'default',
  isEnabled: true,
  testMode: false,
  primaryStrategy: 'direct_first',
  feedAdFrequency: 5,
  nativeEnabled: true,
  bannerEnabled: true,
  interstitialEnabled: false,
  rewardedEnabled: false,
  appOpenEnabled: false,
  androidAppId: '',
  androidNativeId: '',
  androidBannerId: '',
  androidInterstitialId: '',
  androidRewardedId: '',
  androidAppOpenId: '',
  iosAppId: '',
  iosNativeId: '',
  iosBannerId: '',
  iosInterstitialId: '',
  iosRewardedId: '',
  iosAppOpenId: '',
}

const defaultForm = {
  title: '',
  advertiser: '',
  type: 'poster',
  placement: 'feed_inline',
  layout: 'grid',
  imagesUrls: [] as string[],
  videoUrl: '',
  videoThumbnailUrl: '',
  skipAfterSeconds: 5,
  clickUrl: '',
  buttonText: 'Learn More',
  ctaText: 'Learn More',
  priority: 5,
  frequency: 5,
  dailyCap: 0,
  impressionsLimit: 0,
  startDate: '',
  endDate: '',
  isActive: true,
  targetStateIds: [] as string[],
  targetCategoryIds: [] as string[],
}

export default function AdsPage() {
  const [ads, setAds] = useState<AdItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('poster')
  const [admobConfig, setAdmobConfig] = useState<AdMobConfigData>(defaultAdMobConfig)
  const [admobLoading, setAdmobLoading] = useState(false)
  const [admobSaving, setAdmobSaving] = useState(false)

  // Page-based form state
  const [formMode, setFormMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editItem, setEditItem] = useState<AdItem | null>(null)
  const [formType, setFormType] = useState<'poster' | 'video'>('poster')

  const fetchAds = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<AdItem[]>('/api/admin/ads')
      setAds(data)
    } catch (err) {
      console.error(err)
      toast.error('Failed to load ads')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAdMobConfig = useCallback(async () => {
    try {
      setAdmobLoading(true)
      const data = await authFetchJson<AdMobConfigData>('/api/admin/ads/admob')
      if (data) setAdmobConfig(data)
    } catch (err) {
      console.error('Failed to load AdMob config:', err)
    } finally {
      setAdmobLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAds()
    fetchAdMobConfig()
  }, [fetchAds, fetchAdMobConfig])

  const posterAds = ads.filter(a => a.type === 'image' || a.type === 'poster')
  const videoAds = ads.filter(a => a.type === 'video')

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return
    try {
      await authFetch(`/api/admin/ads/${id}`, { method: 'DELETE' })
      toast.success('Ad deleted')
      fetchAds()
    } catch {
      toast.error('Failed to delete ad')
    }
  }

  const handleSaveAdMob = async () => {
    try {
      setAdmobSaving(true)
      const res = await authFetchJSON('/api/admin/ads/admob', {
        method: 'PUT',
        body: JSON.stringify(admobConfig),
      })
      if (!res.ok) throw new Error()
      const updated = await res.json()
      setAdmobConfig(updated)
      toast.success('AdMob configuration updated successfully!')
    } catch {
      toast.error('Failed to save AdMob configuration')
    } finally {
      setAdmobSaving(false)
    }
  }

  const openCreate = (type: 'poster' | 'video') => {
    setEditItem(null)
    setFormType(type)
    setFormMode('create')
  }

  const openEdit = (ad: AdItem) => {
    setEditItem(ad)
    setFormType(ad.type === 'image' ? 'poster' : (ad.type as 'poster' | 'video'))
    setFormMode('edit')
  }

  const handleFormSave = async (formData: Record<string, unknown>) => {
    try {
      if (editItem) {
        const res = await authFetchJSON(`/api/admin/ads/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error()
        toast.success('Ad updated successfully')
      } else {
        const res = await authFetchJSON('/api/admin/ads', {
          method: 'POST',
          body: JSON.stringify(formData),
        })
        if (!res.ok) throw new Error()
        toast.success('Ad created successfully')
      }
      setFormMode('list')
      setEditItem(null)
      fetchAds()
    } catch {
      toast.error('Failed to save ad')
    }
  }

  const placementLabels: Record<string, string> = {
    home_banner: 'Home Banner',
    feed_inline: 'Feed Inline',
    article_banner: 'Article Banner',
    interstitial: 'Interstitial',
  }

  // Show full-page form for create/edit
  if (formMode === 'create' || formMode === 'edit') {
    return (
      <AdFormPage
        key={editItem?.id || formType}
        editItem={editItem}
        adType={formType}
        onSave={handleFormSave}
        onCancel={() => {
          setFormMode('list')
          setEditItem(null)
        }}
      />
    )
  }

  const renderAdTable = (data: AdItem[], type: 'poster' | 'video') => (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-14">Media</TableHead>
                  <TableHead>Title & Advertiser</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Impressions</TableHead>
                  <TableHead>Clicks & CTR</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map(ad => {
                  const impressions = ad.impressionsServed || 0
                  const clicks = ad.clicksServed || 0
                  const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(1) : '0.0'

                  return (
                    <TableRow key={ad.id}>
                      <TableCell>
                        {type === 'poster' ? (
                          ad.imagesUrls?.[0] ? (
                            <img src={ad.imagesUrls[0]} alt="" className="w-10 h-10 rounded object-cover border" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                          )
                        ) : (
                          ad.videoThumbnailUrl ? (
                            <div className="relative w-12 h-8 rounded overflow-hidden border">
                              <img src={ad.videoThumbnailUrl} alt="" className="w-full h-full object-cover" />
                              <Play className="absolute inset-0 m-auto h-3 w-3 text-white drop-shadow" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Film className="h-4 w-4 text-muted-foreground" /></div>
                          )
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm text-foreground">{ad.title}</div>
                        <div className="text-xs text-muted-foreground">{ad.advertiser}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {placementLabels[ad.placement] || ad.placement}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          ad.priority >= 8
                            ? 'bg-purple-100 text-purple-700'
                            : ad.priority >= 5
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-muted text-muted-foreground'
                        }>
                          Weight: {ad.priority || 1}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        <span className="font-semibold">{impressions.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground"> / {ad.impressionsLimit > 0 ? ad.impressionsLimit.toLocaleString() : '∞'}</span>
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{clicks.toLocaleString()} clicks</div>
                        <div className="text-xs text-muted-foreground font-mono">{ctr}% CTR</div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {ad.startDate ? new Date(ad.startDate).toLocaleDateString() : 'Always'} &rarr; {ad.endDate ? new Date(ad.endDate).toLocaleDateString() : 'Open'}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={ad.isActive}
                          onCheckedChange={async (v) => {
                            try {
                              await authFetchJSON(`/api/admin/ads/${ad.id}`, {
                                method: 'PUT',
                                body: JSON.stringify({ ...ad, isActive: v, type: ad.type === 'image' ? 'poster' : ad.type }),
                              })
                              toast.success(v ? 'Ad activated' : 'Ad deactivated')
                              fetchAds()
                            } catch { toast.error('Failed to update') }
                          }}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <Button size="icon" variant="ghost" onClick={() => openEdit(ad)} title="Edit Ad">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => handleDelete(ad.id)} title="Delete Ad">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                      No {type} ads created yet. Click &quot;Create {type === 'poster' ? 'Poster Ad' : 'Video Ad'}&quot; to launch an ad campaign.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ads & Monetization Management</h1>
          <p className="text-sm text-muted-foreground">
            Configure direct advertiser campaigns (Posters & Videos) with weighted rotation, and manage Google AdMob sync.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full sm:w-[480px] grid-cols-3">
          <TabsTrigger value="poster"><ImageIcon className="h-4 w-4 mr-2" />Poster Ads ({posterAds.length})</TabsTrigger>
          <TabsTrigger value="video"><Film className="h-4 w-4 mr-2" />Video Ads ({videoAds.length})</TabsTrigger>
          <TabsTrigger value="admob"><Settings className="h-4 w-4 mr-2" />AdMob Engine</TabsTrigger>
        </TabsList>

        {/* Poster Ads */}
        <TabsContent value="poster" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">High-impact static/slider banners displayed between news cards</p>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => openCreate('poster')}>
              <Plus className="h-4 w-4 mr-1.5" /> Create Poster Ad
            </Button>
          </div>
          {renderAdTable(posterAds, 'poster')}
        </TabsContent>

        {/* Video Ads */}
        <TabsContent value="video" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Short video commercials with muted autoplay and custom skip timer</p>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => openCreate('video')}>
              <Plus className="h-4 w-4 mr-1.5" /> Create Video Ad
            </Button>
          </div>
          {renderAdTable(videoAds, 'video')}
        </TabsContent>

        {/* AdMob Configuration Tab (Single Source of Truth) */}
        <TabsContent value="admob" className="space-y-6 mt-4">
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b bg-muted/20">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Google AdMob & Direct Ad Synchronization</CardTitle>
                  <CardDescription>
                    Unified monetization rules engine. Controls whether direct sponsor ads or AdMob native ads take precedence in the mobile feed.
                  </CardDescription>
                </div>
                <Button
                  onClick={handleSaveAdMob}
                  disabled={admobSaving || admobLoading}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {admobSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                  Save Configuration
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              {/* Global Strategy Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl border bg-muted/30">
                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Monetization Strategy</Label>
                  <select
                    className="w-full border rounded-md p-2 text-sm bg-background font-medium"
                    value={admobConfig.primaryStrategy}
                    onChange={e => setAdmobConfig(p => ({ ...p, primaryStrategy: e.target.value }))}
                  >
                    <option value="direct_first">Direct First (Serve Direct Ads, Fallback to AdMob)</option>
                    <option value="admob_first">AdMob First (Serve AdMob, Fallback to Direct)</option>
                    <option value="direct_only">Direct Ads Only (Mute AdMob)</option>
                    <option value="admob_only">Google AdMob Only (Mute Direct Ads)</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground">Determines feed priority when both direct campaigns and AdMob are eligible.</p>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Feed Ad Frequency</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Every</span>
                    <Input
                      type="number"
                      min={2}
                      max={20}
                      value={admobConfig.feedAdFrequency}
                      onChange={e => setAdmobConfig(p => ({ ...p, feedAdFrequency: parseInt(e.target.value) || 5 }))}
                      className="w-20 text-center font-bold"
                    />
                    <span className="text-sm text-muted-foreground">cards</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Standard interval between ads in shorts feed (default: 5).</p>
                </div>

                <div className="flex flex-col justify-center space-y-2 pl-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-semibold">Enable AdMob Globally</Label>
                      <p className="text-xs text-muted-foreground">Master switch for Google AdMob SDK</p>
                    </div>
                    <Switch
                      checked={admobConfig.isEnabled}
                      onCheckedChange={v => setAdmobConfig(p => ({ ...p, isEnabled: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <Label className="text-xs font-medium text-amber-700">Test Mode (Safe Testing)</Label>
                      <p className="text-[11px] text-muted-foreground">Serves Google test ads to prevent policy strikes</p>
                    </div>
                    <Switch
                      checked={admobConfig.testMode}
                      onCheckedChange={v => setAdmobConfig(p => ({ ...p, testMode: v }))}
                    />
                  </div>
                </div>
              </div>

              {/* Format Toggles */}
              <div>
                <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider mb-3">Allowed Ad Formats</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {[
                    { key: 'nativeEnabled', label: 'Native Feed Ads' },
                    { key: 'bannerEnabled', label: 'Banner Ads' },
                    { key: 'interstitialEnabled', label: 'Interstitials' },
                    { key: 'rewardedEnabled', label: 'Rewarded Ads' },
                    { key: 'appOpenEnabled', label: 'App Open Ads' },
                  ].map(format => (
                    <div key={format.key} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                      <Label className="text-xs font-medium">{format.label}</Label>
                      <Switch
                        checked={Boolean(admobConfig[format.key as keyof AdMobConfigData])}
                        onCheckedChange={v => setAdmobConfig(p => ({ ...p, [format.key]: v }))}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Android Ad Unit IDs */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Android</Badge>
                  <h4 className="text-sm font-semibold">Google AdMob Unit IDs (Android)</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Android App ID</Label>
                    <Input
                      value={admobConfig.androidAppId}
                      onChange={e => setAdmobConfig(p => ({ ...p, androidAppId: e.target.value }))}
                      placeholder="ca-app-pub-xxx~yyy"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Native Ad Unit ID (Feed)</Label>
                    <Input
                      value={admobConfig.androidNativeId}
                      onChange={e => setAdmobConfig(p => ({ ...p, androidNativeId: e.target.value }))}
                      placeholder="ca-app-pub-xxx/yyy"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Banner Ad Unit ID</Label>
                    <Input
                      value={admobConfig.androidBannerId}
                      onChange={e => setAdmobConfig(p => ({ ...p, androidBannerId: e.target.value }))}
                      placeholder="ca-app-pub-xxx/yyy"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Interstitial Ad Unit ID</Label>
                    <Input
                      value={admobConfig.androidInterstitialId}
                      onChange={e => setAdmobConfig(p => ({ ...p, androidInterstitialId: e.target.value }))}
                      placeholder="ca-app-pub-xxx/yyy"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">App Open Ad Unit ID</Label>
                    <Input
                      value={admobConfig.androidAppOpenId}
                      onChange={e => setAdmobConfig(p => ({ ...p, androidAppOpenId: e.target.value }))}
                      placeholder="ca-app-pub-xxx/yyy"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Rewarded Ad Unit ID</Label>
                    <Input
                      value={admobConfig.androidRewardedId}
                      onChange={e => setAdmobConfig(p => ({ ...p, androidRewardedId: e.target.value }))}
                      placeholder="ca-app-pub-xxx/yyy"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* iOS Ad Unit IDs */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">iOS</Badge>
                  <h4 className="text-sm font-semibold">Google AdMob Unit IDs (iOS)</h4>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">iOS App ID</Label>
                    <Input
                      value={admobConfig.iosAppId}
                      onChange={e => setAdmobConfig(p => ({ ...p, iosAppId: e.target.value }))}
                      placeholder="ca-app-pub-xxx~yyy"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Native Ad Unit ID</Label>
                    <Input
                      value={admobConfig.iosNativeId}
                      onChange={e => setAdmobConfig(p => ({ ...p, iosNativeId: e.target.value }))}
                      placeholder="ca-app-pub-xxx/yyy"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Banner Ad Unit ID</Label>
                    <Input
                      value={admobConfig.iosBannerId}
                      onChange={e => setAdmobConfig(p => ({ ...p, iosBannerId: e.target.value }))}
                      placeholder="ca-app-pub-xxx/yyy"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Interstitial Ad Unit ID</Label>
                    <Input
                      value={admobConfig.iosInterstitialId}
                      onChange={e => setAdmobConfig(p => ({ ...p, iosInterstitialId: e.target.value }))}
                      placeholder="ca-app-pub-xxx/yyy"
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">App Open Ad Unit ID</Label>
                    <Input
                      value={admobConfig.iosAppOpenId}
                      onChange={e => setAdmobConfig(p => ({ ...p, iosAppOpenId: e.target.value }))}
                      placeholder="ca-app-pub-xxx/yyy"
                      className="font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleSaveAdMob}
                  disabled={admobSaving}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  {admobSaving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                  Save All AdMob Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ============================================================
// Full-Page Ad Form Component (Enhanced for Poster & Video)
// ============================================================
function AdFormPage({
  editItem,
  adType,
  onSave,
  onCancel,
}: {
  editItem: AdItem | null
  adType: 'poster' | 'video'
  onSave: (data: Record<string, unknown>) => void
  onCancel: () => void
}) {
  const [form, setForm] = useState<Record<string, unknown>>({
    ...defaultForm,
    type: adType,
    layout: adType === 'poster' ? 'grid' : '',
    frequency: 5,
    priority: 5,
    skipAfterSeconds: 5,
    buttonText: 'Learn More',
    ctaText: 'Learn More',
    ...(editItem ? {
      ...editItem,
      type: editItem.type === 'image' ? 'poster' : editItem.type,
      startDate: editItem.startDate ? editItem.startDate.split('T')[0] : '',
      endDate: editItem.endDate ? editItem.endDate.split('T')[0] : '',
    } : {}),
  })

  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [uploadingThumb, setUploadingThumb] = useState(false)
  const [saving, setSaving] = useState(false)
  const [states, setStates] = useState<{ id: string; name: string }[]>([])

  useEffect(() => {
    // Fetch active states for geo-targeting
    authFetchJson<{ id: string; name: string }[]>('/api/admin/states')
      .then(data => { if (Array.isArray(data)) setStates(data) })
      .catch(() => {})
  }, [])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        const current = (form.imagesUrls as string[]) || []
        setForm(p => ({ ...p, imagesUrls: [...current, data.url] }))
        toast.success('Image uploaded')
      }
    } catch {
      toast.error('Upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) {
      toast.error('Video file must be under 50MB')
      return
    }
    setUploadingVideo(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        setForm(p => ({ ...p, videoUrl: data.url }))
        toast.success('Video uploaded successfully!')
      }
    } catch {
      toast.error('Video upload failed')
    } finally {
      setUploadingVideo(false)
    }
  }

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingThumb(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await authFetch('/api/admin/media/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (data.url) {
        setForm(p => ({ ...p, videoThumbnailUrl: data.url }))
        toast.success('Video thumbnail uploaded!')
      }
    } catch {
      toast.error('Thumbnail upload failed')
    } finally {
      setUploadingThumb(false)
    }
  }

  const removeImage = (index: number) => {
    const current = (form.imagesUrls as string[]) || []
    setForm(p => ({ ...p, imagesUrls: current.filter((_, i) => i !== index) }))
  }

  const handleSubmit = async () => {
    if (!form.title) {
      toast.error('Title is required')
      return
    }
    if (!form.advertiser) {
      toast.error('Advertiser is required')
      return
    }
    if (!isPoster && !form.videoUrl) {
      toast.error('Please upload a video or enter a video URL')
      return
    }

    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  const isPoster = (form.type as string) === 'poster'

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={onCancel} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {editItem ? `Edit ${isPoster ? 'Poster' : 'Video'} Ad` : `Create ${isPoster ? 'Poster' : 'Video'} Ad`}
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure direct campaign assets, weighted priority rotation, and call-to-action details.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-5">
              <h3 className="font-semibold text-sm">Campaign Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Campaign Title *</Label>
                  <Input
                    value={form.title as string}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Grand Mega Sale Promotion"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Advertiser Name *</Label>
                  <Input
                    value={form.advertiser as string}
                    onChange={e => setForm(p => ({ ...p, advertiser: e.target.value }))}
                    placeholder="e.g. Raymond Showroom Warangal"
                  />
                </div>
              </div>

              {/* Poster: Image Upload */}
              {isPoster && (
                <div className="space-y-3">
                  <Label className="text-sm font-semibold">Ad Banners / Posters (Up to 4 images)</Label>
                  <div className="flex items-center gap-2">
                    <label className="cursor-pointer">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploadingImage || ((form.imagesUrls as string[]) || []).length >= 4}
                        asChild
                      >
                        <span>
                          {uploadingImage ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
                          Upload Image File
                        </span>
                      </Button>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                    <span className="text-xs text-muted-foreground">{((form.imagesUrls as string[]) || []).length}/4 images</span>
                  </div>

                  {((form.imagesUrls as string[]) || []).length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                      {((form.imagesUrls as string[]) || []).map((url, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden border">
                          <img src={url} alt={`Ad ${i + 1}`} className="h-24 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-90 hover:opacity-100"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {((form.imagesUrls as string[]) || []).length > 1 && (
                    <div className="flex items-center gap-3 pt-2">
                      <Label className="text-xs">Display Layout:</Label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border ${form.layout === 'grid' ? 'bg-red-50 border-red-300 text-red-700 font-semibold' : 'hover:bg-muted'}`}
                          onClick={() => setForm(p => ({ ...p, layout: 'grid' }))}
                        >
                          <LayoutGrid className="h-3 w-3" /> Grid
                        </button>
                        <button
                          type="button"
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border ${form.layout === 'carousel' ? 'bg-red-50 border-red-300 text-red-700 font-semibold' : 'hover:bg-muted'}`}
                          onClick={() => setForm(p => ({ ...p, layout: 'carousel' }))}
                        >
                          <Megaphone className="h-3 w-3" /> Carousel Slider
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Video: Video Upload & Thumbnail */}
              {!isPoster && (
                <div className="space-y-4 rounded-xl border p-4 bg-muted/20">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Film className="h-4 w-4 text-red-600" />
                    Video Asset & Playback Settings
                  </h4>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Video File (MP4/WebM, up to 50MB)</Label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer">
                        <Button type="button" variant="outline" size="sm" disabled={uploadingVideo} asChild>
                          <span>
                            {uploadingVideo ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                            Upload Video File
                          </span>
                        </Button>
                        <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleVideoUpload} />
                      </label>
                      <span className="text-xs text-muted-foreground">or provide direct CDN URL below</span>
                    </div>

                    <Input
                      value={(form.videoUrl as string) || ''}
                      onChange={e => setForm(p => ({ ...p, videoUrl: e.target.value }))}
                      placeholder="https://storage.../ad-video.mp4"
                      className="font-mono text-xs mt-1"
                    />

                    {(form.videoUrl as string) && (
                      <div className="mt-2 rounded-lg overflow-hidden border max-w-xs bg-black">
                        <video src={form.videoUrl as string} controls className="w-full max-h-48" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Video Poster / Thumbnail</Label>
                      <div className="flex items-center gap-2">
                        <label className="cursor-pointer">
                          <Button type="button" variant="outline" size="sm" disabled={uploadingThumb} asChild>
                            <span>
                              {uploadingThumb ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                              Upload Thumbnail
                            </span>
                          </Button>
                          <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                        </label>
                      </div>
                      <Input
                        value={(form.videoThumbnailUrl as string) || ''}
                        onChange={e => setForm(p => ({ ...p, videoThumbnailUrl: e.target.value }))}
                        placeholder="https://.../thumbnail.jpg"
                        className="font-mono text-xs"
                      />
                      {(form.videoThumbnailUrl as string) && (
                        <img src={form.videoThumbnailUrl as string} alt="" className="h-20 w-32 object-cover rounded border mt-1" />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Skip Button After (Seconds)</Label>
                      <Input
                        type="number"
                        min={0}
                        max={30}
                        value={form.skipAfterSeconds as number || 5}
                        onChange={e => setForm(p => ({ ...p, skipAfterSeconds: parseInt(e.target.value) || 5 }))}
                      />
                      <p className="text-[11px] text-muted-foreground">Enter 0 to allow instant skip. 5 seconds recommended.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Call-to-Action Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Destination URL (Click/Landing Page)</Label>
                  <Input
                    value={(form.clickUrl as string) || ''}
                    onChange={e => setForm(p => ({ ...p, clickUrl: e.target.value }))}
                    placeholder="https://advertiser.com/offer"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">CTA Button Label</Label>
                  <Input
                    value={(form.ctaText as string) || (form.buttonText as string) || 'Learn More'}
                    onChange={e => {
                      setForm(p => ({ ...p, ctaText: e.target.value, buttonText: e.target.value }))
                    }}
                    placeholder="e.g. Shop Now, Call Now, Visit Website"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Controls */}
        <div className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-sm">Placement & Priority Rotation</h3>

              <div className="space-y-2">
                <Label>Placement Position</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-background font-medium"
                  value={form.placement as string}
                  onChange={e => setForm(p => ({ ...p, placement: e.target.value }))}
                >
                  <option value="feed_inline">Feed Inline (Between Shorts)</option>
                  <option value="home_banner">Home Banner (Top Carousel)</option>
                  <option value="article_banner">Article Bottom Banner</option>
                  <option value="interstitial">Interstitial (Full-screen Takeover)</option>
                </select>
              </div>

              {form.placement === 'feed_inline' && (
                <div className="space-y-2">
                  <Label>Feed Frequency</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Every</span>
                    <Input
                      type="number"
                      min={2}
                      max={20}
                      value={form.frequency as number || 5}
                      onChange={e => setForm(p => ({ ...p, frequency: parseInt(e.target.value) || 5 }))}
                      className="w-20 text-center font-bold"
                    />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">items</span>
                  </div>
                </div>
              )}

              {/* Priority Weight (Rotation Engine) */}
              <div className="space-y-1.5 p-3 rounded-lg bg-purple-50/50 border border-purple-100">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-purple-900">Rotation Priority Weight (1-10)</Label>
                  <Badge className="bg-purple-600 text-white text-xs">{form.priority as number || 5}</Badge>
                </div>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  value={form.priority as number || 5}
                  onChange={e => setForm(p => ({ ...p, priority: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) }))}
                  className="font-bold text-center"
                />
                <p className="text-[11px] text-muted-foreground">
                  Higher weight receives more appearances in weighted round-robin. 10 = Max exposure, 1 = Low exposure.
                </p>
              </div>

              {/* Lifetime Impressions Limit */}
              <div className="space-y-2">
                <Label>Lifetime Impressions Cap (0 = Unlimited)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.impressionsLimit as number || 0}
                  onChange={e => setForm(p => ({ ...p, impressionsLimit: parseInt(e.target.value) || 0 }))}
                />
              </div>

              {/* Schedule Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="date"
                    value={(form.startDate as string) || ''}
                    onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="date"
                    value={(form.endDate as string) || ''}
                    onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                  />
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between pt-3 border-t">
                <div>
                  <Label className="font-semibold text-sm">Campaign Active</Label>
                  <p className="text-xs text-muted-foreground">Deliver this ad in the app immediately</p>
                </div>
                <Switch
                  checked={form.isActive as boolean}
                  onCheckedChange={v => setForm(p => ({ ...p, isActive: v }))}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editItem ? 'Save Changes' : 'Create Ad'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
