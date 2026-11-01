'use client'

import { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  User,
  Newspaper,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  History,
  ShieldCheck,
  KeyRound,
  ExternalLink,
  PlusCircle,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  RefreshCw,
  Edit,
  Maximize2,
  Minimize2,
} from 'lucide-react'
import { authFetchJSON, authFetchJson, cn } from '@/lib/utils'

interface ReporterDetailData {
  id: string
  name: string
  phone: string
  email: string | null
  avatar: string | null
  bio: string | null
  idProofUrl: string | null
  beat: string | null
  status: string
  role: string
  postingScope: string
  allowedDistrictIds: string
  allowedMandalIds: string
  canPublishDirectly: boolean
  earningsBalance: number
  totalEarnings: number
  coinsBalance: number
  performanceScore: number
  fakeNewsCount: number
  warningCount: number
  currentStreakDays: number
  createdAt: string
  state?: { id: string; name: string }
  district?: { id: string; name: string }
  mandal?: { id: string; name: string }
  metrics: {
    totalNews: number
    approvedArticles: number
    pendingArticles: number
    rejectedArticles: number
    totalViews: number
    approvalRate: number
    fakeNewsCount: number
    warningCount: number
    currentStreakDays: number
    earningsBalance: number
    totalEarnings: number
  }
  news: Array<{
    id: string
    title: string
    shortDesc: string | null
    thumbnailUrl: string
    videoUrl: string | null
    status: string
    priority: string
    viewsCount: number
    sharesCount: number
    publishedAt: string | null
    createdAt: string
    category: { id: string; name: string; color: string }
    district?: { id: string; name: string } | null
    mandal?: { id: string; name: string } | null
    approver?: { id: string; name: string } | null
    approvedAt?: string | null
    earnings: number
  }>
  walletTransactions: Array<{
    id: string
    amount: number
    moneyAmount: number
    type: string
    txCategory: string
    balanceAfter: number
    status: string
    description: string | null
    createdAt: string
  }>
  withdrawalRequests: Array<{
    id: string
    moneyAmount: number
    payoutMethod: string
    upiId: string | null
    bankAccountNumber: string | null
    bankIfsc: string | null
    bankAccountName: string | null
    status: string
    transactionReference: string | null
    rejectionReason: string | null
    createdAt: string
    processedAt: string | null
  }>
  levelAudits: Array<{
    id: string
    fromLevel: string
    toLevel: string
    action: string
    reason: string | null
    changedBy: string | null
    createdAt: string
  }>
  auditLogs: Array<{
    id: string
    action: string
    changes: string
    createdAt: string
    admin?: { name: string; email: string }
  }>
}

interface ReporterDetailModalProps {
  reporterId: string | null
  open: boolean
  onClose: () => void
  onUpdated?: () => void
}

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  active: 'bg-green-100 text-green-800 border-green-300',
  suspended: 'bg-red-100 text-red-800 border-red-300',
  rejected: 'bg-gray-100 text-gray-800 border-gray-300',
}

const newsStatusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  pending_review: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

export function ReporterDetailModal({
  reporterId,
  open,
  onClose,
  onUpdated,
}: ReporterDetailModalProps) {
  const [data, setData] = useState<ReporterDetailData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')
  const [newsFilter, setNewsFilter] = useState('all')
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Modals inside detail
  const [levelDialogOpen, setLevelDialogOpen] = useState(false)
  const [newLevel, setNewLevel] = useState('junior')
  const [levelReason, setLevelReason] = useState('')

  const [scopeDialogOpen, setScopeDialogOpen] = useState(false)
  const [newScope, setNewScope] = useState('mandal')

  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')

  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false)
  const [newPassword, setNewPassword] = useState('')

  const [warningDialogOpen, setWarningDialogOpen] = useState(false)
  const [warningReason, setWarningReason] = useState('')

  const [submitting, setSubmitting] = useState(false)

  const fetchDetails = useCallback(async () => {
    if (!reporterId) return
    try {
      setLoading(true)
      const res = await authFetchJson<ReporterDetailData>(`/api/admin/reporters/${reporterId}`)
      setData(res)
      setNewLevel(res.role || 'junior')
      setNewScope(res.postingScope || 'mandal')
    } catch {
      toast.error('Failed to load reporter details')
    } finally {
      setLoading(false)
    }
  }, [reporterId])

  useEffect(() => {
    if (open && reporterId) {
      fetchDetails()
    } else {
      setData(null)
    }
  }, [open, reporterId, fetchDetails])

  // Handle Quick Status Changes (active, suspended, rejected)
  const handleStatusChange = async (status: string) => {
    if (!reporterId) return
    try {
      await authFetchJSON(`/api/admin/reporters/${reporterId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      toast.success(`Reporter status updated to ${status}`)
      fetchDetails()
      if (onUpdated) onUpdated()
    } catch {
      toast.error('Failed to update status')
    }
  }

  // Handle Level Change
  const handleSaveLevel = async () => {
    if (!reporterId) return
    try {
      setSubmitting(true)
      await authFetchJSON(`/api/admin/reporters/${reporterId}`, {
        method: 'PUT',
        body: JSON.stringify({
          role: newLevel,
          levelChangeReason: levelReason || `Admin manual update to ${newLevel}`,
        }),
      })
      toast.success('Career level updated successfully')
      setLevelDialogOpen(false)
      setLevelReason('')
      fetchDetails()
      if (onUpdated) onUpdated()
    } catch {
      toast.error('Failed to update level')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Scope Change
  const handleSaveScope = async () => {
    if (!reporterId) return
    try {
      setSubmitting(true)
      await authFetchJSON(`/api/admin/reporters/${reporterId}`, {
        method: 'PUT',
        body: JSON.stringify({ postingScope: newScope }),
      })
      toast.success('Posting scope permission updated')
      setScopeDialogOpen(false)
      fetchDetails()
      if (onUpdated) onUpdated()
    } catch {
      toast.error('Failed to update posting scope')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Wallet Adjustment
  const handleSaveAdjustment = async () => {
    if (!reporterId) return
    const amountNum = parseFloat(adjustAmount)
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Enter a valid positive amount')
      return
    }
    if (!adjustReason.trim()) {
      toast.error('Please enter a reason for this adjustment')
      return
    }

    try {
      setSubmitting(true)
      await authFetchJSON(`/api/admin/reporters/${reporterId}`, {
        method: 'PUT',
        body: JSON.stringify({
          adjustWallet: {
            amount: amountNum,
            type: adjustType,
            reason: adjustReason.trim(),
          },
        }),
      })
      toast.success(`Wallet ${adjustType === 'credit' ? 'credited' : 'debited'} ₹${amountNum.toFixed(2)}`)
      setAdjustDialogOpen(false)
      setAdjustAmount('')
      setAdjustReason('')
      fetchDetails()
      if (onUpdated) onUpdated()
    } catch {
      toast.error('Failed to adjust wallet')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Password Reset
  const handleSavePassword = async () => {
    if (!reporterId) return
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    try {
      setSubmitting(true)
      await authFetchJSON(`/api/admin/reporters/${reporterId}`, {
        method: 'PUT',
        body: JSON.stringify({
          resetPassword: { newPassword },
        }),
      })
      toast.success('Reporter password reset successfully')
      setPasswordDialogOpen(false)
      setNewPassword('')
    } catch {
      toast.error('Failed to reset password')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Warning / Flagging
  const handleIssueWarning = async () => {
    if (!reporterId || !warningReason.trim()) {
      toast.error('Please provide a reason')
      return
    }
    try {
      setSubmitting(true)
      await authFetchJSON('/api/admin/reporters/performance', {
        method: 'POST',
        body: JSON.stringify({
          reporterId,
          action: 'warning',
          reason: warningReason.trim(),
        }),
      })
      toast.success('Warning issued to reporter')
      setWarningDialogOpen(false)
      setWarningReason('')
      fetchDetails()
      if (onUpdated) onUpdated()
    } catch {
      toast.error('Failed to issue warning')
    } finally {
      setSubmitting(false)
    }
  }

  const filteredNews = (data?.news || []).filter((item) => {
    if (newsFilter === 'all') return true
    return item.status === newsFilter
  })

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent
        className={cn(
          "flex flex-col p-0 overflow-hidden transition-all duration-200",
          isFullscreen
            ? "!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none sm:!max-w-none md:!max-w-none lg:!max-w-none xl:!max-w-none 2xl:!max-w-none !max-h-none !rounded-none z-50 border-0 shadow-none"
            : "!w-[98vw] !max-w-[98vw] sm:!max-w-[98vw] md:!max-w-[98vw] lg:!max-w-[98vw] xl:!max-w-[98vw] 2xl:!max-w-[98vw] !h-[96vh] !max-h-[96vh] rounded-xl border-slate-800 shadow-2xl"
        )}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-4">
            {data?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.avatar}
                alt={data.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-red-500 shadow-md"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-600 text-white font-bold text-2xl flex items-center justify-center uppercase shadow-md">
                {data?.name?.charAt(0) || 'R'}
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold">{data?.name || <Skeleton className="h-6 w-32 bg-slate-700" />}</h2>
                {data?.role && (
                  <Badge className="bg-red-500/20 text-red-300 border-red-500/40 uppercase text-xs">
                    {data.role.replace('_', ' ')}
                  </Badge>
                )}
                {data?.status && (
                  <Badge variant="outline" className={statusColors[data.status] || 'bg-slate-800 text-slate-300'}>
                    {data.status}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {data?.phone} • {data?.email || 'No email'}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Location: {data?.mandal?.name ? `${data.mandal.name}, ` : ''}
                {data?.district?.name || '-'}, {data?.state?.name || '-'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
              onClick={fetchDetails}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
              onClick={() => setPasswordDialogOpen(true)}
            >
              <KeyRound className="h-3.5 w-3.5 mr-1 text-amber-400" /> Reset Password
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-slate-700 text-slate-200 hover:bg-slate-800 text-xs"
              onClick={() => setIsFullscreen(!isFullscreen)}
              title={isFullscreen ? 'Exit Full Screen' : 'Toggle Full Screen'}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5 mr-1 text-blue-400" /> Exit Fullscreen
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5 mr-1 text-blue-400" /> Fullscreen
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Content Body */}
        {loading && !data ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid grid-cols-6 w-full bg-slate-100 p-1">
                <TabsTrigger value="profile" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <User className="h-4 w-4" /> Profile
                </TabsTrigger>
                <TabsTrigger value="news" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Newspaper className="h-4 w-4" /> News ({data?.metrics?.totalNews || 0})
                </TabsTrigger>
                <TabsTrigger value="wallet" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Wallet className="h-4 w-4" /> Wallet & Earnings
                </TabsTrigger>
                <TabsTrigger value="withdrawals" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <ArrowUpRight className="h-4 w-4" /> Withdrawals
                </TabsTrigger>
                <TabsTrigger value="performance" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <Award className="h-4 w-4" /> Performance
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs sm:text-sm flex items-center gap-1.5">
                  <History className="h-4 w-4" /> Audit Log
                </TabsTrigger>
              </TabsList>

              {/* 1. TAB: PROFILE & MODERATION */}
              <TabsContent value="profile" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left Column: Location & Permissions */}
                  <div className="md:col-span-2 space-y-4">
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-semibold text-sm text-slate-800 border-b pb-2">Reporter Details & Assignments</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground block">Career Level</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge className="bg-slate-100 text-slate-800 font-bold border capitalize">
                                {data?.role?.replace('_', ' ') || 'Junior'}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs text-blue-600 hover:text-blue-700 p-1"
                                onClick={() => setLevelDialogOpen(true)}
                              >
                                <Edit className="h-3 w-3 mr-1" /> Change
                              </Button>
                            </div>
                          </div>

                          <div>
                            <span className="text-xs text-muted-foreground block">Posting Scope</span>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge
                                variant="outline"
                                className={
                                  data?.postingScope === 'state'
                                    ? 'bg-purple-50 text-purple-700 border-purple-300'
                                    : data?.postingScope === 'district'
                                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                                    : 'bg-gray-50 text-gray-700 border-gray-300'
                                }
                              >
                                {data?.postingScope || 'mandal'}-level
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 text-xs text-blue-600 hover:text-blue-700 p-1"
                                onClick={() => setScopeDialogOpen(true)}
                              >
                                <Edit className="h-3 w-3 mr-1" /> Edit
                              </Button>
                            </div>
                          </div>

                          <div>
                            <span className="text-xs text-muted-foreground block">Beat / Category</span>
                            <p className="font-medium mt-0.5">{data?.beat || 'General News'}</p>
                          </div>

                          <div>
                            <span className="text-xs text-muted-foreground block">Direct Publish Right</span>
                            <p className="font-medium mt-0.5">
                              {data?.canPublishDirectly ? (
                                <span className="text-green-600 font-semibold flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4" /> Enabled (Auto-publish)
                                </span>
                              ) : (
                                <span className="text-amber-600 font-semibold flex items-center gap-1">
                                  <Clock className="h-4 w-4" /> Editorial Review Required
                                </span>
                              )}
                            </p>
                          </div>

                          <div>
                            <span className="text-xs text-muted-foreground block">Home State</span>
                            <p className="font-medium mt-0.5">{data?.state?.name || '-'}</p>
                          </div>

                          <div>
                            <span className="text-xs text-muted-foreground block">Home District</span>
                            <p className="font-medium mt-0.5">{data?.district?.name || '-'}</p>
                          </div>

                          <div>
                            <span className="text-xs text-muted-foreground block">Home Mandal</span>
                            <p className="font-medium mt-0.5">{data?.mandal?.name || '-'}</p>
                          </div>

                          <div>
                            <span className="text-xs text-muted-foreground block">Member Since</span>
                            <p className="font-medium mt-0.5">
                              {data?.createdAt ? new Date(data.createdAt).toLocaleDateString() : '-'}
                            </p>
                          </div>
                        </div>

                        {data?.bio && (
                          <div className="pt-2 border-t text-sm">
                            <span className="text-xs text-muted-foreground block">Bio</span>
                            <p className="text-slate-700 mt-1">{data.bio}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Quick Admin Actions */}
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <h4 className="font-semibold text-sm text-slate-800">Account Moderation Actions</h4>
                        <div className="flex flex-wrap items-center gap-2">
                          {data?.status !== 'active' && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white text-xs"
                              onClick={() => handleStatusChange('active')}
                            >
                              <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve & Activate
                            </Button>
                          )}
                          {data?.status !== 'suspended' && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-amber-600 border-amber-300 hover:bg-amber-50 text-xs"
                              onClick={() => handleStatusChange('suspended')}
                            >
                              <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Suspend Reporter
                            </Button>
                          )}
                          {data?.status !== 'rejected' && (
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs"
                              onClick={() => handleStatusChange('rejected')}
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Block / Reject
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                            onClick={() => setWarningDialogOpen(true)}
                          >
                            <AlertTriangle className="h-3.5 w-3.5 mr-1" /> Issue Warning
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Right Column: ID Proof Document */}
                  <div className="space-y-4">
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-sm text-slate-800 flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-blue-600" /> Submitted ID Proof
                          </h4>
                          {data?.idProofUrl && (
                            <a
                              href={data.idProofUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              Full View <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>

                        {data?.idProofUrl ? (
                          <div className="border rounded-lg overflow-hidden bg-slate-50 p-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={data.idProofUrl}
                              alt="ID Proof"
                              className="w-full h-48 object-contain rounded bg-white"
                            />
                            <p className="text-[11px] text-muted-foreground text-center mt-2">
                              Verified ID / Press Credential
                            </p>
                          </div>
                        ) : (
                          <div className="p-8 text-center border border-dashed rounded-lg text-slate-400 bg-slate-50 text-xs">
                            No ID proof uploaded by this reporter
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* 2. TAB: PUBLISHED NEWS */}
              <TabsContent value="news" className="space-y-4">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">Filter Status:</span>
                    {['all', 'published', 'pending_review', 'rejected'].map((st) => (
                      <Button
                        key={st}
                        size="sm"
                        variant={newsFilter === st ? 'default' : 'outline'}
                        className={`h-7 text-xs capitalize ${
                          newsFilter === st ? 'bg-red-600 hover:bg-red-700' : ''
                        }`}
                        onClick={() => setNewsFilter(st)}
                      >
                        {st.replace('_', ' ')}
                      </Button>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Showing {filteredNews.length} of {data?.news?.length || 0} articles
                  </span>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="min-w-[200px]">Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Views</TableHead>
                        <TableHead>Earnings</TableHead>
                        <TableHead>Published / Approved By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNews.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                            No news articles found for this filter.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredNews.map((n) => (
                          <TableRow key={n.id}>
                            <TableCell>
                              {n.thumbnailUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={n.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-400">
                                  N
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="font-semibold text-xs line-clamp-2">{n.title}</p>
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(n.createdAt).toLocaleDateString()}
                              </span>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                style={{ borderColor: n.category?.color, color: n.category?.color }}
                                className="text-[10px]"
                              >
                                {n.category?.name}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {n.mandal?.name ? `${n.mandal.name}, ` : ''}
                              {n.district?.name || '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] ${newsStatusColors[n.status] || ''}`}>
                                {n.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-medium">{n.viewsCount || 0}</TableCell>
                            <TableCell className="text-xs font-semibold text-green-700">
                              {n.earnings > 0 ? `+₹${n.earnings.toFixed(2)}` : '₹0.00'}
                            </TableCell>
                            <TableCell className="text-xs">
                              {n.approver?.name ? (
                                <div>
                                  <span className="font-medium text-slate-800">{n.approver.name}</span>
                                  {n.approvedAt && (
                                    <span className="block text-[10px] text-muted-foreground">
                                      {new Date(n.approvedAt).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px]">-</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* 3. TAB: EARNINGS & WALLET LEDGER */}
              <TabsContent value="wallet" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                    <CardContent className="p-4">
                      <span className="text-xs text-green-700 font-medium">Available Cash Balance</span>
                      <p className="text-2xl font-bold text-green-900 mt-1">
                        ₹{(data?.earningsBalance || 0).toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
                    <CardContent className="p-4">
                      <span className="text-xs text-blue-700 font-medium">Lifetime Total Earned</span>
                      <p className="text-2xl font-bold text-blue-900 mt-1">
                        ₹{(data?.totalEarnings || 0).toFixed(2)}
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-amber-700 font-medium">Reward Coins</span>
                        <p className="text-2xl font-bold text-amber-900 mt-1">{data?.coinsBalance || 0}</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                        onClick={() => setAdjustDialogOpen(true)}
                      >
                        <PlusCircle className="h-3.5 w-3.5 mr-1" /> Adjust Balance
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm text-slate-800">Double-Entry Wallet Transactions</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Date & Time</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount (₹)</TableHead>
                          <TableHead>Balance After (₹)</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.walletTransactions || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground text-sm">
                              No wallet transactions logged yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          data?.walletTransactions.map((tx) => (
                            <TableRow key={tx.id}>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(tx.createdAt).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={
                                    tx.txCategory === 'CREDIT'
                                      ? 'bg-green-50 text-green-700 border-green-300'
                                      : 'bg-red-50 text-red-700 border-red-300'
                                  }
                                >
                                  {tx.txCategory}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-xs max-w-[280px]">{tx.description || tx.type}</TableCell>
                              <TableCell
                                className={`text-xs font-bold ${
                                  tx.txCategory === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                                }`}
                              >
                                {tx.txCategory === 'CREDIT' ? '+' : '-'}₹{(tx.moneyAmount ?? 0).toFixed(2)}
                              </TableCell>
                              <TableCell className="text-xs font-semibold">
                                ₹{(tx.balanceAfter ?? 0).toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Badge className="bg-slate-100 text-slate-700 text-[10px]">{tx.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>

              {/* 4. TAB: WITHDRAWALS HISTORY */}
              <TabsContent value="withdrawals" className="space-y-4">
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payout Method</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>UTR / Ref</TableHead>
                        <TableHead>Processed At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(data?.withdrawalRequests || []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                            No withdrawal requests from this reporter yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        data?.withdrawalRequests.map((w) => (
                          <TableRow key={w.id}>
                            <TableCell className="text-xs">
                              {new Date(w.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs font-bold text-slate-900">
                              ₹{w.moneyAmount.toFixed(2)}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs uppercase">
                                {w.payoutMethod}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {w.payoutMethod === 'upi' ? (
                                <span>UPI: {w.upiId}</span>
                              ) : (
                                <span>
                                  A/C: {w.bankAccountNumber} ({w.bankIfsc})
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={
                                  w.status === 'completed'
                                    ? 'bg-green-100 text-green-800'
                                    : w.status === 'rejected'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-amber-100 text-amber-800'
                                }
                              >
                                {w.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono">
                              {w.transactionReference || (w.rejectionReason ? `Reason: ${w.rejectionReason}` : '-')}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {w.processedAt ? new Date(w.processedAt).toLocaleDateString() : 'Pending'}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              {/* 5. TAB: PERFORMANCE METRICS */}
              <TabsContent value="performance" className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <span className="text-xs text-muted-foreground">Approval Rate</span>
                      <p className="text-2xl font-bold text-slate-900 mt-1">{data?.metrics?.approvalRate || 0}%</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <span className="text-xs text-muted-foreground">Total Views</span>
                      <p className="text-2xl font-bold text-slate-900 mt-1">
                        {(data?.metrics?.totalViews || 0).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <span className="text-xs text-muted-foreground">Current Streak</span>
                      <p className="text-2xl font-bold text-amber-600 mt-1">
                        {data?.metrics?.currentStreakDays || 0} Days
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <span className="text-xs text-muted-foreground">Warnings Issued</span>
                      <p className="text-2xl font-bold text-red-600 mt-1">{data?.metrics?.warningCount || 0}</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* 6. TAB: ACTIVITY & AUDIT LOG */}
              <TabsContent value="activity" className="space-y-4">
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-slate-800">Career Level Change History</h4>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-slate-50">
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>From Level</TableHead>
                          <TableHead>To Level</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Reason</TableHead>
                          <TableHead>Changed By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(data?.levelAudits || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground text-xs">
                              No career level audits recorded yet.
                            </TableCell>
                          </TableRow>
                        ) : (
                          data?.levelAudits.map((a) => (
                            <TableRow key={a.id}>
                              <TableCell className="text-xs text-muted-foreground">
                                {new Date(a.createdAt).toLocaleString()}
                              </TableCell>
                              <TableCell className="text-xs font-medium uppercase">{a.fromLevel}</TableCell>
                              <TableCell className="text-xs font-bold text-green-700 uppercase">{a.toLevel}</TableCell>
                              <TableCell className="text-xs">{a.action}</TableCell>
                              <TableCell className="text-xs">{a.reason || '-'}</TableCell>
                              <TableCell className="text-xs font-medium">{a.changedBy || 'System'}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* DIALOG: Change Level */}
        <Dialog open={levelDialogOpen} onOpenChange={setLevelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Reporter Career Level</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 my-2">
              <div className="space-y-2">
                <Label>Select New Level</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-background"
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                >
                  <option value="trainee">Trainee Reporter</option>
                  <option value="junior">Junior Reporter</option>
                  <option value="senior">Senior Reporter</option>
                  <option value="mandal_head">Mandal Head</option>
                  <option value="district_head">District Head</option>
                  <option value="state_head">State Head</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Reason / Note for Promotion or Demotion</Label>
                <Textarea
                  value={levelReason}
                  onChange={(e) => setLevelReason(e.target.value)}
                  placeholder="e.g. Consistently meets publication targets and high accuracy..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setLevelDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveLevel} disabled={submitting}>
                Save Level Change
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG: Edit Posting Scope */}
        <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Override Posting Scope Permission</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 my-2">
              <div className="space-y-2">
                <Label>Select Posting Scope</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-background"
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                >
                  <option value="mandal">Mandal-Level (Can only post for assigned mandal)</option>
                  <option value="district">District-Level (Can post for any mandal in home district)</option>
                  <option value="state">State-Level (Can post state-wide / any district/mandal)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setScopeDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveScope} disabled={submitting}>
                Update Scope
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG: Manual Wallet Adjustment */}
        <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manual Wallet Adjustment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 my-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Adjustment Type</Label>
                  <select
                    className="w-full border rounded-md p-2 text-sm bg-background"
                    value={adjustType}
                    onChange={(e) => setAdjustType(e.target.value as 'credit' | 'debit')}
                  >
                    <option value="credit">Credit (+) Add Money</option>
                    <option value="debit">Debit (-) Deduct Money</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹ INR)</Label>
                  <Input
                    type="number"
                    min="1"
                    step="0.01"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder="e.g. 500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Mandatory Reason</Label>
                <Textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Correction for article #1234 bonus..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAdjustDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleSaveAdjustment} disabled={submitting}>
                Execute Adjustment
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG: Reset Password */}
        <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Reporter Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 my-2">
              <div className="space-y-2">
                <Label>New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleSavePassword} disabled={submitting}>
                Set New Password
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* DIALOG: Issue Warning */}
        <Dialog open={warningDialogOpen} onOpenChange={setWarningDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Issue Formal Warning</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 my-2">
              <div className="space-y-2">
                <Label>Warning Reason</Label>
                <Textarea
                  value={warningReason}
                  onChange={(e) => setWarningReason(e.target.value)}
                  placeholder="Reason for editorial warning..."
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setWarningDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleIssueWarning} disabled={submitting}>
                Issue Warning
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}

