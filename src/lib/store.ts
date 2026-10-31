'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewType =
  | 'dashboard'
  | 'news'
  | 'videos'
  | 'locations'
  | 'categories'
  | 'tags'
  | 'ads'
  | 'reporters'
  | 'reporter-performance'
  | 'reward-rules'
  | 'users'
  | 'admins'
  | 'notifications'
  | 'settings'
  | 'media'
  | 'audit-logs'
  | 'withdrawals'
  | 'reports'

interface AdminUser {
  id: string
  email: string
  name: string
  role: string
  avatar?: string | null
}

interface AppState {
  activeView: ViewType
  isAuthenticated: boolean
  currentUser: AdminUser | null
  sidebarOpen: boolean
  pendingAction: string | null
  selectedReporterId: string | null
  setActiveView: (view: ViewType, action?: string | null) => void
  setSelectedReporterId: (id: string | null) => void
  setAuthenticated: (auth: boolean) => void
  setCurrentUser: (user: AdminUser | null) => void
  setSidebarOpen: (open: boolean) => void
  setPendingAction: (action: string | null) => void
  logout: () => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      activeView: 'dashboard',
      isAuthenticated: false,
      currentUser: null,
      sidebarOpen: true,
      pendingAction: null,
      selectedReporterId: null,
      setActiveView: (view, action) => set({ activeView: view, pendingAction: action || null }),
      setSelectedReporterId: (id) => set({ selectedReporterId: id }),
      setAuthenticated: (auth) => set({ isAuthenticated: auth }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setPendingAction: (action) => set({ pendingAction: action }),
      logout: () =>
        set({
          isAuthenticated: false,
          currentUser: null,
          activeView: 'dashboard',
          pendingAction: null,
        }),
    }),
    {
      name: 'tjsn-admin-store',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        currentUser: state.currentUser,
      }),
      // Validate the token still exists in localStorage when store is hydrated
      // This prevents ghost sessions where store says authenticated but token is gone
      onRehydrateStorage: () => (state) => {
        if (state?.isAuthenticated && typeof window !== 'undefined') {
          const token = localStorage.getItem('admin_token')
          if (!token) {
            // Token was cleared but store still says authenticated - reset
            state.isAuthenticated = false
            state.currentUser = null
          }
        }
      },
    }
  )
)
