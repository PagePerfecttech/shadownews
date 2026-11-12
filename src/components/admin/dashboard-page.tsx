'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/lib/store'
import { authFetchJson } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  Newspaper,
  Users,
  Eye,
  Clock,
  UserCheck,
  Send,
  Plus,
  Bell,
  Banknote,
  Megaphone,
  Award,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  MapPin,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Rss,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DashboardData {
  kpis: {
    totalNews: number
    publishedToday: number
    pendingReviews: number
    totalViews: number
    activeUsers: number
    dau: number
    mau: number
    activeReporters: number
    pendingReporters: number
    pendingWithdrawalsCount: number
    pendingWithdrawalsAmount: number
    activeAdsCount: number
    totalAdImpressions: number
    totalAdClicks: number
  }
  attentionQueue: {
    pendingNews: Array<{
      id: string
      title: string
      thumbnailUrl: string
      createdAt: string
      category: { name: string } | null
      reporter: { name: string; role: string } | null
    }>
    pendingWithdrawals: Array<{
      id: string
      moneyAmount: number
      payoutMethod: string
      upiId: string | null
      createdAt: string
      reporter: { name: string; phone: string } | null
    }>
  }
  weeklyData: { date: string; count: number }[]
  newsByCategory: { categoryId: string; categoryName: string; count: number }[]
  topReporters: Array<{
    id: string
    name: string
    role: string
    avatar: string | null
    approvedArticles: number
    performanceScore: number
    earningsBalance: number
  }>
  topLocations: Array<{ name: string; count: number }>
  recentActivity: Array<{
    id: string
    action: string
    entity: string
    createdAt: string
    admin: { name: string } | null
  }>
}

const COLORS = [
  '#DC2626',
  '#7C3AED',
  '#059669',
  '#D97706',
  '#2563EB',
  '#0891B2',
  '#4F46E5',
  '#16A34A',
]

export default function DashboardPage() {
  const { setActiveView, currentUser } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchDashboard = async () => {
    try {
      setLoading(true)
      const d = await authFetchJson<DashboardData>('/api/admin/dashboard')
      setData(d)
    } catch (error: any) {
      if (error?.message !== 'Unauthorized') {
        toast.error('Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </div>
    )
  }

  const kpis = data?.kpis

  return (
    <div className="space-y-6">
      {/* 1. Welcome & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border shadow-sm">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Welcome back, {currentUser?.name || 'Editor'}! 👋
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Shadow News · Executive Operations Command Center
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboard}
            disabled={loading}
            className="text-xs font-semibold gap-1.5 h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setActiveView('feed-import')}
            className="border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold gap-1.5 h-8"
          >
            <Rss className="h-3.5 w-3.5" />
            Feed Import & AI
          </Button>

          <Button
            size="sm"
            onClick={() => setActiveView('news')}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold gap-1.5 h-8"
          >
            <Plus className="h-3.5 w-3.5" />
            Post News
          </Button>
        </div>
      </div>

      {/* 2. Primary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Published Today */}
        <Card className="border bg-white shadow-sm hover:border-red-200 transition-all">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Today's News</span>
              <Newspaper className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-600 mt-2">
              {kpis?.publishedToday ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {kpis?.totalNews ?? 0} total articles
            </div>
          </CardContent>
        </Card>

        {/* Pending Review Queue */}
        <Card
          onClick={() => setActiveView('news')}
          className="border bg-white shadow-sm hover:border-amber-300 hover:shadow-md cursor-pointer transition-all"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Pending News</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-600 mt-2">
              {kpis?.pendingReviews ?? 0}
            </div>
            <div className="text-[11px] text-amber-600 font-semibold mt-1 flex items-center gap-1">
              Needs Review <ArrowRight className="h-3 w-3" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Withdrawals Queue */}
        <Card
          onClick={() => setActiveView('withdrawals')}
          className="border bg-white shadow-sm hover:border-purple-300 hover:shadow-md cursor-pointer transition-all"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Withdrawals</span>
              <Banknote className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-600 mt-2">
              ₹{kpis?.pendingWithdrawalsAmount ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {kpis?.pendingWithdrawalsCount ?? 0} requests pending
            </div>
          </CardContent>
        </Card>

        {/* Readers DAU / Total */}
        <Card
          onClick={() => setActiveView('users')}
          className="border bg-white shadow-sm hover:border-blue-300 hover:shadow-md cursor-pointer transition-all"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Active Readers</span>
              <Users className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-600 mt-2">
              {kpis?.dau ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              DAU · {kpis?.activeUsers ?? 0} total users
            </div>
          </CardContent>
        </Card>

        {/* Active Reporters */}
        <Card
          onClick={() => setActiveView('reporters')}
          className="border bg-white shadow-sm hover:border-emerald-300 hover:shadow-md cursor-pointer transition-all"
        >
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Reporters</span>
              <Award className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 mt-2">
              {kpis?.activeReporters ?? 0}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {kpis?.pendingReporters ?? 0} pending signup
            </div>
          </CardContent>
        </Card>

        {/* Total Views */}
        <Card className="border bg-white shadow-sm">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Total Views</span>
              <Eye className="h-4 w-4 text-slate-600" />
            </div>
            <div className="text-2xl font-bold text-slate-800 mt-2">
              {(kpis?.totalViews ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {kpis?.totalAdImpressions ? `${kpis.totalAdImpressions} ad views` : 'Audience reach'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Needs Attention Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pending News Submissions */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                <Clock className="h-4 w-4 text-amber-500" />
                Pending News Approvals Queue ({data?.attentionQueue.pendingNews.length || 0})
              </CardTitle>
              <CardDescription className="text-xs">
                Articles submitted by reporters awaiting editorial review
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView('news')}
              className="text-xs text-red-600 hover:text-red-700 h-7 px-2 font-semibold"
            >
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {data?.attentionQueue.pendingNews.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                Editorial queue is clean! No news pending review.
              </div>
            ) : (
              data?.attentionQueue.pendingNews.map((n) => (
                <div
                  key={n.id}
                  onClick={() => setActiveView('news')}
                  className="p-2.5 rounded-lg border bg-slate-50/50 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between transition-colors text-xs"
                >
                  <div className="min-w-0 pr-3">
                    <div className="font-semibold text-slate-800 truncate">{n.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="text-purple-700 font-medium">
                        By {n.reporter?.name || 'Reporter'} ({n.reporter?.role || 'junior'})
                      </span>
                      · <span>{n.category?.name || 'News'}</span>
                      · <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shrink-0 text-[10px]">
                    Review
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Withdrawals Queue */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                <Banknote className="h-4 w-4 text-purple-600" />
                Pending Payout Requests ({data?.attentionQueue.pendingWithdrawals.length || 0})
              </CardTitle>
              <CardDescription className="text-xs">
                Reporter earnings withdrawal requests requiring approval
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView('withdrawals')}
              className="text-xs text-purple-600 hover:text-purple-700 h-7 px-2 font-semibold"
            >
              View All <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {data?.attentionQueue.pendingWithdrawals.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground flex flex-col items-center gap-1">
                <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                All reporter withdrawal requests have been settled!
              </div>
            ) : (
              data?.attentionQueue.pendingWithdrawals.map((w) => (
                <div
                  key={w.id}
                  onClick={() => setActiveView('withdrawals')}
                  className="p-2.5 rounded-lg border bg-slate-50/50 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between transition-colors text-xs"
                >
                  <div className="min-w-0 pr-3">
                    <div className="font-semibold text-slate-800">
                      {w.reporter?.name || 'Reporter'} ({w.reporter?.phone || ''})
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Method: <strong className="uppercase">{w.payoutMethod}</strong> {w.upiId ? `(${w.upiId})` : ''} · {new Date(w.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold text-sm text-purple-700">₹{w.moneyAmount}</div>
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px]">
                      Pending Pay
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* 4. Analytics Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weekly Publishing Trend */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-600" />
              7-Day Publishing Velocity
            </CardTitle>
            <CardDescription className="text-xs">
              Daily news articles published across Andhra Pradesh & Telangana
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.weeklyData || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d) => d.slice(5)}
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
                    labelFormatter={(d) => `Date: ${d}`}
                  />
                  <Bar dataKey="count" fill="#DC2626" radius={[4, 4, 0, 0]} name="Published" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-blue-600" />
              Category Coverage Distribution
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of news articles by reporting category
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-60 w-full flex items-center">
              <ResponsiveContainer width="60%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.newsByCategory || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="categoryName"
                  >
                    {(data?.newsByCategory || []).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>

              <div className="w-[40%] space-y-1.5 overflow-y-auto max-h-52 pr-2 text-xs">
                {(data?.newsByCategory || []).map((cat, idx) => (
                  <div key={cat.categoryId} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                      <span className="truncate">{cat.categoryName}</span>
                    </div>
                    <span className="font-semibold text-slate-700 ml-1">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 5. Top Reporters Leaderboard & Top Locations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Reporters Leaderboard */}
        <Card className="border shadow-sm bg-white lg:col-span-2">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
                <Award className="h-4 w-4 text-emerald-600" />
                Top Performing Reporters Leaderboard
              </CardTitle>
              <CardDescription className="text-xs">
                Highest ranked journalists by approved stories and editorial quality
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView('reporters')}
              className="text-xs text-emerald-700 hover:text-emerald-800 h-7 px-2 font-semibold"
            >
              All Reporters <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {data?.topReporters?.map((r, i) => (
              <div
                key={r.id}
                onClick={() => setActiveView('reporters')}
                className="p-2.5 rounded-lg border bg-slate-50/50 hover:bg-slate-100/70 cursor-pointer flex items-center justify-between text-xs transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="w-5 text-center font-bold text-slate-500">#{i + 1}</span>
                  <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                    {r.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground capitalize">
                      {r.role} tier · Wallet: ₹{r.earningsBalance}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-slate-800">{r.approvedArticles} published</div>
                  <div className="text-[11px] text-emerald-600 font-medium">
                    Score: {r.performanceScore} pts
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Locations Card */}
        <Card className="border shadow-sm bg-white">
          <CardHeader className="p-4 pb-2 border-b">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-800">
              <MapPin className="h-4 w-4 text-red-600" />
              Top News Locations
            </CardTitle>
            <CardDescription className="text-xs">
              Districts with highest reporting density
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {data?.topLocations?.map((loc, i) => (
              <div key={loc.name} className="flex items-center justify-between text-xs py-1 border-b last:border-b-0">
                <span className="font-medium text-slate-700 flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground w-4">#{i + 1}</span>
                  {loc.name}
                </span>
                <Badge variant="outline" className="text-xs font-semibold">
                  {loc.count} stories
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
