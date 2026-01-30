import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS, type IpcChannel } from '../shared/ipc-channels'

// Type-safe API exposed to renderer
const electronAPI = {
  // Generic invoke for IPC
  invoke: <T>(channel: IpcChannel, ...args: unknown[]): Promise<T> => {
    return ipcRenderer.invoke(channel, ...args)
  },

  // Event listeners
  on: (channel: string, callback: (...args: unknown[]) => void) => {
    const subscription = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  },

  once: (channel: string, callback: (...args: unknown[]) => void) => {
    ipcRenderer.once(channel, (_event, ...args) => callback(...args))
  },

  // Accounts
  accounts: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_LIST),
    add: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_ADD, data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.ACCOUNTS_DELETE, id),
  },

  // Threads
  threads: {
    list: (options: {
      accountId?: string
      folder?: string
      limit?: number
      offset?: number
      status?: string
    }) => ipcRenderer.invoke(IPC_CHANNELS.THREADS_LIST, options),
    get: (threadId: string) => ipcRenderer.invoke(IPC_CHANNELS.THREAD_GET, threadId),
    update: (threadId: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.THREAD_UPDATE, threadId, data),
  },

  // Emails
  emails: {
    markRead: (emailId: string, isRead: boolean) => ipcRenderer.invoke(IPC_CHANNELS.EMAIL_MARK_READ, emailId, isRead),
    star: (emailId: string, isStarred: boolean) => ipcRenderer.invoke(IPC_CHANNELS.EMAIL_STAR, emailId, isStarred),
    send: (params: {
      accountId: string
      to: string[]
      cc?: string[]
      bcc?: string[]
      subject: string
      body: string
      isHtml?: boolean
      replyToMessageId?: string
    }) => ipcRenderer.invoke(IPC_CHANNELS.EMAIL_SEND, params),
  },

  // Search
  search: {
    query: (query: string, options?: { accountId?: string }) => ipcRenderer.invoke(IPC_CHANNELS.SEARCH, query, options),
  },

  // Tags
  tags: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.TAGS_LIST),
    create: (data: { name: string; color: string; icon?: string }) => ipcRenderer.invoke(IPC_CHANNELS.TAGS_CREATE, data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.TAGS_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.TAGS_DELETE, id),
  },

  // Perspectives
  perspectives: {
    list: () => ipcRenderer.invoke(IPC_CHANNELS.PERSPECTIVES_LIST),
    create: (data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PERSPECTIVES_CREATE, data),
    update: (id: string, data: unknown) => ipcRenderer.invoke(IPC_CHANNELS.PERSPECTIVES_UPDATE, id, data),
    delete: (id: string) => ipcRenderer.invoke(IPC_CHANNELS.PERSPECTIVES_DELETE, id),
  },

  // Sync
  sync: {
    account: (accountId: string) => ipcRenderer.invoke(IPC_CHANNELS.SYNC_ACCOUNT, accountId),
    all: () => ipcRenderer.invoke(IPC_CHANNELS.SYNC_ALL),
  },

  // AI
  ai: {
    categorize: (threadId: string) => ipcRenderer.invoke(IPC_CHANNELS.AI_CATEGORIZE, threadId),
    summarize: (threadId: string) => ipcRenderer.invoke(IPC_CHANNELS.AI_SUMMARIZE, threadId),
    suggestReply: (threadId: string, tone?: string) => ipcRenderer.invoke(IPC_CHANNELS.AI_SUGGEST_REPLY, threadId, tone),
    priority: (threadId: string) => ipcRenderer.invoke(IPC_CHANNELS.AI_PRIORITY, threadId),
    extractEntities: (threadId: string) => ipcRenderer.invoke(IPC_CHANNELS.AI_EXTRACT_ENTITIES, threadId),
    bulkAnalyze: (options: {
      threadIds?: string[]
      domain?: string
      dateRange?: { start: string; end: string }
      preset?: 'today' | 'yesterday' | 'last7days' | 'last30days'
    }) => ipcRenderer.invoke(IPC_CHANNELS.AI_BULK_ANALYZE, options),
    onBulkProgress: (callback: (progress: {
      current: number
      total: number
      threadId: string
      status: 'processing' | 'completed' | 'error'
      error?: string
    }) => void) => {
      const subscription = (_event: Electron.IpcRendererEvent, progress: unknown) => callback(progress as {
        current: number
        total: number
        threadId: string
        status: 'processing' | 'completed' | 'error'
        error?: string
      })
      ipcRenderer.on(IPC_CHANNELS.AI_BULK_PROGRESS, subscription)
      return () => ipcRenderer.removeListener(IPC_CHANNELS.AI_BULK_PROGRESS, subscription)
    },
  },

  // OAuth
  oauth: {
    startMicrosoft: () => ipcRenderer.invoke(IPC_CHANNELS.OAUTH_START_MICROSOFT),
    callbackMicrosoft: (code: string) => ipcRenderer.invoke(IPC_CHANNELS.OAUTH_CALLBACK_MICROSOFT, code),
    startGoogle: () => ipcRenderer.invoke(IPC_CHANNELS.OAUTH_START_GOOGLE),
    callbackGoogle: (code: string) => ipcRenderer.invoke(IPC_CHANNELS.OAUTH_CALLBACK_GOOGLE, code),
  },
}

// Expose API to renderer
contextBridge.exposeInMainWorld('electron', electronAPI)

// Type declaration for renderer
export type ElectronAPI = typeof electronAPI
