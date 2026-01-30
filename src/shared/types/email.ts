export type AccountProvider = 'MICROSOFT_365' | 'MICROSOFT_PERSONAL' | 'GMAIL' | 'IMAP'
export type SyncStatus = 'NEVER_SYNCED' | 'SYNCING' | 'SYNCED' | 'ERROR'
export type FolderType = 'INBOX' | 'SENT' | 'DRAFTS' | 'TRASH' | 'SPAM' | 'ARCHIVE' | 'CUSTOM'

export interface Account {
  id: string
  userId?: string | null
  provider: AccountProvider
  email: string
  displayName?: string | null
  accessToken?: string | null
  refreshToken?: string | null
  tokenExpiresAt?: string | null
  imapHost?: string | null
  imapPort?: number | null
  imapUsername?: string | null
  imapPassword?: string | null
  smtpHost?: string | null
  smtpPort?: number | null
  smtpUsername?: string | null
  smtpPassword?: string | null
  lastSyncAt?: string | null
  syncCursor?: string | null
  syncStatus?: SyncStatus | null
  color?: string | null
  isActive?: boolean | null
  position?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface Folder {
  id: string
  accountId: string
  externalId: string
  name: string
  displayName?: string | null
  type?: FolderType | null
  parentId?: string | null
  totalCount?: number | null
  unreadCount?: number | null
  position?: number | null
}

export interface Thread {
  id: string
  externalId: string
  accountId: string
  subject: string
  snippet?: string | null
  participantEmails?: string | null // JSON array
  inboxStatus?: boolean | null
  sentStatus?: boolean | null
  draftStatus?: boolean | null
  starredStatus?: boolean | null
  archivedStatus?: boolean | null
  trashedStatus?: boolean | null
  spamStatus?: boolean | null
  unreadCount?: number | null
  messageCount?: number | null
  hasAttachments?: boolean | null
  lastMessageAt: string
  createdAt?: string | null
  updatedAt?: string | null
}

export interface Email {
  id: string
  externalId: string
  threadId: string
  accountId: string
  fromAddress: string
  fromName?: string | null
  toAddresses?: string | null // JSON array
  ccAddresses?: string | null // JSON array
  bccAddresses?: string | null // JSON array
  replyToAddresses?: string | null // JSON array
  subject: string
  bodyText?: string | null
  bodyHtml?: string | null
  snippet?: string | null
  messageId?: string | null
  inReplyTo?: string | null
  references?: string | null
  isRead?: boolean | null
  isStarred?: boolean | null
  isDraft?: boolean | null
  isDeleted?: boolean | null
  sentAt: string
  receivedAt: string
  createdAt?: string | null
}

export interface Attachment {
  id: string
  emailId: string
  externalId?: string | null
  filename: string
  contentType?: string | null
  size?: number | null
  contentId?: string | null
  isInline?: boolean | null
  localPath?: string | null
}

export interface Tag {
  id: string
  userId?: string | null
  name: string
  color?: string | null
  icon?: string | null
  parentId?: string | null
  position?: number | null
  createdAt?: string | null
}

export interface Perspective {
  id: string
  userId?: string | null
  name: string
  icon?: string | null
  color?: string | null
  filters?: string | null // JSON
  viewType?: 'list' | 'kanban' | 'mindmap' | null
  sortBy?: string | null
  sortOrder?: 'asc' | 'desc' | null
  position?: number | null
  createdAt?: string | null
  updatedAt?: string | null
}

export interface ThreadAIMetadata {
  id: string
  threadId: string
  category?: string | null
  categoryConfidence?: number | null
  priorityScore?: number | null
  priorityReason?: string | null
  summary?: string | null
  actionItems?: string | null // JSON array
  extractedDates?: string | null // JSON array
  extractedAmounts?: string | null // JSON array
  extractedContacts?: string | null // JSON array
  suggestedReply?: string | null
  processedAt?: string | null
  updatedAt?: string | null
}

export interface EmailAddress {
  address: string
  name?: string
}

export interface ParsedAddressList {
  value: EmailAddress[]
}

export function parseAddresses(json: string | null | undefined): EmailAddress[] {
  if (!json) return []
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}

export function parseParticipants(json: string | null | undefined): string[] {
  if (!json) return []
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}
