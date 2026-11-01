'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useAppStore, type ViewType } from '@/lib/store'
import LoginPage from '@/components/admin/login-page'
import AdminLayout from '@/components/admin/admin-layout'
import DashboardPage from '@/components/admin/dashboard-page'
import NewsPage from '@/components/admin/news-page'
import VideosPage from '@/components/admin/videos-page'
import LocationsPage from '@/components/admin/locations-page'
import CategoriesPage from '@/components/admin/categories-page'
import TagsPage from '@/components/admin/tags-page'
import AdsPage from '@/components/admin/ads-page'
import ReportersPage from '@/components/admin/reporters-page'
import UsersPage from '@/components/admin/users-page'
import AdminsPage from '@/components/admin/admins-page'
import NotificationsPage from '@/components/admin/notifications-page'
import SettingsPage from '@/components/admin/settings-page'
import MediaPage from '@/components/admin/media-page'
import AuditLogsPage from '@/components/admin/audit-logs-page'
import WithdrawalsPage from '@/components/admin/withdrawals-page'
import ReporterPerformancePage from '@/components/admin/reporter-performance-page'
import RewardsRulesPage from '@/components/admin/rewards-rules-page'
import ReportsPage from '@/components/admin/reports-page'

const moduleComponents: Record<ViewType, React.ComponentType> = {
  dashboard: DashboardPage,
  news: NewsPage,
  reports: ReportsPage,
  videos: VideosPage,
  locations: LocationsPage,
  categories: CategoriesPage,
  tags: TagsPage,
  ads: AdsPage,
  reporters: ReportersPage,
  'reporter-performance': ReporterPerformancePage,
  'reward-rules': RewardsRulesPage,
  users: UsersPage,
  admins: AdminsPage,
  notifications: NotificationsPage,
  settings: SettingsPage,
  media: MediaPage,
  'audit-logs': AuditLogsPage,
  withdrawals: WithdrawalsPage,
}

export default function AdminPage() {
  const params = useParams()
  const { isAuthenticated, activeView, setActiveView, logout } = useAppStore()

  const rawSlug = params?.slug
  const slugView = (Array.isArray(rawSlug) ? rawSlug[0] : rawSlug) as ViewType | undefined

  useEffect(() => {
    if (slugView && moduleComponents[slugView]) {
      setActiveView(slugView)
    }
  }, [slugView, setActiveView])

  useEffect(() => {
    const handleUnauthorized = () => {
      logout()
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized)
  }, [logout])

  if (!isAuthenticated) {
    return <LoginPage />
  }

  const targetView: ViewType = (slugView && moduleComponents[slugView]) ? slugView : activeView
  const ActiveModule = moduleComponents[targetView] || DashboardPage

  return (
    <AdminLayout>
      <ActiveModule />
    </AdminLayout>
  )
}

