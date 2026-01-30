import { create } from 'zustand'
import type { Account, Thread, Tag, Perspective } from '@/shared/types/email'
import type { BulkAnalysisResult, BulkAnalysisProgress } from '@/shared/types/ai'

interface EmailState {
  // Data
  accounts: Account[]
  threads: Thread[]
  tags: Tag[]
  perspectives: Perspective[]

  // Sync state
  syncing: boolean
  syncingAccounts: Set<string>
  lastSyncError: string | null

  // Selection
  selectedThreadIds: Set<string>
  isMultiSelectMode: boolean

  // Bulk Analysis
  bulkAnalysisResult: BulkAnalysisResult | null
  bulkAnalysisProgress: BulkAnalysisProgress | null
  isBulkAnalyzing: boolean
  showBulkInsights: boolean

  // Actions
  setAccounts: (accounts: Account[]) => void
  addAccount: (account: Account) => void
  updateAccount: (id: string, data: Partial<Account>) => void
  removeAccount: (id: string) => void

  setThreads: (threads: Thread[]) => void
  addThreads: (threads: Thread[]) => void
  updateThread: (id: string, data: Partial<Thread>) => void
  removeThread: (id: string) => void

  setTags: (tags: Tag[]) => void
  addTag: (tag: Tag) => void
  updateTag: (id: string, data: Partial<Tag>) => void
  removeTag: (id: string) => void

  setPerspectives: (perspectives: Perspective[]) => void
  addPerspective: (perspective: Perspective) => void
  updatePerspective: (id: string, data: Partial<Perspective>) => void
  removePerspective: (id: string) => void

  setSyncing: (syncing: boolean) => void
  addSyncingAccount: (accountId: string) => void
  removeSyncingAccount: (accountId: string) => void
  setSyncError: (error: string | null) => void

  selectThread: (threadId: string, append?: boolean) => void
  deselectThread: (threadId: string) => void
  clearSelection: () => void
  selectAll: () => void
  toggleMultiSelectMode: () => void
  toggleThreadSelection: (threadId: string) => void

  // Bulk Analysis
  setBulkAnalysisResult: (result: BulkAnalysisResult | null) => void
  setBulkAnalysisProgress: (progress: BulkAnalysisProgress | null) => void
  setIsBulkAnalyzing: (analyzing: boolean) => void
  setShowBulkInsights: (show: boolean) => void

  // Async actions
  loadAccounts: () => Promise<void>
  loadThreads: (options?: { accountId?: string; status?: string }) => Promise<void>
  loadTags: () => Promise<void>
  loadPerspectives: () => Promise<void>
  syncAccount: (accountId: string) => Promise<void>
  syncAllAccounts: () => Promise<void>
}

export const useEmailStore = create<EmailState>((set, get) => ({
  // Initial state
  accounts: [],
  threads: [],
  tags: [],
  perspectives: [],
  syncing: false,
  syncingAccounts: new Set(),
  lastSyncError: null,
  selectedThreadIds: new Set(),
  isMultiSelectMode: false,
  bulkAnalysisResult: null,
  bulkAnalysisProgress: null,
  isBulkAnalyzing: false,
  showBulkInsights: false,

  // Account actions
  setAccounts: (accounts) => set({ accounts }),
  addAccount: (account) => set((state) => ({ accounts: [...state.accounts, account] })),
  updateAccount: (id, data) =>
    set((state) => ({
      accounts: state.accounts.map((a) => (a.id === id ? { ...a, ...data } : a)),
    })),
  removeAccount: (id) =>
    set((state) => ({
      accounts: state.accounts.filter((a) => a.id !== id),
    })),

  // Thread actions
  setThreads: (threads) => set({ threads }),
  addThreads: (threads) =>
    set((state) => {
      const existingIds = new Set(state.threads.map((t) => t.id))
      const newThreads = threads.filter((t) => !existingIds.has(t.id))
      return { threads: [...state.threads, ...newThreads] }
    }),
  updateThread: (id, data) =>
    set((state) => ({
      threads: state.threads.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),
  removeThread: (id) =>
    set((state) => ({
      threads: state.threads.filter((t) => t.id !== id),
    })),

  // Tag actions
  setTags: (tags) => set({ tags }),
  addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),
  updateTag: (id, data) =>
    set((state) => ({
      tags: state.tags.map((t) => (t.id === id ? { ...t, ...data } : t)),
    })),
  removeTag: (id) =>
    set((state) => ({
      tags: state.tags.filter((t) => t.id !== id),
    })),

  // Perspective actions
  setPerspectives: (perspectives) => set({ perspectives }),
  addPerspective: (perspective) => set((state) => ({ perspectives: [...state.perspectives, perspective] })),
  updatePerspective: (id, data) =>
    set((state) => ({
      perspectives: state.perspectives.map((p) => (p.id === id ? { ...p, ...data } : p)),
    })),
  removePerspective: (id) =>
    set((state) => ({
      perspectives: state.perspectives.filter((p) => p.id !== id),
    })),

  // Sync state actions
  setSyncing: (syncing) => set({ syncing }),
  addSyncingAccount: (accountId) =>
    set((state) => ({
      syncingAccounts: new Set([...state.syncingAccounts, accountId]),
    })),
  removeSyncingAccount: (accountId) =>
    set((state) => {
      const newSet = new Set(state.syncingAccounts)
      newSet.delete(accountId)
      return { syncingAccounts: newSet }
    }),
  setSyncError: (error) => set({ lastSyncError: error }),

  // Selection actions
  selectThread: (threadId, append = false) =>
    set((state) => {
      if (append) {
        const newSet = new Set(state.selectedThreadIds)
        newSet.add(threadId)
        return { selectedThreadIds: newSet }
      }
      return { selectedThreadIds: new Set([threadId]) }
    }),
  deselectThread: (threadId) =>
    set((state) => {
      const newSet = new Set(state.selectedThreadIds)
      newSet.delete(threadId)
      return { selectedThreadIds: newSet }
    }),
  clearSelection: () => set({ selectedThreadIds: new Set() }),
  selectAll: () =>
    set((state) => ({
      selectedThreadIds: new Set(state.threads.map((t) => t.id)),
    })),
  toggleMultiSelectMode: () =>
    set((state) => ({
      isMultiSelectMode: !state.isMultiSelectMode,
      selectedThreadIds: state.isMultiSelectMode ? new Set() : state.selectedThreadIds,
    })),
  toggleThreadSelection: (threadId) =>
    set((state) => {
      const newSet = new Set(state.selectedThreadIds)
      if (newSet.has(threadId)) {
        newSet.delete(threadId)
      } else {
        newSet.add(threadId)
      }
      return { selectedThreadIds: newSet }
    }),

  // Bulk Analysis
  setBulkAnalysisResult: (result) => set({ bulkAnalysisResult: result }),
  setBulkAnalysisProgress: (progress) => set({ bulkAnalysisProgress: progress }),
  setIsBulkAnalyzing: (analyzing) => set({ isBulkAnalyzing: analyzing }),
  setShowBulkInsights: (show) => set({ showBulkInsights: show }),

  // Async actions
  loadAccounts: async () => {
    try {
      const accounts = await window.electron.accounts.list()
      set({ accounts })
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }
  },

  loadThreads: async (options) => {
    try {
      const threads = await window.electron.threads.list({
        accountId: options?.accountId,
        status: options?.status || 'inbox',
        limit: 100,
      })
      set({ threads })
    } catch (error) {
      console.error('Failed to load threads:', error)
    }
  },

  loadTags: async () => {
    try {
      const tags = await window.electron.tags.list()
      set({ tags })
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  },

  loadPerspectives: async () => {
    try {
      const perspectives = await window.electron.perspectives.list()
      set({ perspectives })
    } catch (error) {
      console.error('Failed to load perspectives:', error)
    }
  },

  syncAccount: async (accountId) => {
    const { addSyncingAccount, removeSyncingAccount, setSyncError } = get()

    addSyncingAccount(accountId)
    setSyncError(null)

    try {
      await window.electron.sync.account(accountId)
      // Reload threads after sync
      await get().loadThreads()
    } catch (error) {
      setSyncError(String(error))
      console.error('Failed to sync account:', error)
    } finally {
      removeSyncingAccount(accountId)
    }
  },

  syncAllAccounts: async () => {
    const { accounts, syncAccount, setSyncing } = get()

    setSyncing(true)

    try {
      // Load accounts first if empty
      if (accounts.length === 0) {
        await get().loadAccounts()
      }

      // Sync each account
      const currentAccounts = get().accounts
      await Promise.all(currentAccounts.map((account) => syncAccount(account.id)))
    } finally {
      setSyncing(false)
    }
  },
}))
