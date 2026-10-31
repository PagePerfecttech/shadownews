'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Eye,
  Download,
  Filter,
  CheckCircle,
  XCircle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react'
import { authFetch, authFetchJSON, authFetchJson } from '@/lib/utils'
import { useAppStore } from '@/lib/store'
import { ReporterDetailModal } from './reporter-detail-modal'

interface ReporterListItem {
  id: string
  name: string
  phone: string
  email: string | null
  avatar: string | null
  idProofUrl?: string | null
  bio: string | null
  stateId: string
  districtId: string
  mandalId: string | null
  beat: string | null
  status: string
  role: string
  postingScope: string
  allowedDistrictIds?: string
  allowedMandalIds?: string
  canPublishDirectly: boolean
  earningsBalance: number
  totalEarnings: number
  coinsBalance: number
  totalNews: number
  approvedArticles: number
  pendingArticles: number
  rejectedArticles: number
  createdAt: string
  state?: { id: string; name: string }
  district?: { id: string; name: string }
  mandal?: { id: string; name: string }
}

interface State { id: string; name: string; code: string }
interface District { id: string; name: string; stateId: string }
interface Mandal { id: string; name: string; districtId: string }

const statusColors: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-300',
  active: 'bg-green-100 text-green-800 border-green-300',
  suspended: 'bg-red-100 text-red-800 border-red-300',
  rejected: 'bg-gray-100 text-gray-800 border-gray-300',
}

export default function ReportersPage() {
  const { selectedReporterId, setSelectedReporterId } = useAppStore()

  const [reporters, setReporters] = useState<ReporterListItem[]>([])
  const [states, setStates] = useState<State[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [mandals, setMandals] = useState<Mandal[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterRole, setFilterRole] = useState('all')
  const [filterDistrict, setFilterDistrict] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Detailed view modal state
  const [detailReporterId, setDetailReporterId] = useState<string | null>(null)

  // Create / Edit Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ReporterListItem | null>(null)
  const [form, setForm] = useState<Record<string, unknown>>({
    name: '', phone: '', email: '', avatar: '', idProofUrl: '', bio: '',
    stateId: '', districtId: '', mandalId: '', beat: '', status: 'pending', canPublishDirectly: false,
    role: 'junior', postingScope: 'mandal',
  })

  // Watch for external selectedReporterId from store (e.g. from News table)
  useEffect(() => {
    if (selectedReporterId) {
      setDetailReporterId(selectedReporterId)
    }
  }, [selectedReporterId])

  const fetchReporters = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(page),
        limit: '25',
      })
      if (search.trim()) params.set('search', search.trim())
      if (filterStatus !== 'all') params.set('status', filterStatus)
      if (filterRole !== 'all') params.set('role', filterRole)
      if (filterDistrict !== 'all') params.set('districtId', filterDistrict)

      const res = await authFetchJson<{
        reporters: ReporterListItem[]
        total: number
        totalPages: number
      }>(`/api/admin/reporters?${params}`)

      setReporters(res.reporters || [])
      setTotalPages(res.totalPages || 1)
      setTotalCount(res.total || 0)
    } catch {
      toast.error('Failed to load reporters')
    } finally {
      setLoading(false)
    }
  }, [page, search, filterStatus, filterRole, filterDistrict])

  useEffect(() => {
    fetchReporters()
  }, [fetchReporters])

  useEffect(() => {
    authFetchJson<State[]>('/api/admin/states').then(setStates).catch(() => { })
    authFetchJson<District[]>('/api/admin/districts').then(setDistricts).catch(() => { })
    authFetchJson<Mandal[]>('/api/admin/mandals').then(setMandals).catch(() => { })
  }, [])

  const handleExportCsv = () => {
    const params = new URLSearchParams({ export: 'csv' })
    if (search.trim()) params.set('search', search.trim())
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterRole !== 'all') params.set('role', filterRole)
    if (filterDistrict !== 'all') params.set('districtId', filterDistrict)

    window.open(`/api/admin/reporters?${params.toString()}`, '_blank')
  }

  const handleSave = async () => {
    try {
      if (editItem) {
        await authFetchJSON(`/api/admin/reporters/${editItem.id}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        })
        toast.success('Reporter updated successfully')
      } else {
        await authFetchJSON('/api/admin/reporters', {
          method: 'POST',
          body: JSON.stringify(form),
        })
        toast.success('Reporter created successfully')
      }
      setDialogOpen(false)
      setEditItem(null)
      fetchReporters()
    } catch {
      toast.error('Failed to save reporter')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reporter?')) return
    try {
      await authFetch(`/api/admin/reporters/${id}`, { method: 'DELETE' })
      toast.success('Reporter deleted')
      fetchReporters()
    } catch {
      toast.error('Failed to delete')
    }
  }

  const openEdit = (item: ReporterListItem) => {
    setEditItem(item)
    setForm({
      name: item.name,
      phone: item.phone,
      email: item.email || '',
      avatar: item.avatar || '',
      idProofUrl: item.idProofUrl || '',
      bio: item.bio || '',
      stateId: item.stateId,
      districtId: item.districtId,
      mandalId: item.mandalId || '',
      beat: item.beat || '',
      status: item.status,
      canPublishDirectly: item.canPublishDirectly,
      role: item.role || 'junior',
      postingScope: item.postingScope || 'mandal',
    })
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4">
      {/* Page Title & Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reporters Management</h1>
          <p className="text-sm text-muted-foreground">
            Manage reporters, postings scopes, verification badges, and earnings balances ({totalCount} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCsv} className="h-9">
            <Download className="h-4 w-4 mr-2" /> Export CSV
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700 h-9"
            onClick={() => {
              setEditItem(null)
              setForm({
                name: '', phone: '', email: '', avatar: '', idProofUrl: '', bio: '',
                stateId: '', districtId: '', mandalId: '', beat: '', status: 'pending',
                canPublishDirectly: false, role: 'junior', postingScope: 'mandal',
              })
              setDialogOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Add Reporter
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            {/* Search */}
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, email, or beat..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9 text-sm"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                className="w-full border rounded-md p-2 text-sm bg-background"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="suspended">Suspended</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* Role Filter */}
            <div>
              <select
                className="w-full border rounded-md p-2 text-sm bg-background"
                value={filterRole}
                onChange={(e) => {
                  setFilterRole(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All Career Levels</option>
                <option value="trainee">Trainee Reporter</option>
                <option value="junior">Junior Reporter</option>
                <option value="senior">Senior Reporter</option>
                <option value="mandal_head">Mandal Head</option>
                <option value="district_head">District Head</option>
                <option value="state_head">State Head</option>
              </select>
            </div>

            {/* District Filter */}
            <div>
              <select
                className="w-full border rounded-md p-2 text-sm bg-background"
                value={filterDistrict}
                onChange={(e) => {
                  setFilterDistrict(e.target.value)
                  setPage(1)
                }}
              >
                <option value="all">All Districts</option>
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reporters Table */}
      <Card className="border shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Reporter</TableHead>
                    <TableHead>Home Location</TableHead>
                    <TableHead>Level / Role</TableHead>
                    <TableHead>Posting Scope</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Articles (Appr / Pend / Rej)</TableHead>
                    <TableHead>Wallet (₹)</TableHead>
                    <TableHead>Total Earned (₹)</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reporters.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-10 text-muted-foreground text-sm">
                        No reporters found matching criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reporters.map((r) => (
                      <TableRow key={r.id} className="hover:bg-slate-50/70">
                        {/* Reporter Name & Avatar */}
                        <TableCell>
                          <div
                            className="flex items-center gap-2 cursor-pointer group"
                            onClick={() => setDetailReporterId(r.id)}
                          >
                            {r.avatar ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={r.avatar}
                                alt={r.name}
                                className="w-9 h-9 rounded-full object-cover border"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-red-100 text-red-600 font-bold text-xs flex items-center justify-center uppercase">
                                {r.name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-sm group-hover:text-red-600 transition-colors">
                                {r.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{r.phone}</p>
                            </div>
                          </div>
                        </TableCell>

                        {/* Location */}
                        <TableCell className="text-xs">
                          {r.mandal?.name ? `${r.mandal.name}, ` : ''}
                          <span className="font-medium text-slate-800">{r.district?.name || '-'}</span>
                          <span className="block text-slate-400 text-[10px]">{r.state?.name || '-'}</span>
                        </TableCell>

                        {/* Level */}
                        <TableCell>
                          <Badge className="bg-slate-100 text-slate-800 font-medium capitalize text-xs border">
                            {r.role ? r.role.replace('_', ' ') : 'Junior'}
                          </Badge>
                        </TableCell>

                        {/* Scope */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              r.postingScope === 'state'
                                ? 'bg-purple-50 text-purple-700 border-purple-300 text-xs'
                                : r.postingScope === 'district'
                                  ? 'bg-blue-50 text-blue-700 border-blue-300 text-xs'
                                  : 'bg-gray-50 text-gray-700 border-gray-300 text-xs'
                            }
                          >
                            {r.postingScope || 'mandal'}
                          </Badge>
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${statusColors[r.status] || ''}`}>
                            {r.status}
                          </Badge>
                        </TableCell>

                        {/* Articles Count */}
                        <TableCell className="text-center text-xs">
                          <span className="font-bold text-slate-900">{r.totalNews || 0}</span>
                          <span className="text-muted-foreground block text-[11px]">
                            <span className="text-green-600 font-semibold">{r.approvedArticles || 0}</span> /{' '}
                            <span className="text-amber-600 font-semibold">{r.pendingArticles || 0}</span> /{' '}
                            <span className="text-red-600 font-semibold">{r.rejectedArticles || 0}</span>
                          </span>
                        </TableCell>

                        {/* Wallet Balance */}
                        <TableCell className="font-bold text-xs text-green-700">
                          ₹{(r.earningsBalance || 0).toFixed(2)}
                        </TableCell>

                        {/* Total Earned */}
                        <TableCell className="font-semibold text-xs text-slate-700">
                          ₹{(r.totalEarnings || 0).toFixed(2)}
                        </TableCell>

                        {/* Joined Date */}
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="View Reporter Full Details & Published News"
                              onClick={() => setDetailReporterId(r.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-slate-600 hover:text-slate-800"
                              onClick={() => openEdit(r)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(r.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({totalCount} total reporters)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Full Tabbed Reporter Detail Modal */}
      <ReporterDetailModal
        reporterId={detailReporterId}
        open={!!detailReporterId}
        onClose={() => {
          setDetailReporterId(null)
          setSelectedReporterId(null)
        }}
        onUpdated={fetchReporters}
      />

      {/* Create / Edit Reporter Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Reporter Details' : 'Register New Reporter'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 my-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input
                  value={form.name as string}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Ramesh Kumar"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number *</Label>
                <Input
                  value={form.phone as string}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="10-digit mobile number"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email as string}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="reporter@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Avatar Photo URL</Label>
                <Input
                  value={form.avatar as string}
                  onChange={(e) => setForm((p) => ({ ...p, avatar: e.target.value }))}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>ID Proof Document URL</Label>
              <Input
                value={form.idProofUrl as string}
                onChange={(e) => setForm((p) => ({ ...p, idProofUrl: e.target.value }))}
                placeholder="https://... uploaded press card or ID photo"
              />
            </div>

            <div className="space-y-2">
              <Label>Bio / Summary</Label>
              <Textarea
                value={form.bio as string}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                rows={2}
                placeholder="Short reporter bio..."
              />
            </div>

            {/* Cascading State > District > Mandal Selectors */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Home State *</Label>
                <select
                  className="w-full border rounded-md p-2 text-xs bg-background"
                  value={form.stateId as string}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, stateId: e.target.value, districtId: '', mandalId: '' }))
                  }
                >
                  <option value="">Select state</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Home District *</Label>
                <select
                  className="w-full border rounded-md p-2 text-xs bg-background"
                  value={form.districtId as string}
                  onChange={(e) => setForm((p) => ({ ...p, districtId: e.target.value, mandalId: '' }))}
                >
                  <option value="">Select district</option>
                  {(form.stateId ? districts.filter((d) => d.stateId === form.stateId) : districts).map(
                    (d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Home Mandal</Label>
                <select
                  className="w-full border rounded-md p-2 text-xs bg-background"
                  value={form.mandalId as string}
                  onChange={(e) => setForm((p) => ({ ...p, mandalId: e.target.value }))}
                >
                  <option value="">Select mandal</option>
                  {(form.districtId ? mandals.filter((m) => m.districtId === form.districtId) : mandals).map(
                    (m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Beat / Specialty</Label>
                <Input
                  value={form.beat as string}
                  onChange={(e) => setForm((p) => ({ ...p, beat: e.target.value }))}
                  placeholder="Politics, Crime, Agriculture..."
                />
              </div>

              <div className="space-y-2">
                <Label>Posting Scope Permission</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-background"
                  value={(form.postingScope as string) || 'mandal'}
                  onChange={(e) => setForm((p) => ({ ...p, postingScope: e.target.value }))}
                >
                  <option value="mandal">Mandal-Level (Own mandal only)</option>
                  <option value="district">District-Level (Any mandal in home district)</option>
                  <option value="state">State-Level (Any district/mandal state-wide)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="space-y-2">
                <Label>Level / Career Rank</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-background"
                  value={(form.role as string) || 'junior'}
                  onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}
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
                <Label>Account Status</Label>
                <select
                  className="w-full border rounded-md p-2 text-sm bg-background"
                  value={(form.status as string) || 'pending'}
                  onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                >
                  <option value="pending">Pending</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={form.canPublishDirectly as boolean}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, canPublishDirectly: v }))}
                />
                <Label className="text-xs">Direct Publish</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSave}>
              {editItem ? 'Save Changes' : 'Create Reporter'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
