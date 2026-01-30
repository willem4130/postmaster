import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ViewType = 'inbox' | 'sent' | 'drafts' | 'starred' | 'archived' | 'trash' | 'all' | 'perspective'

interface UIState {
  // Navigation
  currentView: ViewType
  currentAccountId: string | null // null = all accounts
  currentPerspectiveId: string | null

  // Layout
  sidebarCollapsed: boolean
  detailPanelWidth: number
  listPanelWidth: number

  // Theme
  theme: 'light' | 'dark' | 'system'

  // Search
  searchQuery: string
  searchOpen: boolean

  // Actions
  setCurrentView: (view: ViewType) => void
  setCurrentAccountId: (accountId: string | null) => void
  setCurrentPerspectiveId: (perspectiveId: string | null) => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setDetailPanelWidth: (width: number) => void
  setListPanelWidth: (width: number) => void
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  setSearchQuery: (query: string) => void
  setSearchOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Initial state
      currentView: 'inbox',
      currentAccountId: null,
      currentPerspectiveId: null,
      sidebarCollapsed: false,
      detailPanelWidth: 500,
      listPanelWidth: 350,
      theme: 'dark',
      searchQuery: '',
      searchOpen: false,

      // Actions
      setCurrentView: (view) => set({ currentView: view }),
      setCurrentAccountId: (accountId) => set({ currentAccountId: accountId }),
      setCurrentPerspectiveId: (perspectiveId) => set({ currentPerspectiveId: perspectiveId }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setDetailPanelWidth: (width) => set({ detailPanelWidth: width }),
      setListPanelWidth: (width) => set({ listPanelWidth: width }),
      setTheme: (theme) => {
        set({ theme })
        // Apply theme to document
        const root = document.documentElement
        if (theme === 'system') {
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          root.classList.toggle('dark', isDark)
        } else {
          root.classList.toggle('dark', theme === 'dark')
        }
      },
      setSearchQuery: (query) => set({ searchQuery: query }),
      setSearchOpen: (open) => set({ searchOpen: open }),
    }),
    {
      name: 'postmaster-ui',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        detailPanelWidth: state.detailPanelWidth,
        listPanelWidth: state.listPanelWidth,
        theme: state.theme,
      }),
    }
  )
)
