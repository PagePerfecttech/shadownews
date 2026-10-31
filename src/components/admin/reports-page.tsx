'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  RefreshCw,
  ShieldAlert,
  Flag,
  User,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { authFetchJson } from '@/lib/utils'

interface Reporter {
  id: string
  name: string
  role: string
  fakeNewsCount: number
  warningCount: number
}

interface NewsItem {
  id: string
  title: string
  status: string
  thumbnailUrl?: string | null
  deletedAt?: string | null
  reporter?: Reporter | null
}

interface ReportUser {
  id: string
  name?: string | null
  phone?: string | null
}

interface NewsReport {
  id: string
  newsId: string
  userId?: string | null
  reporterIp?: string | null
  reason: string
  details?: string | null
  status: string
  actionNotes?: string | null
  resolvedBy?: string | null
  resolvedAt?: string | null
  createdAt: string
  news: NewsItem
  user?: ReportUser | null
}

const reasonLabels: Record<string, { label: string; color: string }> = {
  fake_news: { label: 'నకిలీ వార్త (Fake News)', color: 'bg-red-100 text-red-800 border-red-200' },
  hate_speech: { label: 'విద్వేషపూరితం (Hate Speech)', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  misleading: { label: 'తప్పుదోవ పట్టించేది (Misleading)', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  copyright: { label: 'కాపీరైట్ ఉల్లంఘన (Copyright)', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  duplicate: { label: 'నకిలీ పునరావృతం (Duplicate)', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  graphic_violence: { label: 'తీవ్ర హింస (Graphic Violence)', color: 'bg-rose-100 text-rose-800 border-rose-200' },
  other: { label: 'ఇతర కారణం (Other)', color: 'bg-gray-100 text-gray-800 border-gray-200' },
}

export default function ReportsPage() {
  const [reports, setReports] = useState<NewsReport[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved_dismissed' | 'resolved_removed' | 'all'>('pending')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pendingCount, setPendingCount] = useState(0)
  const [selectedReport, setSelectedReport] = useState<NewsReport | null>(null)
  const [actionType, setActionType] = useState<'dismiss' | 'take_down' | null>(null)
  const [actionNotes, setActionNotes] = useState('')
  const [submittingAction, setSubmittingAction] = useState(false)

  const fetchReports = useCallback(async () => {
    setLoading(true)
    try {
      const data = await authFetchJson<{
        reports: NewsReport[]
        total: number
        pendingCount: number
        totalPages: number
      }>(`/api/admin/reports?status=${statusFilter}&page=${page}&limit=20`)

      setReports(data.reports || [])
      setPendingCount(data.pendingCount || 0)
      setTotalPages(data.totalPages || 1)
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

  const handleResolve = async () => {
    if (!selectedReport || !actionType) return

    setSubmittingAction(true)
    try {
      const res = await authFetchJson<{ success: boolean; message: string }>(
        `/api/admin/reports/${selectedReport.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: actionType,
            notes: actionNotes,
          }),
        }
      )

      if (res.success) {
        toast.success(res.message || 'Report action completed successfully')
        setSelectedReport(null)
        setActionType(null)
        setActionNotes('')
        fetchReports()
      } else {
        toast.error('Action failed')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to process report')
    } finally {
      setSubmittingAction(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Citizen Reports & Moderation</h1>
            {pendingCount > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {pendingCount} Pending Action
              </Badge>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Citizen flagged content queue. Review reported stories, dismiss false reports, or take down violations with automatic reporter penalty.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchReports}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={statusFilter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setStatusFilter('pending'); setPage(1); }}
          className={statusFilter === 'pending' ? 'bg-red-600 hover:bg-red-700' : ''}
        >
          <AlertTriangle className="h-4 w-4 mr-1.5" />
          Pending Review ({pendingCount})
        </Button>
        <Button
          variant={statusFilter === 'resolved_removed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setStatusFilter('resolved_removed'); setPage(1); }}
        >
          <XCircle className="h-4 w-4 mr-1.5 text-rose-500" />
          Taken Down / Removed
        </Button>
        <Button
          variant={statusFilter === 'resolved_dismissed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setStatusFilter('resolved_dismissed'); setPage(1); }}
        >
          <CheckCircle className="h-4 w-4 mr-1.5 text-emerald-500" />
          Dismissed (Valid News)
        </Button>
        <Button
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => { setStatusFilter('all'); setPage(1); }}
        >
          All Reports
        </Button>
      </div>

      {/* Reports Table Card */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/70">
                <TableHead className="w-[120px]">Reported At</TableHead>
                <TableHead className="w-[180px]">Flag Reason</TableHead>
                <TableHead>News Article</TableHead>
                <TableHead className="w-[160px]">Reporter</TableHead>
                <TableHead className="w-[130px]">Status</TableHead>
                <TableHead className="text-right w-[140px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="h-6 w-6 animate-spin text-red-600" />
                      <span>Loading citizen moderation reports...</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle className="h-8 w-8 text-emerald-500" />
                      <span className="font-medium text-slate-700">No reports found in this view</span>
                      <span className="text-xs text-slate-400">All citizen complaints have been resolved!</span>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map(report => {
                  const reasonInfo = reasonLabels[report.reason] || reasonLabels.other
                  const reporter = report.news?.reporter
                  const isPending = report.status === 'pending'

                  return (
                    <TableRow key={report.id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs text-slate-500 font-mono">
                        {new Date(report.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[11px] font-semibold border ${reasonInfo.color}`}>
                          {reasonInfo.label}
                        </Badge>
                        {report.details && (
                          <p className="text-xs text-slate-600 mt-1 line-clamp-1 italic">
                            &ldquo;{report.details}&rdquo;
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-start gap-3">
                          {report.news?.thumbnailUrl && (
                            <img
                              src={report.news.thumbnailUrl}
                              alt=""
                              className="w-12 h-12 object-cover rounded border flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 line-clamp-2">
                              {report.news?.title || '(Deleted News)'}
                            </p>
                            <span className="text-[11px] text-slate-400">
                              ID: {report.newsId}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {reporter ? (
                          <div className="space-y-0.5">
                            <p className="text-xs font-semibold text-slate-800">{reporter.name}</p>
                            <p className="text-[10px] text-slate-500 capitalize">{reporter.role}</p>
                            {reporter.fakeNewsCount > 0 && (
                              <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">
                                {reporter.fakeNewsCount} Fake Strikes
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Direct / Admin</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {report.status === 'pending' ? (
                          <Badge className="bg-amber-500 text-white hover:bg-amber-600">Pending</Badge>
                        ) : report.status === 'resolved_removed' ? (
                          <Badge variant="destructive">Taken Down</Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-300 text-emerald-700 bg-emerald-50">
                            Dismissed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isPending ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-slate-700 hover:bg-slate-100"
                              onClick={() => {
                                setSelectedReport(report)
                                setActionType('dismiss')
                                setActionNotes('')
                              }}
                            >
                              Dismiss
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 text-xs bg-red-600 hover:bg-red-700"
                              onClick={() => {
                                setSelectedReport(report)
                                setActionType('take_down')
                                setActionNotes('')
                              }}
                            >
                              Take Down
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-slate-500"
                            onClick={() => {
                              setSelectedReport(report)
                              setActionType(null)
                            }}
                          >
                            <Eye className="h-3.5 w-3.5 mr-1" /> View Note
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action / View Confirmation Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={open => !open && setSelectedReport(null)}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'take_down' ? (
                <>
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  Take Down News Article
                </>
              ) : actionType === 'dismiss' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Dismiss Citizen Report
                </>
              ) : (
                <>
                  <Eye className="h-5 w-5 text-slate-600" />
                  Report Resolution Details
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'take_down'
                ? 'This will immediately soft-delete this story, penalize the reporter score, increment fake news strikes, and automatically reverse any credited reward.'
                : actionType === 'dismiss'
                  ? 'Mark this citizen report as reviewed and dismissed. The story will remain published and live in feeds.'
                  : 'Moderation audit log for this citizen complaint.'}
            </DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4 py-2 text-sm">
              <div className="p-3 bg-slate-50 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500">News Title:</span>
                  <Badge variant="outline" className="text-[10px]">
                    {selectedReport.news?.status}
                  </Badge>
                </div>
                <p className="font-semibold text-slate-900">{selectedReport.news?.title}</p>
                <div className="pt-1 flex items-center justify-between text-xs text-slate-500">
                  <span>Report Reason: <strong>{selectedReport.reason}</strong></span>
                  {selectedReport.news?.reporter && (
                    <span>Reporter: <strong>{selectedReport.news.reporter.name}</strong></span>
                  )}
                </div>
                {selectedReport.details && (
                  <div className="mt-2 text-xs bg-white p-2 rounded border text-slate-700">
                    <strong>Citizen Notes:</strong> {selectedReport.details}
                  </div>
                )}
              </div>

              {actionType ? (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-700">
                    Moderator Action Notes / Decision Reason:
                  </label>
                  <Textarea
                    placeholder={
                      actionType === 'take_down'
                        ? 'e.g. Unverified claim, violate community standard on misleading information...'
                        : 'e.g. Verified with primary sources, claim is factual.'
                    }
                    value={actionNotes}
                    onChange={e => setActionNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-slate-500">Resolution Notes:</span>
                  <p className="text-sm bg-slate-50 p-3 rounded border text-slate-700">
                    {selectedReport.actionNotes || 'No notes entered.'}
                  </p>
                  {selectedReport.resolvedAt && (
                    <p className="text-xs text-slate-400">
                      Resolved at: {new Date(selectedReport.resolvedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReport(null)} disabled={submittingAction}>
              {actionType ? 'Cancel' : 'Close'}
            </Button>
            {actionType && (
              <Button
                variant={actionType === 'take_down' ? 'destructive' : 'default'}
                onClick={handleResolve}
                disabled={submittingAction}
                className={actionType === 'dismiss' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''}
              >
                {submittingAction
                  ? 'Processing...'
                  : actionType === 'take_down'
                    ? 'Confirm Take Down & Penalize'
                    : 'Confirm Dismissal'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

