import type { IpcMain, BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../shared/ipc-channels'
import { getDb } from '../../src/main/database/sqlite'
import { accounts, threads, emails, tags, perspectives } from '../../src/main/database/schema'
import { eq, desc, and, like, or, inArray, gte, lte } from 'drizzle-orm'
import { MicrosoftProvider } from '../../src/main/email/providers/microsoft-provider'
import { GmailProvider } from '../../src/main/email/providers/gmail-provider'
import { ImapProvider } from '../../src/main/email/providers/imap-provider'
import { ClaudeClient, type AggregatedAnalysisData } from '../../src/main/ai/claude-client'
import type { BulkAnalysisOptions, BulkAnalysisResult, BulkAnalysisProgress } from '../../src/shared/types/ai'

// Helper to get date range based on preset
function getDateRangeFromPreset(preset: string): { start: string; end: string } {
  const now = new Date()
  const end = now.toISOString()
  let start: Date

  switch (preset) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'yesterday':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)
      break
    case 'last7days':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'last30days':
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    default:
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }

  return { start: start.toISOString(), end }
}

// Helper to extract domain from email
function extractDomain(email: string): string {
  const match = email.match(/@([^@]+)$/)
  return match ? match[1].toLowerCase() : 'unknown'
}

// Store reference to main window for sending progress events
let mainWindow: BrowserWindow | null = null

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
}

export function registerIpcHandlers(ipcMain: IpcMain): void {
  // ============================================
  // Account handlers
  // ============================================
  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_LIST, async () => {
    const db = getDb()
    return db.select().from(accounts).all()
  })

  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_ADD, async (_event, accountData) => {
    const db = getDb()
    const result = db.insert(accounts).values(accountData).returning().get()
    return result
  })

  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_UPDATE, async (_event, id: string, data) => {
    const db = getDb()
    return db.update(accounts).set(data).where(eq(accounts.id, id)).returning().get()
  })

  ipcMain.handle(IPC_CHANNELS.ACCOUNTS_DELETE, async (_event, id: string) => {
    const db = getDb()
    return db.delete(accounts).where(eq(accounts.id, id)).returning().get()
  })

  // ============================================
  // Email/Thread handlers
  // ============================================
  ipcMain.handle(IPC_CHANNELS.THREADS_LIST, async (_event, options: {
    accountId?: string
    folder?: string
    limit?: number
    offset?: number
    status?: string
  }) => {
    const db = getDb()
    const conditions = []

    if (options.accountId) {
      conditions.push(eq(threads.accountId, options.accountId))
    }

    if (options.status === 'inbox') {
      conditions.push(eq(threads.inboxStatus, true))
    } else if (options.status === 'sent') {
      conditions.push(eq(threads.sentStatus, true))
    } else if (options.status === 'draft') {
      conditions.push(eq(threads.draftStatus, true))
    } else if (options.status === 'archived') {
      conditions.push(eq(threads.archivedStatus, true))
    }

    const query = db
      .select()
      .from(threads)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(threads.lastMessageAt))
      .limit(options.limit || 50)
      .offset(options.offset || 0)

    return query.all()
  })

  ipcMain.handle(IPC_CHANNELS.THREAD_GET, async (_event, threadId: string) => {
    const db = getDb()
    const thread = db.select().from(threads).where(eq(threads.id, threadId)).get()
    const threadEmails = db.select().from(emails).where(eq(emails.threadId, threadId)).all()
    return { thread, emails: threadEmails }
  })

  ipcMain.handle(IPC_CHANNELS.THREAD_UPDATE, async (_event, threadId: string, data) => {
    const db = getDb()
    return db.update(threads).set(data).where(eq(threads.id, threadId)).returning().get()
  })

  ipcMain.handle(IPC_CHANNELS.EMAIL_MARK_READ, async (_event, emailId: string, isRead: boolean) => {
    const db = getDb()
    return db.update(emails).set({ isRead }).where(eq(emails.id, emailId)).returning().get()
  })

  ipcMain.handle(IPC_CHANNELS.EMAIL_STAR, async (_event, emailId: string, isStarred: boolean) => {
    const db = getDb()
    return db.update(emails).set({ isStarred }).where(eq(emails.id, emailId)).returning().get()
  })

  // ============================================
  // Search handlers
  // ============================================
  ipcMain.handle(IPC_CHANNELS.SEARCH, async (_event, query: string, options?: { accountId?: string }) => {
    const db = getDb()
    const conditions = [
      or(
        like(threads.subject, `%${query}%`),
        like(threads.snippet, `%${query}%`)
      )
    ]

    if (options?.accountId) {
      conditions.push(eq(threads.accountId, options.accountId))
    }

    return db
      .select()
      .from(threads)
      .where(and(...conditions))
      .orderBy(desc(threads.lastMessageAt))
      .limit(100)
      .all()
  })

  // ============================================
  // Tag handlers
  // ============================================
  ipcMain.handle(IPC_CHANNELS.TAGS_LIST, async () => {
    const db = getDb()
    return db.select().from(tags).all()
  })

  ipcMain.handle(IPC_CHANNELS.TAGS_CREATE, async (_event, tagData) => {
    const db = getDb()
    return db.insert(tags).values(tagData).returning().get()
  })

  ipcMain.handle(IPC_CHANNELS.TAGS_UPDATE, async (_event, id: string, data) => {
    const db = getDb()
    return db.update(tags).set(data).where(eq(tags.id, id)).returning().get()
  })

  ipcMain.handle(IPC_CHANNELS.TAGS_DELETE, async (_event, id: string) => {
    const db = getDb()
    return db.delete(tags).where(eq(tags.id, id)).returning().get()
  })

  // ============================================
  // Perspective handlers
  // ============================================
  ipcMain.handle(IPC_CHANNELS.PERSPECTIVES_LIST, async () => {
    const db = getDb()
    return db.select().from(perspectives).all()
  })

  ipcMain.handle(IPC_CHANNELS.PERSPECTIVES_CREATE, async (_event, perspectiveData) => {
    const db = getDb()
    return db.insert(perspectives).values(perspectiveData).returning().get()
  })

  ipcMain.handle(IPC_CHANNELS.PERSPECTIVES_UPDATE, async (_event, id: string, data) => {
    const db = getDb()
    return db.update(perspectives).set(data).where(eq(perspectives.id, id)).returning().get()
  })

  ipcMain.handle(IPC_CHANNELS.PERSPECTIVES_DELETE, async (_event, id: string) => {
    const db = getDb()
    return db.delete(perspectives).where(eq(perspectives.id, id)).returning().get()
  })

  // ============================================
  // Sync handlers
  // ============================================
  ipcMain.handle(IPC_CHANNELS.SYNC_ACCOUNT, async (_event, accountId: string) => {
    const db = getDb()
    const account = db.select().from(accounts).where(eq(accounts.id, accountId)).get()

    if (!account) {
      throw new Error('Account not found')
    }

    let provider
    switch (account.provider) {
      case 'MICROSOFT_365':
      case 'MICROSOFT_PERSONAL':
        provider = new MicrosoftProvider(account)
        break
      case 'GMAIL':
        provider = new GmailProvider(account)
        break
      case 'IMAP':
        provider = new ImapProvider(account)
        break
      default:
        throw new Error(`Unknown provider: ${account.provider}`)
    }

    await provider.connect()
    const result = account.syncCursor
      ? await provider.performIncrementalSync(account.syncCursor)
      : await provider.performInitialSync()
    await provider.disconnect()

    // Update sync cursor
    db.update(accounts)
      .set({
        syncCursor: result.newCursor,
        lastSyncAt: new Date().toISOString(),
        syncStatus: 'SYNCED',
      })
      .where(eq(accounts.id, accountId))
      .run()

    return result
  })

  ipcMain.handle(IPC_CHANNELS.SYNC_ALL, async () => {
    const db = getDb()
    const allAccounts = db.select().from(accounts).all()
    const results = []

    for (const account of allAccounts) {
      try {
        // Trigger sync for each account
        // In production, this would run in parallel
        results.push({ accountId: account.id, status: 'queued' })
      } catch (error) {
        results.push({ accountId: account.id, status: 'error', error: String(error) })
      }
    }

    return results
  })

  // ============================================
  // AI handlers
  // ============================================
  ipcMain.handle(IPC_CHANNELS.AI_CATEGORIZE, async (_event, threadId: string) => {
    const db = getDb()
    const thread = db.select().from(threads).where(eq(threads.id, threadId)).get()
    const threadEmails = db.select().from(emails).where(eq(emails.threadId, threadId)).all()

    if (!thread || !threadEmails.length) {
      throw new Error('Thread not found')
    }

    const client = new ClaudeClient()
    return client.categorizeEmail({
      subject: thread.subject,
      body: threadEmails[0].bodyText || '',
      from: threadEmails[0].fromAddress,
    })
  })

  ipcMain.handle(IPC_CHANNELS.AI_SUMMARIZE, async (_event, threadId: string) => {
    const db = getDb()
    const thread = db.select().from(threads).where(eq(threads.id, threadId)).get()
    const threadEmails = db.select().from(emails).where(eq(emails.threadId, threadId)).all()

    if (!thread || !threadEmails.length) {
      throw new Error('Thread not found')
    }

    const client = new ClaudeClient()
    return client.summarizeThread(
      threadEmails.map((e) => ({
        from: e.fromAddress,
        subject: e.subject,
        body: e.bodyText || '',
        date: e.sentAt,
      }))
    )
  })

  ipcMain.handle(IPC_CHANNELS.AI_SUGGEST_REPLY, async (_event, threadId: string, tone?: string) => {
    const db = getDb()
    const thread = db.select().from(threads).where(eq(threads.id, threadId)).get()
    const threadEmails = db.select().from(emails).where(eq(emails.threadId, threadId)).all()

    if (!thread || !threadEmails.length) {
      throw new Error('Thread not found')
    }

    const client = new ClaudeClient()
    return client.suggestReply(
      threadEmails.map((e) => ({
        from: e.fromAddress,
        subject: e.subject,
        body: e.bodyText || '',
        date: e.sentAt,
      })),
      tone || 'professional'
    )
  })

  ipcMain.handle(IPC_CHANNELS.AI_PRIORITY, async (_event, threadId: string) => {
    const db = getDb()
    const thread = db.select().from(threads).where(eq(threads.id, threadId)).get()
    const threadEmails = db.select().from(emails).where(eq(emails.threadId, threadId)).all()

    if (!thread || !threadEmails.length) {
      throw new Error('Thread not found')
    }

    const client = new ClaudeClient()
    return client.scorePriority({
      subject: thread.subject,
      body: threadEmails[0].bodyText || '',
      from: threadEmails[0].fromAddress,
      date: threadEmails[0].sentAt,
    })
  })

  ipcMain.handle(IPC_CHANNELS.AI_EXTRACT_ENTITIES, async (_event, threadId: string) => {
    const db = getDb()
    const thread = db.select().from(threads).where(eq(threads.id, threadId)).get()
    const threadEmails = db.select().from(emails).where(eq(emails.threadId, threadId)).all()

    if (!thread || !threadEmails.length) {
      throw new Error('Thread not found')
    }

    const client = new ClaudeClient()
    return client.extractEntities({
      subject: thread.subject,
      body: threadEmails[0].bodyText || '',
      from: threadEmails[0].fromAddress,
    })
  })

  // ============================================
  // Bulk AI Analysis handler
  // ============================================
  ipcMain.handle(IPC_CHANNELS.AI_BULK_ANALYZE, async (_event, options: BulkAnalysisOptions) => {
    const db = getDb()
    const client = new ClaudeClient()

    // Build query conditions based on options
    const conditions = []

    // Get thread IDs to analyze
    let threadIds: string[] = []

    if (options.threadIds && options.threadIds.length > 0) {
      threadIds = options.threadIds
      // threadIds provided directly
    } else {
      // Query based on domain or date range
      if (options.preset) {
        const { start, end } = getDateRangeFromPreset(options.preset)
        conditions.push(gte(threads.lastMessageAt, start))
        conditions.push(lte(threads.lastMessageAt, end))
      } else if (options.dateRange) {
        conditions.push(gte(threads.lastMessageAt, options.dateRange.start))
        conditions.push(lte(threads.lastMessageAt, options.dateRange.end))
      }

      // Get threads matching conditions
      const matchingThreads = db
        .select()
        .from(threads)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .all()

      // Filter by domain if specified
      if (options.domain) {
        const domainLower = options.domain.toLowerCase().replace('@', '')
        const threadIdsToCheck = matchingThreads.map((t) => t.id)

        // Get emails for these threads and filter by domain
        const threadEmailsAll = threadIdsToCheck.length > 0
          ? db.select().from(emails).where(inArray(emails.threadId, threadIdsToCheck)).all()
          : []

        const threadsWithDomain = new Set<string>()
        for (const email of threadEmailsAll) {
          const emailDomain = extractDomain(email.fromAddress)
          if (emailDomain.includes(domainLower)) {
            threadsWithDomain.add(email.threadId)
          }
        }
        threadIds = Array.from(threadsWithDomain)
      } else {
        threadIds = matchingThreads.map((t) => t.id)
      }
    }

    if (threadIds.length === 0) {
      return {
        threadCount: 0,
        categoryBreakdown: {},
        priorityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
        topSenders: [],
        topDomains: [],
        actionItems: [],
        entities: { dates: [], amounts: [], contacts: [], organizations: [] },
        executiveSummary: 'No emails found matching the criteria.',
        analyzedAt: new Date().toISOString(),
      } as BulkAnalysisResult
    }

    // Process in batches of 5 (parallel)
    const BATCH_SIZE = 5
    const results: Array<{
      threadId: string
      category: { category: string; confidence: number; subcategory?: string }
      priority: { score: number; reason: string; urgency: 'low' | 'medium' | 'high' | 'critical' }
      entities: {
        dates: Array<{ value: string; context: string }>
        amounts: Array<{ value: string; currency?: string; context: string }>
        contacts: Array<{ name?: string; email?: string; role?: string }>
        organizations: string[]
      }
      actionItems: string[]
      senderEmail: string
      subject: string
    }> = []

    for (let i = 0; i < threadIds.length; i += BATCH_SIZE) {
      const batch = threadIds.slice(i, i + BATCH_SIZE)

      const batchPromises = batch.map(async (threadId) => {
        try {
          // Send progress update
          if (mainWindow && !mainWindow.isDestroyed()) {
            const progress: BulkAnalysisProgress = {
              current: i + batch.indexOf(threadId) + 1,
              total: threadIds.length,
              threadId,
              status: 'processing',
            }
            mainWindow.webContents.send(IPC_CHANNELS.AI_BULK_PROGRESS, progress)
          }

          const thread = db.select().from(threads).where(eq(threads.id, threadId)).get()
          const threadEmails = db.select().from(emails).where(eq(emails.threadId, threadId)).all()

          if (!thread || !threadEmails.length) {
            return null
          }

          const primaryEmail = threadEmails[0]
          const result = await client.processEmailWithActionItems({
            subject: thread.subject,
            body: primaryEmail.bodyText || '',
            from: primaryEmail.fromAddress,
            date: primaryEmail.sentAt,
          })

          // Send completed progress
          if (mainWindow && !mainWindow.isDestroyed()) {
            const progress: BulkAnalysisProgress = {
              current: i + batch.indexOf(threadId) + 1,
              total: threadIds.length,
              threadId,
              status: 'completed',
            }
            mainWindow.webContents.send(IPC_CHANNELS.AI_BULK_PROGRESS, progress)
          }

          return {
            threadId,
            category: result.category,
            priority: result.priority,
            entities: result.entities,
            actionItems: result.actionItems,
            senderEmail: primaryEmail.fromAddress,
            subject: thread.subject,
          }
        } catch (error) {
          console.error(`[Bulk Analyze] Error processing thread ${threadId}:`, error)
          // Send error progress
          if (mainWindow && !mainWindow.isDestroyed()) {
            const progress: BulkAnalysisProgress = {
              current: i + batch.indexOf(threadId) + 1,
              total: threadIds.length,
              threadId,
              status: 'error',
              error: String(error),
            }
            mainWindow.webContents.send(IPC_CHANNELS.AI_BULK_PROGRESS, progress)
          }
          return null
        }
      })

      const batchResults = await Promise.all(batchPromises)
      const validResults = batchResults.filter((r): r is NonNullable<typeof r> => r !== null)
      results.push(...validResults)
    }

    // Aggregate results
    const categoryBreakdown: Record<string, number> = {}
    const priorityDistribution = { critical: 0, high: 0, medium: 0, low: 0 }
    const senderCounts: Record<string, number> = {}
    const domainCounts: Record<string, number> = {}
    const actionItems: Array<{ item: string; threadId: string; priority: 'low' | 'medium' | 'high' | 'critical' }> = []
    const entities = {
      dates: [] as Array<{ value: string; context: string; threadId: string }>,
      amounts: [] as Array<{ value: string; currency?: string; context: string; threadId: string }>,
      contacts: [] as Array<{ name?: string; email?: string; role?: string; threadId: string }>,
      organizations: [] as Array<{ name: string; threadId: string }>,
    }
    const subjects: string[] = []

    for (const result of results) {
      // Categories
      categoryBreakdown[result.category.category] = (categoryBreakdown[result.category.category] || 0) + 1

      // Priority
      priorityDistribution[result.priority.urgency]++

      // Senders
      senderCounts[result.senderEmail] = (senderCounts[result.senderEmail] || 0) + 1

      // Domains
      const domain = extractDomain(result.senderEmail)
      domainCounts[domain] = (domainCounts[domain] || 0) + 1

      // Action items
      for (const item of result.actionItems) {
        actionItems.push({ item, threadId: result.threadId, priority: result.priority.urgency })
      }

      // Entities
      for (const date of result.entities.dates) {
        entities.dates.push({ ...date, threadId: result.threadId })
      }
      for (const amount of result.entities.amounts) {
        entities.amounts.push({ ...amount, threadId: result.threadId })
      }
      for (const contact of result.entities.contacts) {
        entities.contacts.push({ ...contact, threadId: result.threadId })
      }
      for (const org of result.entities.organizations) {
        entities.organizations.push({ name: org, threadId: result.threadId })
      }

      subjects.push(result.subject)
    }

    // Sort and limit top senders/domains
    const topSenders = Object.entries(senderCounts)
      .map(([email, count]) => ({ email, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const topDomains = Object.entries(domainCounts)
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Sort action items by priority
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    actionItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])

    // Generate executive summary
    const aggregatedData: AggregatedAnalysisData = {
      threadCount: results.length,
      categoryBreakdown,
      priorityDistribution,
      topSenders,
      topDomains,
      actionItems,
      entities,
      subjects,
    }

    const executiveSummary = await client.generateExecutiveSummary(aggregatedData)

    const bulkResult: BulkAnalysisResult = {
      threadCount: results.length,
      categoryBreakdown,
      priorityDistribution,
      topSenders,
      topDomains,
      actionItems,
      entities,
      executiveSummary,
      analyzedAt: new Date().toISOString(),
    }

    return bulkResult
  })

  // ============================================
  // OAuth handlers
  // ============================================
  ipcMain.handle(IPC_CHANNELS.OAUTH_START_MICROSOFT, async () => {
    const provider = new MicrosoftProvider()
    return provider.getAuthUrl()
  })

  ipcMain.handle(IPC_CHANNELS.OAUTH_CALLBACK_MICROSOFT, async (_event, code: string) => {
    const provider = new MicrosoftProvider()
    return provider.handleCallback(code)
  })

  ipcMain.handle(IPC_CHANNELS.OAUTH_START_GOOGLE, async () => {
    const provider = new GmailProvider()
    return provider.getAuthUrl()
  })

  ipcMain.handle(IPC_CHANNELS.OAUTH_CALLBACK_GOOGLE, async (_event, code: string) => {
    const provider = new GmailProvider()
    return provider.handleCallback(code)
  })

  // ============================================
  // Send email handlers
  // ============================================
  ipcMain.handle(IPC_CHANNELS.EMAIL_SEND, async (_event, params: {
    accountId: string
    to: string[]
    cc?: string[]
    bcc?: string[]
    subject: string
    body: string
    isHtml?: boolean
    replyToMessageId?: string
  }) => {
    const db = getDb()
    const account = db.select().from(accounts).where(eq(accounts.id, params.accountId)).get()

    if (!account) {
      throw new Error('Account not found')
    }

    let provider
    switch (account.provider) {
      case 'MICROSOFT_365':
      case 'MICROSOFT_PERSONAL':
        provider = new MicrosoftProvider(account)
        break
      case 'GMAIL':
        provider = new GmailProvider(account)
        break
      case 'IMAP':
        provider = new ImapProvider(account)
        break
      default:
        throw new Error(`Unknown provider: ${account.provider}`)
    }

    await provider.connect()
    const result = await provider.sendMessage({
      to: params.to,
      cc: params.cc,
      bcc: params.bcc,
      subject: params.subject,
      body: params.body,
      isHtml: params.isHtml,
      replyToMessageId: params.replyToMessageId,
    })
    await provider.disconnect()

    return result
  })
}
