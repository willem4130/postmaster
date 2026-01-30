import { PrismaClient } from '@prisma/client'
import { getDb } from './sqlite'
import { threads, emails, tags, perspectives, threadTags, threadAiMetadata } from './schema'
import { eq } from 'drizzle-orm'

let prisma: PrismaClient | null = null

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient()
  }
  return prisma
}

export async function closePrismaClient(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
  }
}

export interface SyncOptions {
  userId: string
  direction: 'push' | 'pull' | 'both'
  entities?: ('threads' | 'tags' | 'perspectives' | 'rules')[]
}

export class SyncManager {
  private prisma: PrismaClient
  private localDb: ReturnType<typeof getDb>
  private userId: string

  constructor(userId: string) {
    this.prisma = getPrismaClient()
    this.localDb = getDb()
    this.userId = userId
  }

  /**
   * Sync local data to cloud (push)
   */
  async pushToCloud(): Promise<void> {
    console.log('Pushing local data to cloud...')

    // Sync tags
    await this.pushTags()

    // Sync perspectives
    await this.pushPerspectives()

    // Note: Threads and emails are synced from email providers,
    // not between local and cloud. Cloud stores metadata only.
    await this.pushThreadMetadata()

    console.log('Push to cloud complete')
  }

  /**
   * Sync cloud data to local (pull)
   */
  async pullFromCloud(): Promise<void> {
    console.log('Pulling cloud data to local...')

    // Sync tags
    await this.pullTags()

    // Sync perspectives
    await this.pullPerspectives()

    // Sync thread metadata (AI results, custom fields)
    await this.pullThreadMetadata()

    console.log('Pull from cloud complete')
  }

  /**
   * Full bidirectional sync
   */
  async sync(): Promise<void> {
    // Push local changes first
    await this.pushToCloud()

    // Then pull cloud changes
    await this.pullFromCloud()
  }

  // ============================================
  // Tags sync
  // ============================================

  private async pushTags(): Promise<void> {
    const localTags = this.localDb.select().from(tags).where(eq(tags.userId, this.userId)).all()

    for (const tag of localTags) {
      await this.prisma.tag.upsert({
        where: { id: tag.id },
        create: {
          id: tag.id,
          userId: this.userId,
          name: tag.name,
          color: tag.color || '#6366f1',
          icon: tag.icon,
          parentId: tag.parentId,
          position: tag.position || 0,
        },
        update: {
          name: tag.name,
          color: tag.color || '#6366f1',
          icon: tag.icon,
          parentId: tag.parentId,
          position: tag.position || 0,
        },
      })
    }
  }

  private async pullTags(): Promise<void> {
    const cloudTags = await this.prisma.tag.findMany({
      where: { userId: this.userId },
    })

    for (const tag of cloudTags) {
      const exists = this.localDb.select().from(tags).where(eq(tags.id, tag.id)).get()

      if (exists) {
        this.localDb
          .update(tags)
          .set({
            name: tag.name,
            color: tag.color,
            icon: tag.icon,
            parentId: tag.parentId,
            position: tag.position,
          })
          .where(eq(tags.id, tag.id))
          .run()
      } else {
        this.localDb
          .insert(tags)
          .values({
            id: tag.id,
            userId: this.userId,
            name: tag.name,
            color: tag.color,
            icon: tag.icon,
            parentId: tag.parentId,
            position: tag.position,
          })
          .run()
      }
    }
  }

  // ============================================
  // Perspectives sync
  // ============================================

  private async pushPerspectives(): Promise<void> {
    const localPerspectives = this.localDb
      .select()
      .from(perspectives)
      .where(eq(perspectives.userId, this.userId))
      .all()

    for (const perspective of localPerspectives) {
      await this.prisma.perspective.upsert({
        where: { id: perspective.id },
        create: {
          id: perspective.id,
          userId: this.userId,
          name: perspective.name,
          icon: perspective.icon,
          color: perspective.color,
          filters: perspective.filters ? JSON.parse(perspective.filters) : {},
          viewType: (perspective.viewType as 'list' | 'kanban' | 'mindmap') || 'list',
          sortBy: perspective.sortBy || 'date',
          sortOrder: (perspective.sortOrder as 'asc' | 'desc') || 'desc',
          position: perspective.position || 0,
        },
        update: {
          name: perspective.name,
          icon: perspective.icon,
          color: perspective.color,
          filters: perspective.filters ? JSON.parse(perspective.filters) : {},
          viewType: (perspective.viewType as 'list' | 'kanban' | 'mindmap') || 'list',
          sortBy: perspective.sortBy || 'date',
          sortOrder: (perspective.sortOrder as 'asc' | 'desc') || 'desc',
          position: perspective.position || 0,
        },
      })
    }
  }

  private async pullPerspectives(): Promise<void> {
    const cloudPerspectives = await this.prisma.perspective.findMany({
      where: { userId: this.userId },
    })

    for (const perspective of cloudPerspectives) {
      const exists = this.localDb.select().from(perspectives).where(eq(perspectives.id, perspective.id)).get()

      const data = {
        name: perspective.name,
        icon: perspective.icon,
        color: perspective.color,
        filters: JSON.stringify(perspective.filters),
        viewType: perspective.viewType as 'list' | 'kanban' | 'mindmap',
        sortBy: perspective.sortBy,
        sortOrder: perspective.sortOrder as 'asc' | 'desc',
        position: perspective.position,
      }

      if (exists) {
        this.localDb.update(perspectives).set(data).where(eq(perspectives.id, perspective.id)).run()
      } else {
        this.localDb
          .insert(perspectives)
          .values({
            id: perspective.id,
            userId: this.userId,
            ...data,
          })
          .run()
      }
    }
  }

  // ============================================
  // Thread metadata sync (AI results, etc.)
  // ============================================

  private async pushThreadMetadata(): Promise<void> {
    const localMetadata = this.localDb.select().from(threadAiMetadata).all()

    for (const metadata of localMetadata) {
      // Check if thread exists in cloud
      const cloudThread = await this.prisma.thread.findUnique({
        where: { id: metadata.threadId },
      })

      if (!cloudThread) {
        continue // Skip if thread doesn't exist in cloud
      }

      await this.prisma.threadAIMetadata.upsert({
        where: { threadId: metadata.threadId },
        create: {
          id: metadata.id,
          threadId: metadata.threadId,
          category: metadata.category,
          categoryConfidence: metadata.categoryConfidence,
          priorityScore: metadata.priorityScore,
          priorityReason: metadata.priorityReason,
          summary: metadata.summary,
          actionItems: metadata.actionItems ? JSON.parse(metadata.actionItems) : null,
          extractedDates: metadata.extractedDates ? JSON.parse(metadata.extractedDates) : null,
          extractedAmounts: metadata.extractedAmounts ? JSON.parse(metadata.extractedAmounts) : null,
          extractedContacts: metadata.extractedContacts ? JSON.parse(metadata.extractedContacts) : null,
          suggestedReply: metadata.suggestedReply,
          processedAt: metadata.processedAt ? new Date(metadata.processedAt) : null,
        },
        update: {
          category: metadata.category,
          categoryConfidence: metadata.categoryConfidence,
          priorityScore: metadata.priorityScore,
          priorityReason: metadata.priorityReason,
          summary: metadata.summary,
          actionItems: metadata.actionItems ? JSON.parse(metadata.actionItems) : null,
          extractedDates: metadata.extractedDates ? JSON.parse(metadata.extractedDates) : null,
          extractedAmounts: metadata.extractedAmounts ? JSON.parse(metadata.extractedAmounts) : null,
          extractedContacts: metadata.extractedContacts ? JSON.parse(metadata.extractedContacts) : null,
          suggestedReply: metadata.suggestedReply,
          processedAt: metadata.processedAt ? new Date(metadata.processedAt) : null,
        },
      })
    }
  }

  private async pullThreadMetadata(): Promise<void> {
    // Get all thread IDs from local database
    const localThreads = this.localDb.select({ id: threads.id }).from(threads).all()
    const localThreadIds = new Set(localThreads.map((t) => t.id))

    // Fetch metadata for local threads from cloud
    const cloudMetadata = await this.prisma.threadAIMetadata.findMany({
      where: {
        threadId: { in: Array.from(localThreadIds) },
      },
    })

    for (const metadata of cloudMetadata) {
      const exists = this.localDb
        .select()
        .from(threadAiMetadata)
        .where(eq(threadAiMetadata.threadId, metadata.threadId))
        .get()

      const data = {
        category: metadata.category,
        categoryConfidence: metadata.categoryConfidence,
        priorityScore: metadata.priorityScore,
        priorityReason: metadata.priorityReason,
        summary: metadata.summary,
        actionItems: metadata.actionItems ? JSON.stringify(metadata.actionItems) : null,
        extractedDates: metadata.extractedDates ? JSON.stringify(metadata.extractedDates) : null,
        extractedAmounts: metadata.extractedAmounts ? JSON.stringify(metadata.extractedAmounts) : null,
        extractedContacts: metadata.extractedContacts ? JSON.stringify(metadata.extractedContacts) : null,
        suggestedReply: metadata.suggestedReply,
        processedAt: metadata.processedAt?.toISOString(),
      }

      if (exists) {
        this.localDb.update(threadAiMetadata).set(data).where(eq(threadAiMetadata.threadId, metadata.threadId)).run()
      } else {
        this.localDb
          .insert(threadAiMetadata)
          .values({
            id: metadata.id,
            threadId: metadata.threadId,
            ...data,
          })
          .run()
      }
    }
  }
}
