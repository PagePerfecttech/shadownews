'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Smartphone,
  Bell,
  BookOpen,
  Share2,
  Bookmark,
  MessageSquare,
  ShieldCheck,
  ShieldAlert,
  Send,
  UserPlus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { authFetch, authFetchJson } from '@/lib/utils'

interface UserDetailModalProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUserUpdated: () => void
}

interface UserDetailData {
  user: {
    id: string
    name: string | null
    phone: string
    email: string | null
    avatar: string | null
    preferredLanguage: string
    gender: string | null
    dob: string | null
    notificationsEnabled: boolean
    notifyBreaking: boolean
    notifyLocation: boolean
    notifyCategories: boolean
    notifyReporters: boolean
    notifyRewards: boolean
    notifyPromotions: boolean
    quietHoursEnabled: boolean
    quietHoursStart: string | null
    quietHoursEnd: string | null
    appVersion: string | null
    devicePlatform: string | null
    deviceModel: string | null
    fcmToken: string | null
    isActive: boolean
    isPremium: boolean
    createdAt: string
    lastActiveAt: string | null
    state: { id: string; name: string } | null
    district: { id: string; name: string } | null
    mandal: { id: string; name: string } | null
  }
  activity: {
    readCount: number
    shareCount: number
    bookmarksCount: number
    commentsCount: number
    reactionsCount: number
    recentBookmarks: Array<{
      id: string
      createdAt: string
      news: {
        id: string
        title: string
        thumbnailUrl: string
        createdAt: string
      }
    }>
    recentComments: Array<{
      id: string
      content: string
      createdAt: string
      news: {
        id: string
        title: string
      }
    }>
  }
  linkedReporter: {
    id: string
    name: string
    role: string
    status: string
    earningsBalance: number
    postingScope: string
    createdAt: string
  } | null
}

export function UserDetailModal({
  userId,
  open,
  onOpenChange,
  onUserUpdated,
}: UserDetailModalProps) {
  const [data, setData] = useState<UserDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  // Notification dialog state
  const [notifTitle, setNotifTitle] = useState('')
  const [notifMessage, setNotifMessage] = useState('')
  const [sendingNotif, setSendingNotif] = useState(false)

  // Promotion state
  const [convertingReporter, setConvertingReporter] = useState(false)

  // Block/Unblock state
  const [togglingStatus, setTogglingStatus] = useState(false)

  const fetchUserDetail = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const res = await authFetchJson<UserDetailData>(`/api/admin/users/${userId}`)
      setData(res)
    } catch {
      toast.error('Failed to load user details')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && userId) {
      fetchUserDetail()
      setActiveTab('overview')
      setNotifTitle('')
      setNotifMessage('')
    } else {
      setData(null)
    }
  }, [open, userId])

  const handleToggleStatus = async () => {
    if (!data?.user) return
    setTogglingStatus(true)
    try {
      const nextStatus = !data.user.isActive
      const res = await authFetch(`/api/admin/users/${data.user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast.success(nextStatus ? 'User account unblocked' : 'User account blocked')
      setData(prev => (prev ? { ...prev, user: { ...prev.user, isActive: nextStatus } } : null))
      onUserUpdated()
    } catch (e: any) {
      toast.error(e.message || 'Status update failed')
    } finally {
      setTogglingStatus(false)
    }
  }

  const handleConvertToReporter = async () => {
    if (!data?.user) return
    setConvertingReporter(true)
    try {
      const res = await authFetchJson<{ success: boolean; message: string; reporter: any }>(
        `/api/admin/users/${data.user.id}/convert-to-reporter`,
        { method: 'POST' }
      )
      if (res.success) {
        toast.success(res.message || 'User promoted to Reporter successfully!')
        fetchUserDetail()
        onUserUpdated()
      } else {
        toast.error('Failed to promote user')
      }
    } catch (e: any) {
      toast.error(e.message || 'Error promoting user')
    } finally {
      setConvertingReporter(false)
    }
  }

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!data?.user || !notifTitle.trim() || !notifMessage.trim()) {
      toast.error('Please enter notification title and message')
      return
    }
    setSendingNotif(true)
    try {
      const res = await authFetchJson<{ success: boolean; message: string }>(
        `/api/admin/users/${data.user.id}/send-notification`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: notifTitle.trim(),
            message: notifMessage.trim(),
          }),
        }
      )
      if (res.success) {
        toast.success(res.message || 'Notification delivered to user!')
        setNotifTitle('')
        setNotifMessage('')
      } else {
        toast.error('Failed to send notification')
      }
    } catch (e: any) {
      toast.error(e.message || 'Could not send notification')
    } finally {
      setSendingNotif(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!data?.user) return
    if (!confirm('Are you sure you want to delete this user? Their account will be soft-deleted.')) return
    try {
      const res = await authFetch(`/api/admin/users/${data.user.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('User account removed')
      onUserUpdated()
      onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete user')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="p-6 pb-2 border-b bg-gradient-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 border-2 border-white shadow-sm">
                <AvatarImage src={data?.user?.avatar || undefined} />
                <AvatarFallback className="bg-red-600 text-white font-bold text-lg">
                  {data?.user?.name ? data.user.name.slice(0, 2).toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  {data?.user?.name || 'Unnamed User'}
                  {data?.user?.isActive ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                      <ShieldCheck className="h-3 w-3 mr-1" /> Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-xs">
                      <ShieldAlert className="h-3 w-3 mr-1" /> Blocked
                    </Badge>
                  )}
                  {data?.linkedReporter && (
                    <Badge className="bg-purple-600 text-white text-xs">
                      Reporter ({data.linkedReporter.role})
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 font-mono">
                    <Phone className="h-3 w-3" /> {data?.user?.phone}
                  </span>
                  {data?.user?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {data.user.email}
                    </span>
                  )}
                </DialogDescription>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={fetchUserDetail}
              disabled={loading}
              className="h-8 text-xs gap-1"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        {loading && !data ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-red-600" />
            Loading user profile and activity...
          </div>
        ) : !data ? null : (
          <div className="p-6 space-y-6">
            {/* Quick KPI Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-slate-50/60 border shadow-none">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-blue-500" /> Reads
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {data.activity.readCount}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50/60 border shadow-none">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Share2 className="h-3.5 w-3.5 text-emerald-500" /> Shares
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {data.activity.shareCount}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50/60 border shadow-none">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Bookmark className="h-3.5 w-3.5 text-amber-500" /> Saved
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {data.activity.bookmarksCount}
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-slate-50/60 border shadow-none">
                <CardContent className="p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <MessageSquare className="h-3.5 w-3.5 text-purple-500" /> Comments
                  </div>
                  <div className="text-lg font-bold text-slate-800 mt-1">
                    {data.activity.commentsCount}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs Container */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="overview" className="text-xs">Profile & Device</TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">Saved & Comments</TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">Mod & Notifications</TabsTrigger>
              </TabsList>

              {/* 1. OVERVIEW & DEVICE TAB */}
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Location & Demographics */}
                  <div className="rounded-lg border p-4 bg-white space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Location & Language
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">State:</span>
                        <span className="font-medium">{data.user.state?.name || 'Not Selected'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">District:</span>
                        <span className="font-medium">{data.user.district?.name || 'Not Selected'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Mandal:</span>
                        <span className="font-medium">{data.user.mandal?.name || 'Not Selected'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Language:</span>
                        <span className="font-medium uppercase">{data.user.preferredLanguage}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-muted-foreground">Joined At:</span>
                        <span className="font-medium">
                          {new Date(data.user.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Device & Notification Diagnostics */}
                  <div className="rounded-lg border p-4 bg-white space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Device & Push Status
                    </h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Platform / OS:</span>
                        <span className="font-medium capitalize">{data.user.devicePlatform || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">App Version:</span>
                        <span className="font-medium font-mono">{data.user.appVersion || 'v1.0.0'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Last Active:</span>
                        <span className="font-medium">
                          {data.user.lastActiveAt
                            ? new Date(data.user.lastActiveAt).toLocaleString()
                            : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-muted-foreground">Push Notifications:</span>
                        <Badge
                          variant="outline"
                          className={
                            data.user.notificationsEnabled
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }
                        >
                          {data.user.notificationsEnabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </div>
                      <div className="flex justify-between py-1 items-center">
                        <span className="text-muted-foreground">FCM Token:</span>
                        <span className="font-mono text-[10px] truncate max-w-[140px]">
                          {data.user.fcmToken ? `${data.user.fcmToken.slice(0, 16)}...` : 'No Token'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Linked Reporter Box */}
                {data.linkedReporter ? (
                  <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-purple-900 flex items-center gap-1.5">
                        <ShieldCheck className="h-4 w-4 text-purple-700" />
                        Linked Reporter Profile
                      </h4>
                      <p className="text-xs text-purple-700 mt-0.5">
                        Level: <strong className="capitalize">{data.linkedReporter.role}</strong> · Scope: <strong className="capitalize">{data.linkedReporter.postingScope}</strong> · Wallet Balance: <strong>₹{data.linkedReporter.earningsBalance}</strong>
                      </p>
                    </div>
                    <Badge className="bg-purple-700 text-white text-xs">
                      Status: {data.linkedReporter.status}
                    </Badge>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-semibold text-slate-800">Standard Reader Account</h4>
                      <p className="text-xs text-muted-foreground">This user is not registered as a reporter.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleConvertToReporter}
                      disabled={convertingReporter}
                      className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {convertingReporter ? 'Promoting...' : 'Promote to Reporter'}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* 2. SAVED & COMMENTS TAB */}
              <TabsContent value="activity" className="space-y-4">
                {/* Recent Bookmarks */}
                <div className="rounded-lg border p-4 bg-white space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Bookmark className="h-3.5 w-3.5 text-amber-500" />
                    Recent Saved News ({data.activity.recentBookmarks.length})
                  </h4>
                  {data.activity.recentBookmarks.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 italic">No bookmarks saved yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.activity.recentBookmarks.map(b => (
                        <div key={b.id} className="p-2.5 rounded border flex items-center justify-between text-xs hover:bg-slate-50">
                          <div className="truncate pr-2 font-medium">
                            {b.news?.title || 'Unknown News Title'}
                          </div>
                          <span className="text-[11px] text-muted-foreground shrink-0">
                            {new Date(b.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Comments */}
                <div className="rounded-lg border p-4 bg-white space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-500" />
                    Recent Comments ({data.activity.recentComments.length})
                  </h4>
                  {data.activity.recentComments.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 italic">No comments posted yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {data.activity.recentComments.map(c => (
                        <div key={c.id} className="p-2.5 rounded border text-xs space-y-1 hover:bg-slate-50">
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-700 truncate pr-2">
                              {c.news?.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {new Date(c.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-600 bg-slate-50 p-1.5 rounded text-[11px]">
                            &ldquo;{c.content}&rdquo;
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 3. MODERATION & NOTIFICATIONS TAB */}
              <TabsContent value="actions" className="space-y-4">
                {/* Send Direct Push Notification */}
                <Card className="border shadow-none">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-red-600" />
                      Send Direct Push Notification
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      Deliver an instant push alert straight to this user&apos;s mobile device.
                    </p>
                    <div className="space-y-2">
                      <Input
                        placeholder="Notification Title (e.g. Breaking Update / Account Alert)"
                        value={notifTitle}
                        onChange={e => setNotifTitle(e.target.value)}
                        className="text-xs"
                      />
                      <Textarea
                        placeholder="Write your push notification message..."
                        value={notifMessage}
                        onChange={e => setNotifMessage(e.target.value)}
                        rows={3}
                        className="text-xs resize-none"
                      />
                      <Button
                        size="sm"
                        onClick={handleSendNotification}
                        disabled={sendingNotif || !data.user.fcmToken}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold gap-1.5"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {sendingNotif ? 'Delivering...' : 'Send Direct Push'}
                      </Button>
                      {!data.user.fcmToken && (
                        <p className="text-[11px] text-amber-600">
                          * Push cannot be sent because this user has not registered a push token yet.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Account Security & Moderation Controls */}
                <Card className="border shadow-none">
                  <CardContent className="p-4 space-y-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Account Status & Moderation
                    </h4>
                    <div className="flex items-center justify-between p-3 rounded-lg border bg-slate-50/50">
                      <div>
                        <div className="font-semibold text-xs text-slate-800">
                          {data.user.isActive ? 'Active Reader Status' : 'Account Suspended / Blocked'}
                        </div>
                        <div className="text-[11px] text-muted-foreground">
                          {data.user.isActive
                            ? 'User can browse, bookmark, comment, and read news.'
                            : 'User is blocked from logging in or performing actions.'}
                        </div>
                      </div>
                      <Button
                        variant={data.user.isActive ? 'destructive' : 'default'}
                        size="sm"
                        onClick={handleToggleStatus}
                        disabled={togglingStatus}
                        className="text-xs font-semibold"
                      >
                        {data.user.isActive ? 'Block User' : 'Unblock User'}
                      </Button>
                    </div>

                    <div className="pt-2 flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Permanent removal of reader account:
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteUser}
                        className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Soft Delete User
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
