'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  Users,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  Download,
  Activity,
  UserCheck,
  Clock,
  Smartphone,
  Bell,
  BellOff,
  Filter,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { authFetch, authFetchJson } from '@/lib/utils'
import { UserDetailModal } from './user-detail-modal'

interface UserItem {
  id: string
  phone: string
  name: string | null
  email: string | null
  avatar: string | null
  stateId: string | null
  districtId: string | null
  mandalId: string | null
  preferredLanguage: string
  isActive: boolean
  isPremium: boolean
  notificationsEnabled: boolean
  appVersion: string | null
  devicePlatform: string | null
  lastActiveAt: string | null
  createdAt: string
  state: { id: string; name: string } | null
  district: { id: string; name: string } | null
  mandal: { id: string; name: string } | null
  _count?: {
    bookmarks: number
    comments: number
  }
}

interface State {
  id: string
  name: string
}

interface District {
  id: string
  name: string
  stateId: string
}

interface Mandal {
  id: string
  name: string
  districtId: string
}

interface UsersResponse {
  users: UserItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  blockedUsers: number
  newToday: number
  newThisWeek: number
  dau: number
  mau: number
  topDistricts: Array<{
    districtId: string | null
    name: string
    count: number
  }>
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  const [states, setStates] = useState<State[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [mandals, setMandals] = useState<Mandal[]>([])

  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all')
  const [activeFilter, setActiveFilter] = useState<'all' | 'today' | '7d' | '30d' | 'inactive'>('all')
  const [stateId, setStateId] = useState('')
  const [districtId, setDistrictId] = useState('')
  const [mandalId, setMandalId] = useState('')
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastActiveAt' | 'name'>('createdAt')
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  // Export state
  const [exporting, setExporting] = useState(false)

  // Detail Modal state
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const data = await authFetchJson<UserStats>('/api/admin/users/stats')
      setStats(data)
    } catch {
      // Non-critical, ignore
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
      })
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (activeFilter !== 'all') params.set('activeFilter', activeFilter)
      if (stateId) params.set('stateId', stateId)
      if (districtId) params.set('districtId', districtId)
      if (mandalId) params.set('mandalId', mandalId)

      const data = await authFetchJson<UsersResponse>(`/api/admin/users?${params.toString()}`)
      setUsers(data.users || [])
      setTotal(data.total || 0)
    } catch {
      toast.error('Failed to load app users')
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, statusFilter, activeFilter, stateId, districtId, mandalId, sortBy, sortOrder])

  useEffect(() => {
    fetchStats()
    authFetchJson<State[]>('/api/admin/states')
      .then(setStates)
      .catch(() => { })
    authFetchJson<District[]>('/api/admin/districts')
      .then(setDistricts)
      .catch(() => { })
    authFetchJson<Mandal[]>('/api/admin/mandals')
      .then(setMandals)
      .catch(() => { })
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleExportCSV = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams({
        export: 'csv',
        sortBy,
        sortOrder,
      })
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (activeFilter !== 'all') params.set('activeFilter', activeFilter)
      if (stateId) params.set('stateId', stateId)
      if (districtId) params.set('districtId', districtId)
      if (mandalId) params.set('mandalId', mandalId)

      const res = await authFetch(`/api/admin/users?${params.toString()}`)
      if (!res.ok) throw new Error('Export failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `app-users-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('App users exported to CSV successfully')
    } catch (e: any) {
      toast.error(e.message || 'CSV export failed')
    } finally {
      setExporting(false)
    }
  }

  const handleQuickToggleStatus = async (user: UserItem) => {
    try {
      const nextStatus = !user.isActive
      const res = await authFetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: nextStatus }),
      })
      if (!res.ok) throw new Error('Update failed')
      toast.success(nextStatus ? `Unblocked ${user.name || user.phone}` : `Blocked ${user.name || user.phone}`)
      setUsers(prev => prev.map(u => (u.id === user.id ? { ...u, isActive: nextStatus } : u)))
      fetchStats()
    } catch (e: any) {
      toast.error(e.message || 'Status update failed')
    }
  }

  const filteredDistricts = stateId
    ? districts.filter(d => d.stateId === stateId)
    : districts

  const filteredMandals = districtId
    ? mandals.filter(m => m.districtId === districtId)
    : mandals

  const totalPages = Math.ceil(total / limit) || 1

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-6 w-6 text-red-600" />
            App Users Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor active readers, engagement analytics, devices, and manage user moderation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchUsers()
              fetchStats()
            }}
            disabled={loading}
            className="text-xs font-semibold gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleExportCSV}
            disabled={exporting || loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* 2. KPI Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        <Card className="border bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Readers</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">
              {statsLoading ? <Skeleton className="h-7 w-16" /> : (stats?.totalUsers ?? total)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span className="text-emerald-600 font-semibold">{stats?.activeUsers ?? 0} active</span>
              · {stats?.blockedUsers ?? 0} blocked
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">DAU (24 Hours)</span>
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-2">
              {statsLoading ? <Skeleton className="h-7 w-16" /> : (stats?.dau ?? 0)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Active readers today
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">MAU (30 Days)</span>
              <UserCheck className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600 mt-2">
              {statsLoading ? <Skeleton className="h-7 w-16" /> : (stats?.mau ?? 0)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Monthly active readers
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">New Today</span>
              <Sparkles className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-2">
              {statsLoading ? <Skeleton className="h-7 w-16" /> : (stats?.newToday ?? 0)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              +{stats?.newThisWeek ?? 0} this week
            </div>
          </CardContent>
        </Card>

        <Card className="border bg-white shadow-sm col-span-2 lg:col-span-1">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Top District</span>
              <MapPin className="h-4 w-4 text-red-500" />
            </div>
            <div className="text-base font-bold text-slate-800 mt-2 truncate">
              {statsLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : stats?.topDistricts?.[0] ? (
                `${stats.topDistricts[0].name} (${stats.topDistricts[0].count})`
              ) : (
                'None'
              )}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 truncate">
              {stats?.topDistricts?.slice(1, 3).map(d => `${d.name}: ${d.count}`).join(' · ') || 'No location data'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Search & Filter Bar */}
      <Card className="border shadow-sm bg-white">
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Search */}
            <div className="md:col-span-4 relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone (+91...), or email..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-9 text-xs"
              />
            </div>

            {/* Status Filter */}
            <div className="md:col-span-2">
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value as any)
                  setPage(1)
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="all">Status: All</option>
                <option value="active">Active Readers</option>
                <option value="blocked">Blocked Users</option>
              </select>
            </div>

            {/* Activity Window Filter */}
            <div className="md:col-span-2">
              <select
                value={activeFilter}
                onChange={e => {
                  setActiveFilter(e.target.value as any)
                  setPage(1)
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="all">Activity: All</option>
                <option value="today">Active Today (DAU)</option>
                <option value="7d">Active in 7 Days</option>
                <option value="30d">Active in 30 Days (MAU)</option>
                <option value="inactive">Inactive (&gt;30 Days)</option>
              </select>
            </div>

            {/* State Filter */}
            <div className="md:col-span-2">
              <select
                value={stateId}
                onChange={e => {
                  setStateId(e.target.value)
                  setDistrictId('')
                  setMandalId('')
                  setPage(1)
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="">State: All</option>
                {states.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* District Filter */}
            <div className="md:col-span-2">
              <select
                value={districtId}
                onChange={e => {
                  setDistrictId(e.target.value)
                  setMandalId('')
                  setPage(1)
                }}
                disabled={filteredDistricts.length === 0}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-xs"
              >
                <option value="">District: All</option>
                {filteredDistricts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-muted-foreground pt-1 border-t">
            <div className="flex items-center gap-3">
              <span>Showing {users.length} of {total} registered readers</span>
              {(search || statusFilter !== 'all' || activeFilter !== 'all' || stateId || districtId) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                    setActiveFilter('all')
                    setStateId('')
                    setDistrictId('')
                    setMandalId('')
                    setPage(1)
                  }}
                  className="h-6 text-xs text-red-600 px-2"
                >
                  Clear Filters
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs">Sort:</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="h-7 px-2 rounded border border-input bg-background text-xs"
              >
                <option value="createdAt">Joined Date</option>
                <option value="lastActiveAt">Last Active</option>
                <option value="name">Name</option>
              </select>
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as any)}
                className="h-7 px-2 rounded border border-input bg-background text-xs"
              >
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Users Table */}
      <Card className="border shadow-sm overflow-hidden bg-white">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow>
                <TableHead className="w-[240px]">Reader</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Device / Version</TableHead>
                <TableHead>Notifications</TableHead>
                <TableHead>Activity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-10 w-44" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-muted-foreground text-sm">
                    No registered app users match your search and filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                users.map(u => (
                  <TableRow key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* User info */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9 border shrink-0">
                          <AvatarImage src={u.avatar || undefined} />
                          <AvatarFallback className="bg-slate-100 text-slate-700 font-semibold text-xs">
                            {u.name ? u.name.slice(0, 2).toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-slate-900 truncate">
                            {u.name || 'Unnamed Reader'}
                          </div>
                          <div className="text-[11px] font-mono text-muted-foreground truncate">
                            {u.phone}
                          </div>
                          {u.email && (
                            <div className="text-[10px] text-muted-foreground truncate">
                              {u.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Location */}
                    <TableCell className="text-xs">
                      {u.district?.name ? (
                        <div>
                          <div className="font-medium text-slate-800">{u.district.name}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {u.mandal?.name ? `${u.mandal.name}, ` : ''}{u.state?.name || ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">Not set</span>
                      )}
                    </TableCell>

                    {/* Preferred Language */}
                    <TableCell>
                      <Badge variant="outline" className="text-[11px] uppercase tracking-wide">
                        {u.preferredLanguage || 'te'}
                      </Badge>
                    </TableCell>

                    {/* Device & Platform */}
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <Smartphone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="capitalize font-medium text-slate-700">
                          {u.devicePlatform || 'Mobile'}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-muted-foreground mt-0.5">
                        {u.appVersion || 'v1.0.0'}
                      </div>
                    </TableCell>

                    {/* Notifications */}
                    <TableCell>
                      {u.notificationsEnabled ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Bell className="h-3 w-3" /> Enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <BellOff className="h-3 w-3" /> Off
                        </span>
                      )}
                    </TableCell>

                    {/* Activity */}
                    <TableCell className="text-xs">
                      <div className="font-medium text-slate-800 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {u.lastActiveAt
                          ? new Date(u.lastActiveAt).toLocaleDateString()
                          : 'Never'}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Joined: {new Date(u.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      {u.isActive ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[11px]">
                          Blocked
                        </Badge>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUserId(u.id)
                            setModalOpen(true)
                          }}
                          className="h-8 px-2 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View
                        </Button>

                        <Switch
                          checked={u.isActive}
                          onCheckedChange={() => handleQuickToggleStatus(u)}
                          title={u.isActive ? 'Click to Block reader' : 'Click to Unblock reader'}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* 5. Pagination Bar */}
        <div className="p-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs bg-slate-50/50">
          <div className="text-muted-foreground">
            Page <strong className="text-slate-800">{page}</strong> of <strong className="text-slate-800">{totalPages}</strong> ({total} total readers)
          </div>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={e => {
                setLimit(parseInt(e.target.value, 10))
                setPage(1)
              }}
              className="h-8 px-2 rounded border border-input bg-background text-xs"
            >
              <option value="10">10 / page</option>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </select>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="h-8 px-2 text-xs"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Prev
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || loading}
              className="h-8 px-2 text-xs"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* User Detail & Moderation Modal */}
      <UserDetailModal
        userId={selectedUserId}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUserUpdated={() => {
          fetchUsers()
          fetchStats()
        }}
      />
    </div>
  )
}
