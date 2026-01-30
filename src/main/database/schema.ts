import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// ============================================
// Accounts
// ============================================
export const accounts = sqliteTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  provider: text('provider', {
    enum: ['MICROSOFT_365', 'MICROSOFT_PERSONAL', 'GMAIL', 'IMAP'],
  }).notNull(),
  email: text('email').notNull(),
  displayName: text('display_name'),

  // OAuth tokens
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: text('token_expires_at'),

  // IMAP credentials
  imapHost: text('imap_host'),
  imapPort: integer('imap_port'),
  imapUsername: text('imap_username'),
  imapPassword: text('imap_password'),
  smtpHost: text('smtp_host'),
  smtpPort: integer('smtp_port'),
  smtpUsername: text('smtp_username'),
  smtpPassword: text('smtp_password'),

  // Sync state
  lastSyncAt: text('last_sync_at'),
  syncCursor: text('sync_cursor'),
  syncStatus: text('sync_status', {
    enum: ['NEVER_SYNCED', 'SYNCING', 'SYNCED', 'ERROR'],
  }).default('NEVER_SYNCED'),

  // Settings
  color: text('color').default('#6366f1'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  position: integer('position').default(0),

  createdAt: text('created_at').default(new Date().toISOString()),
  updatedAt: text('updated_at').default(new Date().toISOString()),
})

// ============================================
// Folders
// ============================================
export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  externalId: text('external_id').notNull(),
  name: text('name').notNull(),
  displayName: text('display_name'),
  type: text('type', {
    enum: ['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'ARCHIVE', 'CUSTOM'],
  }).default('CUSTOM'),
  parentId: text('parent_id'),
  totalCount: integer('total_count').default(0),
  unreadCount: integer('unread_count').default(0),
  position: integer('position').default(0),
})

// ============================================
// Threads
// ============================================
export const threads = sqliteTable('threads', {
  id: text('id').primaryKey(),
  externalId: text('external_id').notNull(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  subject: text('subject').notNull(),
  snippet: text('snippet'),
  participantEmails: text('participant_emails'), // JSON array

  // Status flags
  inboxStatus: integer('inbox_status', { mode: 'boolean' }).default(true),
  sentStatus: integer('sent_status', { mode: 'boolean' }).default(false),
  draftStatus: integer('draft_status', { mode: 'boolean' }).default(false),
  starredStatus: integer('starred_status', { mode: 'boolean' }).default(false),
  archivedStatus: integer('archived_status', { mode: 'boolean' }).default(false),
  trashedStatus: integer('trashed_status', { mode: 'boolean' }).default(false),
  spamStatus: integer('spam_status', { mode: 'boolean' }).default(false),

  // Computed
  unreadCount: integer('unread_count').default(0),
  messageCount: integer('message_count').default(1),
  hasAttachments: integer('has_attachments', { mode: 'boolean' }).default(false),
  lastMessageAt: text('last_message_at').notNull(),

  createdAt: text('created_at').default(new Date().toISOString()),
  updatedAt: text('updated_at').default(new Date().toISOString()),
})

// ============================================
// Emails
// ============================================
export const emails = sqliteTable('emails', {
  id: text('id').primaryKey(),
  externalId: text('external_id').notNull(),
  threadId: text('thread_id')
    .notNull()
    .references(() => threads.id, { onDelete: 'cascade' }),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),

  // Addresses
  fromAddress: text('from_address').notNull(),
  fromName: text('from_name'),
  toAddresses: text('to_addresses'), // JSON array
  ccAddresses: text('cc_addresses'), // JSON array
  bccAddresses: text('bcc_addresses'), // JSON array
  replyToAddresses: text('reply_to_addresses'), // JSON array

  // Content
  subject: text('subject').notNull(),
  bodyText: text('body_text'),
  bodyHtml: text('body_html'),
  snippet: text('snippet'),

  // Headers
  messageId: text('message_id'),
  inReplyTo: text('in_reply_to'),
  references: text('references'), // JSON array

  // Status
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  isStarred: integer('is_starred', { mode: 'boolean' }).default(false),
  isDraft: integer('is_draft', { mode: 'boolean' }).default(false),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),

  // Timestamps
  sentAt: text('sent_at').notNull(),
  receivedAt: text('received_at').notNull(),
  createdAt: text('created_at').default(new Date().toISOString()),
})

// ============================================
// Attachments
// ============================================
export const attachments = sqliteTable('attachments', {
  id: text('id').primaryKey(),
  emailId: text('email_id')
    .notNull()
    .references(() => emails.id, { onDelete: 'cascade' }),
  externalId: text('external_id'),
  filename: text('filename').notNull(),
  contentType: text('content_type'),
  size: integer('size').default(0),
  contentId: text('content_id'),
  isInline: integer('is_inline', { mode: 'boolean' }).default(false),
  localPath: text('local_path'),
})

// ============================================
// Tags
// ============================================
export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  color: text('color').default('#6366f1'),
  icon: text('icon'),
  parentId: text('parent_id'),
  position: integer('position').default(0),
  createdAt: text('created_at').default(new Date().toISOString()),
})

// ============================================
// Thread Tags (many-to-many)
// ============================================
export const threadTags = sqliteTable('thread_tags', {
  id: text('id').primaryKey(),
  threadId: text('thread_id')
    .notNull()
    .references(() => threads.id, { onDelete: 'cascade' }),
  tagId: text('tag_id')
    .notNull()
    .references(() => tags.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default(new Date().toISOString()),
})

// ============================================
// Thread AI Metadata
// ============================================
export const threadAiMetadata = sqliteTable('thread_ai_metadata', {
  id: text('id').primaryKey(),
  threadId: text('thread_id')
    .notNull()
    .unique()
    .references(() => threads.id, { onDelete: 'cascade' }),

  // AI-generated
  category: text('category'),
  categoryConfidence: real('category_confidence'),
  priorityScore: integer('priority_score'),
  priorityReason: text('priority_reason'),
  summary: text('summary'),
  actionItems: text('action_items'), // JSON array
  extractedDates: text('extracted_dates'), // JSON array
  extractedAmounts: text('extracted_amounts'), // JSON array
  extractedContacts: text('extracted_contacts'), // JSON array
  suggestedReply: text('suggested_reply'),

  processedAt: text('processed_at'),
  updatedAt: text('updated_at').default(new Date().toISOString()),
})

// ============================================
// Perspectives
// ============================================
export const perspectives = sqliteTable('perspectives', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color'),
  filters: text('filters'), // JSON { accounts: [], tags: [], status: [], etc. }
  viewType: text('view_type', { enum: ['list', 'kanban', 'mindmap'] }).default('list'),
  sortBy: text('sort_by').default('date'),
  sortOrder: text('sort_order', { enum: ['asc', 'desc'] }).default('desc'),
  position: integer('position').default(0),
  createdAt: text('created_at').default(new Date().toISOString()),
  updatedAt: text('updated_at').default(new Date().toISOString()),
})

// ============================================
// Rules
// ============================================
export const rules = sqliteTable('rules', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  name: text('name').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  conditions: text('conditions').notNull(), // JSON { all: [...], any: [...] }
  actions: text('actions').notNull(), // JSON [{ type: "addTag", params: {...} }]
  priority: integer('priority').default(0),
  lastTriggeredAt: text('last_triggered_at'),
  triggerCount: integer('trigger_count').default(0),
  createdAt: text('created_at').default(new Date().toISOString()),
  updatedAt: text('updated_at').default(new Date().toISOString()),
})

// ============================================
// Settings
// ============================================
export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  key: text('key').notNull().unique(),
  value: text('value'),
  updatedAt: text('updated_at').default(new Date().toISOString()),
})

// ============================================
// Sync Queue (for offline operations)
// ============================================
export const syncQueue = sqliteTable('sync_queue', {
  id: text('id').primaryKey(),
  accountId: text('account_id')
    .notNull()
    .references(() => accounts.id, { onDelete: 'cascade' }),
  operation: text('operation', {
    enum: ['CREATE', 'UPDATE', 'DELETE', 'MOVE', 'MARK_READ', 'MARK_UNREAD', 'STAR', 'UNSTAR', 'ARCHIVE', 'TRASH'],
  }).notNull(),
  entityType: text('entity_type', { enum: ['EMAIL', 'THREAD', 'FOLDER'] }).notNull(),
  entityId: text('entity_id').notNull(),
  payload: text('payload'), // JSON
  status: text('status', { enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] }).default('PENDING'),
  retryCount: integer('retry_count').default(0),
  lastError: text('last_error'),
  createdAt: text('created_at').default(new Date().toISOString()),
  processedAt: text('processed_at'),
})

// Type exports
export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type Thread = typeof threads.$inferSelect
export type NewThread = typeof threads.$inferInsert
export type Email = typeof emails.$inferSelect
export type NewEmail = typeof emails.$inferInsert
export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
export type Perspective = typeof perspectives.$inferSelect
export type NewPerspective = typeof perspectives.$inferInsert
export type Rule = typeof rules.$inferSelect
export type NewRule = typeof rules.$inferInsert
export type ThreadAiMetadata = typeof threadAiMetadata.$inferSelect
export type NewThreadAiMetadata = typeof threadAiMetadata.$inferInsert
