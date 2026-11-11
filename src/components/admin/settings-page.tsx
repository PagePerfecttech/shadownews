'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Settings, Shield, Wrench, MessageSquare, Moon, Video as VideoIcon,
  Bell, Bookmark, Share, Save, Megaphone, Youtube, Coins, Trash2,
  Clock, Sparkles, CheckCircle2, AlertTriangle, RefreshCw, Zap
} from 'lucide-react'
import { authFetch, authFetchJson } from '@/lib/utils'

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [runningCleanup, setRunningCleanup] = useState(false)
  const [testingGemini, setTestingGemini] = useState(false)
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true)
      const data = await authFetchJson<Record<string, string>>('/api/admin/settings')
      setSettings(data || {})
    } catch {
      toast.error('Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to save settings' }))
        throw new Error(errorData.error || `Error status: ${res.status}`)
      }

      toast.success('Settings saved successfully and applied!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleManualCleanup = async () => {
    const days = parseInt(settings.auto_delete_days || '0', 10)
    if (isNaN(days) || days <= 0) {
      toast.error('Please select Auto Delete Days (greater than 0) first')
      return
    }
    setRunningCleanup(true)
    try {
      const res = await authFetchJson<{ success: boolean; message: string }>('/api/admin/news/auto-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days }),
      })
      if (res.success) {
        toast.success(res.message || 'Auto-delete cleanup completed')
      } else {
        toast.error('Auto-delete cleanup failed')
      }
    } catch {
      toast.error('Failed to run auto-delete cleanup')
    } finally {
      setRunningCleanup(false)
    }
  }

  const handleTestGemini = async () => {
    setTestingGemini(true)
    setGeminiTestResult(null)
    try {
      const currentKey = settings.gemini_api_key || settings.google_gemini_api_key || settings.grok_api_key || ''
      const res = await authFetch('/api/admin/settings/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: currentKey }),
      })
      const data = await res.json()
      setGeminiTestResult(data)
      if (data.success) {
        toast.success(data.message || 'Gemini connection successful!')
      } else {
        toast.error(data.message || 'Gemini connection failed.')
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to test Gemini connection'
      setGeminiTestResult({ success: false, message: msg })
      toast.error(msg)
    } finally {
      setTestingGemini(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-4xl">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-44 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    )
  }

  const featureFlags = [
    { key: 'feature_comments', label: 'Comments', desc: 'Allow readers to comment on articles', icon: MessageSquare },
    { key: 'feature_dark_mode', label: 'Dark Mode', desc: 'Enable dark theme switch in app', icon: Moon },
    { key: 'feature_video_section', label: 'Video Shorts Section', desc: 'Show vertical video shorts tab in app', icon: VideoIcon },
    { key: 'feature_notifications', label: 'Push Notifications', desc: 'Enable FCM breaking news alerts', icon: Bell },
    { key: 'feature_bookmarks', label: 'Bookmarks', desc: 'Allow readers to save bookmarks', icon: Bookmark },
    { key: 'feature_share', label: 'Share', desc: 'Allow readers to share news to WhatsApp & socials', icon: Share },
  ]

  return (
    <div className="space-y-8 max-w-4xl pb-16">
      {/* Header with Sticky Save Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-background/95 backdrop-blur sticky top-0 z-10 py-3 border-b">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System & App Settings</h1>
          <p className="text-sm text-muted-foreground">Configure Google Gemini AI, AdMob, Reporter Rewards, and App Controls</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchSettings} disabled={loading || saving}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Reload
          </Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white font-semibold" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      {/* 1. Google Gemini AI Integration */}
      <Card className="border border-blue-100 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-600" />
              Google Gemini AI Integration (Fast & Free)
            </CardTitle>
            {settings.gemini_api_key || settings.google_gemini_api_key || settings.grok_api_key ? (
              <span className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Configured
              </span>
            ) : (
              <span className="flex items-center text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Not Configured
              </span>
            )}
          </div>
          <CardDescription>
            Uses Google Gemini (<code>gemini-2.5-flash</code> / <code>gemini-1.5-flash</code>) to automatically rewrite and proofread Telugu news submissions into high-impact journalistic Telugu with zero API cost on Google AI Studio's free tier.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label className="font-semibold text-sm">Google Gemini API Key</Label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="password"
                value={settings.gemini_api_key || settings.google_gemini_api_key || settings.grok_api_key || ''}
                onChange={e => {
                  updateSetting('gemini_api_key', e.target.value)
                  updateSetting('google_gemini_api_key', e.target.value)
                  updateSetting('grok_api_key', e.target.value)
                  setGeminiTestResult(null)
                }}
                placeholder="AIzaSy..."
                className="font-mono text-sm flex-1"
              />
              <Button
                type="button"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 font-medium shrink-0"
                onClick={handleTestGemini}
                disabled={testingGemini || !(settings.gemini_api_key || settings.google_gemini_api_key || settings.grok_api_key)}
              >
                {testingGemini ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2 text-amber-500 fill-amber-500" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your free API key in seconds from Google AI Studio (<strong>aistudio.google.com</strong>). Fast, reliable, and completely free of cost. Click <strong>Test Connection</strong> to verify your key before or after saving.
            </p>
          </div>

          {geminiTestResult && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                geminiTestResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {geminiTestResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-rose-600 mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">
                  {geminiTestResult.success ? 'Connection Successful' : 'Connection Failed'}
                </span>
                <span>{geminiTestResult.message}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Reporter Rewards, Coins & Limits (Consolidated Single Source of Truth) */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Coins className="h-5 w-5 text-red-600" />
            Reporter Rewards, Wallet & Submission Limits
          </CardTitle>
          <CardDescription>
            Configure reward rates credited to reporter wallets upon news article approval, daily posting limits, and promotion criteria.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-2">
          {/* Article Approval Rewards */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Approval Payout Rates (Rupees ₹)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3.5 rounded-lg border bg-muted/30">
                <Label className="font-medium text-xs text-muted-foreground">Junior Reporter Payout (₹ per post)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-700">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={settings.reward_junior_article || '3'}
                    onChange={e => updateSetting('reward_junior_article', e.target.value)}
                    className="font-bold"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Standard approved post reward for Junior Reporters</p>
              </div>

              <div className="space-y-1.5 p-3.5 rounded-lg border bg-muted/30">
                <Label className="font-medium text-xs text-muted-foreground">Senior Reporter Payout (₹ per post)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-gray-700">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={settings.reward_senior_article || '5'}
                    onChange={e => updateSetting('reward_senior_article', e.target.value)}
                    className="font-bold"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Higher payout rate for promoted Senior Reporters</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Daily Submission Limits */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Daily Submission Caps</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Junior Daily Post Limit</Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.limit_junior_daily || '15'}
                  onChange={e => updateSetting('limit_junior_daily', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Max news articles per day for Junior Reporters (Crime category is exempt)</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Senior Daily Post Limit</Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.limit_senior_daily || '30'}
                  onChange={e => updateSetting('limit_senior_daily', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Max news articles per day for Senior Reporters (Crime category is exempt)</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Coins Conversion & Promotion Thresholds */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Coin Conversion & Rank Promotion Criteria</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Coins Equivalent to ₹1</Label>
                <Input
                  type="number"
                  min="1"
                  value={settings.COINS_PER_INR || '100'}
                  onChange={e => updateSetting('COINS_PER_INR', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">e.g., 100 coins = ₹1 INR</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Promotion Score Threshold</Label>
                <Input
                  type="number"
                  min="10"
                  value={settings.promotion_score_threshold || '100'}
                  onChange={e => updateSetting('promotion_score_threshold', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Min Performance Score for Senior eligibility</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Demotion Score Threshold</Label>
                <Input
                  type="number"
                  min="0"
                  value={settings.demotion_score_threshold || '40'}
                  onChange={e => updateSetting('demotion_score_threshold', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Score below which demotion is recommended</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Ad Management & Custom Sponsor Ads */}
      {/* 3. Ads & Monetization Central Config */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-red-600" />
              Unified Ads & Monetization Hub
            </span>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
              Single Source of Truth
            </Badge>
          </CardTitle>
          <CardDescription>
            Google AdMob unit IDs, display formats, feed frequencies, priority rotation, and custom sponsor ads are now centrally managed in the dedicated Ads Management engine.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-muted/40 rounded-xl border gap-4">
            <div className="space-y-1">
              <h4 className="font-semibold text-sm">Manage Google AdMob & Sponsor Campaigns</h4>
              <p className="text-xs text-muted-foreground max-w-xl">
                Configure your strategy (Direct First vs AdMob First), set feed frequencies, upload video ads with custom skip timers, and adjust campaign weights.
              </p>
            </div>
            <a href="/admin/ads" className="shrink-0">
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                <Megaphone className="h-4 w-4 mr-2" />
                Open Ads Management
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* 4. App Features & Remote Flags */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-5 w-5 text-red-600" />
            App Feature Flags
          </CardTitle>
          <CardDescription>Enable or disable specific features dynamically across mobile devices.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pt-2">
          {featureFlags.map((flag, i) => {
            const Icon = flag.icon
            return (
              <div key={flag.key}>
                <div className="flex items-center justify-between py-2.5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-muted rounded-lg text-muted-foreground">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="font-medium text-sm">{flag.label}</Label>
                      <p className="text-xs text-muted-foreground">{flag.desc}</p>
                    </div>
                  </div>
                  <Switch
                    checked={settings[flag.key] !== 'false'}
                    onCheckedChange={v => updateSetting(flag.key, String(v))}
                  />
                </div>
                {i < featureFlags.length - 1 && <Separator />}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* 5. Force Update & App Versions */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-600" />
            Version Management & Force Update
          </CardTitle>
          <CardDescription>Enforce minimum app version requirements to prompt users to update from Play Store.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Min Android App Version</Label>
              <Input
                value={settings.force_update_android || '1.0.10'}
                onChange={e => updateSetting('force_update_android', e.target.value)}
                placeholder="1.0.10"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Min iOS App Version</Label>
              <Input
                value={settings.force_update_ios || '1.0.0'}
                onChange={e => updateSetting('force_update_ios', e.target.value)}
                placeholder="1.0.0"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-lg border">
            <div>
              <Label className="font-medium text-sm">Hard Block Outdated Versions</Label>
              <p className="text-xs text-muted-foreground">Strictly prevent app usage until updated via Google Play Store</p>
            </div>
            <Switch
              checked={settings.force_update_hard_block === 'true'}
              onCheckedChange={v => updateSetting('force_update_hard_block', String(v))}
            />
          </div>
        </CardContent>
      </Card>

      {/* 6. Auto-Delete & Storage Cleanup */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-600" />
            Auto-Delete & Storage Retention
          </CardTitle>
          <CardDescription>
            Purge old news and delete associated R2 media files (images, video files) to maintain storage limits.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5 text-xs font-medium">
                <Clock className="h-4 w-4 text-muted-foreground" /> Retention Threshold
              </Label>
              <select
                className="w-full border rounded-md p-2 text-sm bg-background"
                value={settings.auto_delete_days || '0'}
                onChange={e => updateSetting('auto_delete_days', e.target.value)}
              >
                <option value="0">Disabled (Keep all news forever)</option>
                <option value="7">7 Days (Delete news older than 1 week)</option>
                <option value="15">15 Days (Delete news older than 15 days)</option>
                <option value="30">30 Days (Delete news older than 1 month)</option>
                <option value="60">60 Days (Delete news older than 2 months)</option>
                <option value="90">90 Days (Delete news older than 3 months)</option>
                <option value="180">180 Days (Delete news older than 6 months)</option>
                <option value="365">365 Days (Delete news older than 1 year)</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Set to 0 to disable automated cron purging.
              </p>
            </div>
            <div className="flex justify-start md:justify-end">
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 font-semibold"
                onClick={handleManualCleanup}
                disabled={runningCleanup || !settings.auto_delete_days || settings.auto_delete_days === '0'}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {runningCleanup ? 'Cleaning up...' : 'Run Storage Cleanup Now'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7. YouTube Shorts Integration */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            YouTube Shorts Channel Integration
          </CardTitle>
          <CardDescription>Connect YouTube channel for automatic cross-posting of video shorts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-lg border">
            <div>
              <Label className="font-medium text-sm">Channel Connection Status</Label>
              <p className="text-xs text-muted-foreground">
                {settings.YOUTUBE_REFRESH_TOKEN ? (
                  <span className="text-emerald-600 font-semibold flex items-center mt-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Connected
                  </span>
                ) : (
                  <span className="text-muted-foreground">Not connected</span>
                )}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  const res = await authFetchJson<{ url: string }>('/api/admin/youtube/auth')
                  if (res?.url) window.location.href = res.url
                } catch {
                  toast.error('Failed to initiate YouTube authentication')
                }
              }}
            >
              {settings.YOUTUBE_REFRESH_TOKEN ? 'Reconnect YouTube' : 'Connect YouTube'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 8. Maintenance Mode */}
      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-5 w-5 text-red-600" />
            Maintenance Mode
          </CardTitle>
          <CardDescription>Temporarily display a maintenance screen to users during server updates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="flex items-center justify-between p-3.5 bg-muted/40 rounded-lg border">
            <div>
              <Label className="font-medium text-sm">Enable Maintenance Mode</Label>
              <p className="text-xs text-muted-foreground">Blocks app content with your custom maintenance banner</p>
            </div>
            <Switch
              checked={settings.maintenance_mode === 'true'}
              onCheckedChange={v => updateSetting('maintenance_mode', String(v))}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Maintenance Notice Message</Label>
            <Textarea
              value={settings.maintenance_message || ''}
              onChange={e => updateSetting('maintenance_message', e.target.value)}
              placeholder="We are upgrading our servers. Shadow News Spot News will be back in 15 minutes."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
