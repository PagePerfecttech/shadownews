'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Banknote, CheckCircle, XCircle, Clock, Search, Download,
  Filter, MoreHorizontal, User, RefreshCw, Eye, ShieldCheck,
  Building2, QrCode, ArrowUpDown, ChevronLeft, ChevronRight,
  AlertTriangle, DollarSign, Calendar
} from 'lucide-react'
import { authFetchJson, authFetchJSON } from '@/lib/utils'

interface ReporterInfo {
  id: string
  name: string
  phone: string
  role: string
  avatar?: string | null
  currentBalance: number
  coinsBalance: number
  district: string
  mandal: string
}

interface WithdrawalItem {
  id: string
  reporterId: string
  coinsAmount: number
  moneyAmount: number
  balanceAtRequest?: number | null
  payoutMethod: 'upi' | 'bank_transfer'
  upiId?: string | null
  bankAccountNumber?: string | null
  bankIfsc?: string | null
  bankAccountName?: string | null
  status: 'pending' | 'processing' | 'approved' | 'completed' | 'rejected'
  transactionReference?: string | null
  rejectionReason?: string | null
  adminNotes?: string | null
  processedBy?: string | null
  processedAt?: string | null
  walletTransactionId?: string | null
  createdAt: string
  updatedAt: string
  reporter: ReporterInfo
}

interface SummaryData {
  pendingCount: number
  pendingAmount: number
  paidTodayCount: number
  paidTodayAmount: number
  paidMonthCount: number
  paidMonthAmount: number
  rejectedCount: number
}

interface PaginationData {
  page: number
  limit: number
  total: number
  totalPages: number
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([])
  const [summary, setSummary] = useState<SummaryData>({
    pendingCount: 0,
    pendingAmount: 0,
    paidTodayCount: 0,
    paidTodayAmount: 0,
    paidMonthCount: 0,
    paidMonthAmount: 0,
    rejectedCount: 0,
  })
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)

  // Filters state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')

  // Multi-select for bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modal dialog states
  const [activeItem, setActiveItem] = useState<WithdrawalItem | null>(null)
  const [detailData, setDetailData] = useState<any>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isPayOpen, setIsPayOpen] = useState(false)
  const [isRejectOpen, setIsRejectOpen] = useState(false)
  const [isBulkOpen, setIsBulkOpen] = useState(false)

  // Form states inside modals
  const [utrReference, setUtrReference] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [batchUtrPrefix, setBatchUtrPrefix] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchWithdrawals = useCallback(async (targetPage = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', targetPage.toString())
      params.set('limit', '20')
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (methodFilter && methodFilter !== 'all') params.set('payoutMethod', methodFilter)
      if (search.trim()) params.set('search', search.trim())
      if (startDate) params.set('startDate', startDate)
      if (endDate) params.set('endDate', endDate)
      if (minAmount) params.set('minAmount', minAmount)
      if (maxAmount) params.set('maxAmount', maxAmount)

      const res = await authFetchJson<{
        withdrawals: WithdrawalItem[]
        pagination: PaginationData
        summary: SummaryData
      }>(`/api/admin/withdrawals?${params.toString()}`)

      if (res) {
        setWithdrawals(res.withdrawals || [])
        setPagination(res.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 })
        setSummary(res.summary || summary)
      }
    } catch (err) {
      console.error(err)
      toast.error('Failed to load withdrawal requests')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, methodFilter, search, startDate, endDate, minAmount, maxAmount])

  useEffect(() => {
    fetchWithdrawals(1)
  }, [fetchWithdrawals])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(withdrawals.map(w => w.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id])
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id))
    }
  }

  const openDetailDialog = async (item: WithdrawalItem) => {
    setActiveItem(item)
    setIsDetailOpen(true)
    try {
      const data = await authFetchJson<any>(`/api/admin/withdrawals/${item.id}`)
      setDetailData(data)
    } catch {
      toast.error('Failed to fetch detailed reporter history')
    }
  }

  const openPayDialog = (item: WithdrawalItem) => {
    setActiveItem(item)
    setUtrReference('')
    setAdminNotes(item.adminNotes || '')
    setIsPayOpen(true)
  }

  const openRejectDialog = (item: WithdrawalItem) => {
    setActiveItem(item)
    setRejectionReason('')
    setAdminNotes(item.adminNotes || '')
    setIsRejectOpen(true)
  }

  const handleApproveQuick = async (item: WithdrawalItem) => {
    try {
      const res = await authFetchJSON(`/api/admin/withdrawals/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'approved' })
      })
      if (!res.ok) throw new Error()
      toast.success(`Request for ₹${item.moneyAmount} approved for payout`)
      fetchWithdrawals(pagination.page)
    } catch {
      toast.error('Failed to approve request')
    }
  }

  const handleMarkPaid = async () => {
    if (!activeItem) return
    if (!utrReference.trim()) {
      toast.error('Please enter the bank UTR or payment reference ID')
      return
    }

    setSubmitting(true)
    try {
      const res = await authFetchJSON(`/api/admin/withdrawals/${activeItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'completed',
          transactionReference: utrReference.trim(),
          adminNotes: adminNotes.trim(),
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to complete payout')
      }
      toast.success(`₹${activeItem.moneyAmount} payout marked as PAID (UTR: ${utrReference})`)
      setIsPayOpen(false)
      setActiveItem(null)
      fetchWithdrawals(pagination.page)
    } catch (e: any) {
      toast.error(e.message || 'Payment processing failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    if (!activeItem) return
    if (!rejectionReason.trim()) {
      toast.error('Please enter the reason for rejection (refund will be automated)')
      return
    }

    setSubmitting(true)
    try {
      const res = await authFetchJSON(`/api/admin/withdrawals/${activeItem.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: 'rejected',
          rejectionReason: rejectionReason.trim(),
          adminNotes: adminNotes.trim(),
        })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to reject payout')
      }
      toast.success(`Request rejected and ₹${activeItem.moneyAmount} refunded back to reporter ledger`)
      setIsRejectOpen(false)
      setActiveItem(null)
      fetchWithdrawals(pagination.page)
    } catch (e: any) {
      toast.error(e.message || 'Rejection failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleBulkAction = async (action: 'bulk_approve' | 'bulk_mark_paid') => {
    if (selectedIds.length === 0) return
    setSubmitting(true)
    try {
      const res = await authFetchJSON('/api/admin/withdrawals', {
        method: 'POST',
        body: JSON.stringify({
          action,
          ids: selectedIds,
          transactionReferencePrefix: batchUtrPrefix.trim() || undefined,
        })
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      toast.success(`Successfully processed ${data.processed} of ${selectedIds.length} withdrawals`)
      setSelectedIds([])
      setIsBulkOpen(false)
      fetchWithdrawals(pagination.page)
    } catch {
      toast.error('Bulk action failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleExportCsv = () => {
    const params = new URLSearchParams()
    params.set('export', 'csv')
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
    if (methodFilter && methodFilter !== 'all') params.set('payoutMethod', methodFilter)
    if (search.trim()) params.set('search', search.trim())
    if (startDate) params.set('startDate', startDate)
    if (endDate) params.set('endDate', endDate)

    window.open(`/api/admin/withdrawals?${params.toString()}`, '_blank')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">PAID</Badge>
      case 'approved':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">APPROVED</Badge>
      case 'processing':
        return <Badge className="bg-sky-100 text-sky-800 border-sky-200">PROCESSING</Badge>
      case 'rejected':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">REJECTED</Badge>
      default:
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">PENDING</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Banknote className="h-6 w-6 text-red-600" />
            Reporter Withdrawals & Payouts Engine
          </h1>
          <p className="text-sm text-muted-foreground">
            Review, verify, and approve reporter cash withdrawals with automated double-entry ledger settlement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchWithdrawals(pagination.page)}>
            <RefreshCw className="h-4 w-4 mr-1.5" /> Reload
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCsv}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border shadow-sm bg-gradient-to-br from-amber-50/50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Pending Payouts</p>
                <h3 className="text-2xl font-bold text-amber-950 mt-1">₹{summary.pendingAmount.toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{summary.pendingCount} requests awaiting review</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-gradient-to-br from-emerald-50/50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Paid Today</p>
                <h3 className="text-2xl font-bold text-emerald-950 mt-1">₹{summary.paidTodayAmount.toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{summary.paidTodayCount} completed transfers</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-gradient-to-br from-blue-50/50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Paid This Month</p>
                <h3 className="text-2xl font-bold text-blue-950 mt-1">₹{summary.paidMonthAmount.toLocaleString()}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{summary.paidMonthCount} total monthly transfers</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm bg-gradient-to-br from-rose-50/50 to-white">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Rejected & Refunded</p>
                <h3 className="text-2xl font-bold text-rose-950 mt-1">{summary.rejectedCount}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Declined & balances returned</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-700">
                <XCircle className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Control Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Search */}
            <div className="col-span-1 sm:col-span-2">
              <Label className="text-xs font-medium">Search Reporter / Payment</Label>
              <div className="relative mt-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Name, phone, UPI, or A/C..."
                  className="pl-8 text-xs"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <Label className="text-xs font-medium">Status</Label>
              <select
                className="w-full border rounded-md p-2 text-xs bg-background mt-1 font-medium"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="completed">Completed (Paid)</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Method Filter */}
            <div>
              <Label className="text-xs font-medium">Payout Method</Label>
              <select
                className="w-full border rounded-md p-2 text-xs bg-background mt-1 font-medium"
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
              >
                <option value="all">All Methods</option>
                <option value="upi">UPI Transfer</option>
                <option value="bank_transfer">Bank NEFT / IMPS</option>
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <Label className="text-xs font-medium">From Date</Label>
              <Input
                type="date"
                className="text-xs mt-1"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>

            {/* Date Range End */}
            <div>
              <Label className="text-xs font-medium">To Date</Label>
              <Input
                type="date"
                className="text-xs mt-1"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {/* Bulk Selection Bar */}
          {selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-600 text-white">{selectedIds.length}</Badge>
                <span className="text-sm font-semibold text-red-950">requests selected for bulk action</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('bulk_approve')}
                  disabled={submitting}
                >
                  <ShieldCheck className="h-4 w-4 mr-1.5 text-blue-600" /> Bulk Approve
                </Button>
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => setIsBulkOpen(true)}
                  disabled={submitting}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" /> Bulk Mark Paid
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.length > 0 && selectedIds.length === withdrawals.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Method & Details</TableHead>
                  <TableHead>Requested Amount</TableHead>
                  <TableHead>Balance at Request</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Reference / UTR</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={9} className="py-4">
                        <Skeleton className="h-10 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : withdrawals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      No withdrawal requests matching your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  withdrawals.map((w) => {
                    const isSelected = selectedIds.includes(w.id)
                    return (
                      <TableRow key={w.id} className={isSelected ? 'bg-muted/30' : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(w.id, Boolean(checked))}
                          />
                        </TableCell>

                        {/* Reporter details */}
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {w.reporter.name.charAt(0) || 'R'}
                            </div>
                            <div>
                              <div className="font-semibold text-sm hover:underline cursor-pointer" onClick={() => openDetailDialog(w)}>
                                {w.reporter.name}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">{w.reporter.phone}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {w.reporter.district} {w.reporter.mandal ? `• ${w.reporter.mandal}` : ''}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        {/* Payout method */}
                        <TableCell>
                          {w.payoutMethod === 'bank_transfer' ? (
                            <div className="space-y-0.5">
                              <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-700">
                                <Building2 className="h-3 w-3 mr-1" /> BANK TRANSFER
                              </Badge>
                              <div className="font-mono text-xs font-semibold">{w.bankAccountNumber || '-'}</div>
                              <div className="text-[11px] text-muted-foreground font-mono">{w.bankIfsc || ''}</div>
                              <div className="text-[11px] text-muted-foreground truncate max-w-[140px]">{w.bankAccountName || ''}</div>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <Badge variant="outline" className="text-[10px] bg-purple-50 text-purple-700">
                                <QrCode className="h-3 w-3 mr-1" /> UPI ID
                              </Badge>
                              <div className="font-mono text-xs font-semibold select-all">{w.upiId || '-'}</div>
                            </div>
                          )}
                        </TableCell>

                        {/* Amount */}
                        <TableCell>
                          <div className="text-base font-bold text-emerald-700">
                            ₹{w.moneyAmount.toLocaleString()}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {w.coinsAmount.toLocaleString()} coins
                          </div>
                        </TableCell>

                        {/* Balance at Request vs Current */}
                        <TableCell>
                          <div className="text-xs font-medium">
                            ₹{(w.balanceAtRequest ?? w.moneyAmount).toFixed(2)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            Current: ₹{w.reporter.currentBalance.toFixed(2)}
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          {getStatusBadge(w.status)}
                        </TableCell>

                        {/* Dates */}
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{new Date(w.createdAt).toLocaleDateString()}</div>
                          <div className="text-[11px]">{new Date(w.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                        </TableCell>

                        {/* Transaction Reference / Rejection Reason */}
                        <TableCell className="text-xs max-w-[160px]">
                          {w.status === 'completed' ? (
                            <div className="font-mono text-[11px] bg-emerald-50 text-emerald-900 px-2 py-1 rounded border border-emerald-200 break-all select-all">
                              UTR: {w.transactionReference || 'N/A'}
                            </div>
                          ) : w.status === 'rejected' ? (
                            <div className="text-rose-700 text-[11px] italic line-clamp-2">
                              {w.rejectionReason || 'Declined'}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {w.status === 'pending' && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                                onClick={() => handleApproveQuick(w)}
                              >
                                Approve
                              </Button>
                            )}

                            {(w.status === 'pending' || w.status === 'approved' || w.status === 'processing') && (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                onClick={() => openPayDialog(w)}
                              >
                                Mark Paid
                              </Button>
                            )}

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Payout Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => openDetailDialog(w)}>
                                  <Eye className="mr-2 h-4 w-4" /> View Full History
                                </DropdownMenuItem>
                                {w.status !== 'completed' && w.status !== 'rejected' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-rose-600 font-medium" onClick={() => openRejectDialog(w)}>
                                      <XCircle className="mr-2 h-4 w-4" /> Reject & Refund
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between p-4 border-t text-sm text-muted-foreground">
            <div>
              Showing {withdrawals.length} of {pagination.total} total payout requests
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || loading}
                onClick={() => fetchWithdrawals(pagination.page - 1)}
              >
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <span className="text-xs font-semibold px-2">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || loading}
                onClick={() => fetchWithdrawals(pagination.page + 1)}
              >
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MARK PAID MODAL DIALOG */}
      <Dialog open={isPayOpen} onOpenChange={setIsPayOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Complete Payout & Enter UTR Reference
            </DialogTitle>
            <DialogDescription>
              Confirm transfer of ₹{activeItem?.moneyAmount.toLocaleString()} to {activeItem?.reporter.name}.
            </DialogDescription>
          </DialogHeader>

          {activeItem && (
            <div className="space-y-4 pt-2">
              <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1.5 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payout Method:</span>
                  <span className="font-semibold uppercase">{activeItem.payoutMethod.replace('_', ' ')}</span>
                </div>
                {activeItem.payoutMethod === 'upi' ? (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">UPI ID:</span>
                    <span className="font-mono font-bold select-all">{activeItem.upiId}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-mono font-bold select-all">{activeItem.bankAccountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">IFSC Code:</span>
                      <span className="font-mono font-bold">{activeItem.bankIfsc}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Holder:</span>
                      <span className="font-semibold">{activeItem.bankAccountName}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bank UTR / Transaction Reference ID *</Label>
                <Input
                  placeholder="e.g. 412356789012 or IMPS/UPI reference"
                  value={utrReference}
                  onChange={e => setUtrReference(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  Mandatory proof of transaction shown to the reporter in their withdrawal history.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Admin Notes (Optional)</Label>
                <Textarea
                  placeholder="Additional notes for your audit records..."
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  rows={2}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsPayOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={handleMarkPaid}
              disabled={submitting}
            >
              {submitting ? 'Processing...' : 'Confirm Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REJECT MODAL DIALOG */}
      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-800">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              Reject Withdrawal & Refund Balance
            </DialogTitle>
            <DialogDescription>
              Declining this request will atomically restore ₹{activeItem?.moneyAmount.toLocaleString()} to {activeItem?.reporter.name}&apos;s wallet balance.
            </DialogDescription>
          </DialogHeader>

          {activeItem && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-rose-900">Reason for Rejection *</Label>
                <Textarea
                  placeholder="e.g. Invalid bank account number, incorrect IFSC, or UPI ID inactive. Please update your details."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  rows={3}
                  className="text-sm border-rose-200"
                />
                <p className="text-[11px] text-muted-foreground">
                  This explanation is visible to the reporter on their mobile wallet screen.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Internal Audit Notes</Label>
                <Input
                  placeholder="Optional note for admin team"
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsRejectOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={submitting}
            >
              {submitting ? 'Refunding...' : 'Confirm Rejection & Refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BULK MARK PAID MODAL DIALOG */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-800">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              Bulk Mark {selectedIds.length} Requests as Paid
            </DialogTitle>
            <DialogDescription>
              Generate batch UTR sequence references for the selected payouts.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Batch UTR Prefix</Label>
              <Input
                placeholder="e.g. BATCH-NEFT-OCT31"
                value={batchUtrPrefix}
                onChange={e => setBatchUtrPrefix(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-[11px] text-muted-foreground">
                Each payout will be marked with reference: [Prefix]-1, [Prefix]-2, etc.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsBulkOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              onClick={() => handleBulkAction('bulk_mark_paid')}
              disabled={submitting}
            >
              {submitting ? 'Processing Batch...' : 'Process All Selected'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* REPORTER DETAIL & PRIOR HISTORY MODAL */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-red-600" />
              Reporter Payout Audit & Earning History
            </DialogTitle>
            <DialogDescription>
              Complete financial audit trail for {activeItem?.reporter.name}.
            </DialogDescription>
          </DialogHeader>

          {activeItem && detailData && (
            <div className="space-y-6 pt-2">
              {/* Reporter Profile Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-muted/40 rounded-xl border">
                <div>
                  <div className="text-xs text-muted-foreground">Current Balance</div>
                  <div className="text-lg font-bold text-emerald-700 mt-0.5">
                    ₹{detailData.withdrawal.reporter.earningsBalance.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Lifetime Earned</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">
                    ₹{detailData.withdrawal.reporter.totalEarnings.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Approved News</div>
                  <div className="text-lg font-bold text-blue-600 mt-0.5">
                    {detailData.withdrawal.reporter.approvedArticles}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Career Level</div>
                  <Badge variant="outline" className="mt-1 font-semibold uppercase text-xs">
                    {detailData.withdrawal.reporter.role}
                  </Badge>
                </div>
              </div>

              {/* Prior Withdrawals */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Previous Withdrawal Requests</h4>
                {detailData.priorWithdrawals.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No prior withdrawals recorded.</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>Date</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Reference / Reason</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailData.priorWithdrawals.map((pw: any) => (
                          <TableRow key={pw.id} className="text-xs">
                            <TableCell>{new Date(pw.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="font-semibold">₹{pw.moneyAmount.toFixed(2)}</TableCell>
                            <TableCell className="uppercase">{pw.payoutMethod}</TableCell>
                            <TableCell>{getStatusBadge(pw.status)}</TableCell>
                            <TableCell className="font-mono text-[11px] truncate max-w-[160px]">
                              {pw.transactionReference || pw.rejectionReason || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Recent Earning Transactions */}
              <div>
                <h4 className="text-sm font-semibold mb-2">Recent Double-Entry Ledger Transactions</h4>
                {detailData.recentTransactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No ledger transactions found.</p>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Debit / Credit</TableHead>
                          <TableHead>Balance After</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detailData.recentTransactions.map((tx: any) => (
                          <TableRow key={tx.id} className="text-xs">
                            <TableCell>{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] uppercase font-mono">
                                {tx.txCategory}
                              </Badge>
                            </TableCell>
                            <TableCell className="truncate max-w-[180px]">{tx.description}</TableCell>
                            <TableCell className={tx.type === 'CREDIT' ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                              {tx.type === 'CREDIT' ? '+' : '-'}₹{(tx.moneyAmount || tx.amount / 100).toFixed(2)}
                            </TableCell>
                            <TableCell className="font-mono font-medium">₹{tx.balanceAfter.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
              Close Audit View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
