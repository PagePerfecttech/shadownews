'use client'

import { useAppStore, type ViewType } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  LayoutDashboard,
  Newspaper,
  Video,
  MapPin,
  FolderOpen,
  Tag,
  Megaphone,
  Users,
  UserCog,
  Contact,
  Bell,
  Settings,
  Image,
  FileText,
  Menu,
  LogOut,
  ChevronLeft,
  Banknote,
  Award,
  Coins,
  Search,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { useState } from 'react'

interface NavItem {
  id: ViewType
  label: string
  icon: React.ElementType
  section: string
  roles?: string[] // If undefined, available to all
}

const navItems: NavItem[] = [
  // Overview
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'Overview' },

  // Content
  { id: 'news', label: 'News Management', icon: Newspaper, section: 'Editorial & Content', roles: ['super_admin', 'superadmin', 'admin', 'editor'] },
  { id: 'reports', label: 'Citizen Reports', icon: ShieldAlert, section: 'Editorial & Content', roles: ['super_admin', 'superadmin', 'admin', 'editor'] },
  { id: 'videos', label: 'Shorts & Videos', icon: Video, section: 'Editorial & Content', roles: ['super_admin', 'superadmin', 'admin', 'editor'] },
  { id: 'categories', label: 'Categories', icon: FolderOpen, section: 'Editorial & Content', roles: ['super_admin', 'superadmin', 'admin', 'editor'] },
  { id: 'tags', label: 'Tags & Topics', icon: Tag, section: 'Editorial & Content', roles: ['super_admin', 'superadmin', 'admin', 'editor'] },

  // Reporters
  { id: 'reporters', label: 'Reporters Directory', icon: Users, section: 'Journalists & Staff', roles: ['super_admin', 'superadmin', 'admin', 'editor', 'finance'] },
  { id: 'reporter-performance', label: 'Performance Tiers', icon: Award, section: 'Journalists & Staff', roles: ['super_admin', 'superadmin', 'admin', 'editor'] },
  { id: 'reward-rules', label: 'Reward & Level Rules', icon: Coins, section: 'Journalists & Staff', roles: ['super_admin', 'superadmin', 'admin', 'finance'] },

  // Finance
  { id: 'withdrawals', label: 'Withdrawals Tab', icon: Banknote, section: 'Finance & Payouts', roles: ['super_admin', 'superadmin', 'admin', 'finance'] },

  // Monetization
  { id: 'ads', label: 'Ads & AdMob', icon: Megaphone, section: 'Monetization', roles: ['super_admin', 'superadmin', 'admin', 'ad_manager'] },

  // Audience
  { id: 'users', label: 'App Readers', icon: Contact, section: 'Audience & Growth', roles: ['super_admin', 'superadmin', 'admin', 'editor'] },
  { id: 'notifications', label: 'Push Broadcasts', icon: Bell, section: 'Audience & Growth', roles: ['super_admin', 'superadmin', 'admin', 'editor'] },

  // System
  { id: 'locations', label: 'Location Hierarchy', icon: MapPin, section: 'System & Controls', roles: ['super_admin', 'superadmin', 'admin'] },
  { id: 'media', label: 'Media Library', icon: Image, section: 'System & Controls' },
  { id: 'admins', label: 'Admin Staff', icon: UserCog, section: 'System & Controls', roles: ['super_admin', 'superadmin', 'admin'] },
  { id: 'audit-logs', label: 'Audit Trail', icon: FileText, section: 'System & Controls', roles: ['super_admin', 'superadmin', 'admin'] },
  { id: 'settings', label: 'Platform Settings', icon: Settings, section: 'System & Controls', roles: ['super_admin', 'superadmin', 'admin'] },
]

function SidebarNav({
  activeView,
  onViewChange,
  collapsed,
  userRole,
}: {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
  collapsed: boolean
  userRole?: string
}) {
  const normalizedRole = (userRole?.toLowerCase() || 'super_admin').replace(/[-_\s]/g, '')
  const isSuperOrAdmin =
    !userRole ||
    normalizedRole === 'superadmin' ||
    normalizedRole === 'admin' ||
    normalizedRole === 'owner' ||
    normalizedRole === 'manager'

  // Filter items visible to this role
  const visibleItems = navItems.filter(item => {
    if (!item.roles) return true
    if (isSuperOrAdmin) return true
    const normalizedItemRoles = item.roles.map(r => r.toLowerCase().replace(/[-_\s]/g, ''))
    return normalizedItemRoles.includes(normalizedRole)
  })

  // Group by section
  const sections: { [key: string]: NavItem[] } = {}
  for (const item of visibleItems) {
    if (!sections[item.section]) sections[item.section] = []
    sections[item.section].push(item)
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Brand Header */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 h-16 border-b border-white/10 bg-slate-950 flex-shrink-0',
          collapsed && 'justify-center px-2'
        )}
      >
        <div className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 bg-white p-0.5 shadow-sm">
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="flex flex-col">
              <h1 className="text-sm font-bold text-white tracking-wide">Spot News</h1>
              <span className="text-[10px] text-red-400 font-semibold leading-tight">Telangana Jyothi</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-tight">Master Control</p>
          </div>
        )}
      </div>

      {/* Navigation List - Native flex-1 with overflow-y-auto to avoid any Radix ScrollArea height-collapse issues */}
      <div className="flex-1 overflow-y-auto min-h-0 py-3 select-none">
        <nav className="space-y-4 px-2">
          {Object.entries(sections).map(([sectionTitle, items]) => (
            <div key={sectionTitle} className="space-y-0.5">
              {!collapsed && (
                <div className="px-3 pb-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                  {sectionTitle}
                </div>
              )}
              {items.map(item => {
                const Icon = item.icon
                const isActive = activeView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => onViewChange(item.id)}
                    className={cn(
                      'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-medium transition-all text-left',
                      isActive
                        ? 'bg-red-600 text-white shadow-md font-semibold'
                        : 'text-gray-300 hover:bg-white/10 hover:text-white',
                      collapsed && 'justify-center px-2'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                )
              })}
            </div>
          ))}
        </nav>
      </div>
    </div>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { activeView, setActiveView, currentUser, logout, sidebarOpen, setSidebarOpen } = useAppStore()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    logout()
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans">
      {/* Desktop Sidebar - fixed, flex-shrink-0, sticky h-screen */}
      <aside
        className={cn(
          'hidden md:flex flex-col flex-shrink-0 bg-slate-900 text-white transition-all duration-300 border-r border-slate-800 shadow-lg select-none sticky top-0 h-screen z-40',
          collapsed ? 'w-16 min-w-[4rem]' : 'w-64 min-w-[16rem]'
        )}
      >
        <SidebarNav
          activeView={activeView}
          onViewChange={setActiveView}
          collapsed={collapsed}
          userRole={currentUser?.role}
        />
        <div className="p-2 border-t border-white/10 flex-shrink-0 bg-slate-900">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-gray-400 hover:text-white hover:bg-white/10 text-xs"
            onClick={() => setCollapsed(!collapsed)}
          >
            <ChevronLeft className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed && <span className="ml-2 font-medium">Collapse Menu</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64 bg-slate-900 border-slate-800 text-white flex flex-col h-full">
          <div className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
            <SheetDescription>Main navigation menu for the admin dashboard</SheetDescription>
          </div>
          <SidebarNav
            activeView={activeView}
            onViewChange={(v) => {
              setActiveView(v)
              setSidebarOpen(false)
            }}
            collapsed={false}
            userRole={currentUser?.role}
          />
        </SheetContent>
      </Sheet>

      {/* Main Workspace */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Operational Bar */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 lg:px-6 shadow-sm sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              className="md:hidden flex items-center gap-1.5 border-slate-300 dark:border-slate-700 font-medium text-xs px-2.5 py-1.5"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
              <span>Menu</span>
            </Button>
            <div>
              <h2 className="text-base font-bold capitalize text-slate-800 dark:text-white leading-tight">
                {activeView.replace(/-/g, ' ')}
              </h2>
              <p className="text-[11px] text-muted-foreground hidden sm:block">
                Telangana Jyothi Administration Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Web Link */}
            <a
              href="https://m.telanganajyothi.in"
              target="_blank"
              rel="noreferrer"
              className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-red-600 transition-colors px-2 py-1 rounded border"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Live Site</span>
            </a>

            {/* Current Staff Profile */}
            <div className="flex items-center gap-2 pl-2 border-l">
              <Avatar className="h-8 w-8 border">
                <AvatarFallback className="bg-red-600 text-white text-xs font-bold">
                  {currentUser?.name?.slice(0, 2).toUpperCase() || 'AD'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-semibold text-slate-900 dark:text-white leading-tight">
                  {currentUser?.name || 'Administrator'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 capitalize font-semibold">
                    {currentUser?.role || 'Super Admin'}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator orientation="vertical" className="h-6 hidden sm:block" />

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-8 font-semibold"
            >
              <LogOut className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Page Container */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 bg-slate-50/60 dark:bg-slate-950">
          {children}
        </main>
      </div>
    </div>
  )
}
