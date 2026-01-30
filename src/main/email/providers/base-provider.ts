import type { Account, Thread, Email } from '../../database/schema'

export interface SendEmailParams {
  to: string[]
  cc?: string[]
  bcc?: string[]
  subject: string
  body: string
  isHtml?: boolean
  attachments?: AttachmentInput[]
  replyToMessageId?: string
}

export interface AttachmentInput {
  filename: string
  content: Buffer | string
  contentType: string
  isInline?: boolean
  contentId?: string
}

export interface FolderInfo {
  id: string
  name: string
  displayName: string
  type: 'INBOX' | 'SENT' | 'DRAFTS' | 'TRASH' | 'SPAM' | 'ARCHIVE' | 'CUSTOM'
  parentId?: string
  totalCount: number
  unreadCount: number
}

export interface SyncResult {
  threads: Array<{
    thread: Omit<Thread, 'createdAt' | 'updatedAt'>
    emails: Array<Omit<Email, 'createdAt'>>
  }>
  newCursor: string
  hasMore: boolean
  deletedThreadIds?: string[]
}

export interface EmailAddress {
  address: string
  name?: string
}

export abstract class BaseEmailProvider {
  protected account?: Account

  constructor(account?: Account) {
    this.account = account
  }

  abstract connect(): Promise<void>
  abstract disconnect(): Promise<void>

  // Sync operations
  abstract performInitialSync(): Promise<SyncResult>
  abstract performIncrementalSync(cursor: string): Promise<SyncResult>

  // Folder operations
  abstract getFolders(): Promise<FolderInfo[]>

  // Email operations
  abstract sendMessage(params: SendEmailParams): Promise<string>
  abstract markAsRead(externalIds: string[], isRead: boolean): Promise<void>
  abstract markAsStarred(externalIds: string[], isStarred: boolean): Promise<void>
  abstract moveToFolder(externalIds: string[], folderId: string): Promise<void>
  abstract deleteMessages(externalIds: string[], permanent?: boolean): Promise<void>
  abstract archiveMessages(externalIds: string[]): Promise<void>

  // OAuth (optional, only for OAuth providers)
  getAuthUrl?(): string
  handleCallback?(code: string): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date; email: string; displayName?: string }>

  // Utility methods
  protected generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  }

  protected parseEmailAddress(raw: string): EmailAddress {
    const match = raw.match(/^(?:"?([^"]*)"?\s)?<?([^>]+)>?$/)
    if (match) {
      return {
        name: match[1]?.trim(),
        address: match[2].trim().toLowerCase(),
      }
    }
    return { address: raw.trim().toLowerCase() }
  }

  protected formatEmailAddress(address: EmailAddress): string {
    if (address.name) {
      return `"${address.name}" <${address.address}>`
    }
    return address.address
  }
}
