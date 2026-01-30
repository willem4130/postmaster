import Database from 'better-sqlite3'
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import * as schema from './schema'

let db: BetterSQLite3Database<typeof schema> | null = null
let sqlite: Database.Database | null = null

function getDatabasePath(): string {
  const userDataPath = app.getPath('userData')
  const dbDir = join(userDataPath, 'data')

  // Ensure directory exists
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  return join(dbDir, 'postmaster.db')
}

export async function initDatabase(): Promise<BetterSQLite3Database<typeof schema>> {
  if (db) return db

  const dbPath = getDatabasePath()
  console.log('Initializing database at:', dbPath)

  sqlite = new Database(dbPath)

  // Enable WAL mode for better performance
  sqlite.pragma('journal_mode = WAL')
  sqlite.pragma('synchronous = NORMAL')
  sqlite.pragma('cache_size = -64000') // 64MB cache
  sqlite.pragma('temp_store = MEMORY')

  db = drizzle(sqlite, { schema })

  // Create tables if they don't exist
  await runMigrations(sqlite)

  return db
}

async function runMigrations(sqlite: Database.Database): Promise<void> {
  // Create accounts table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      provider TEXT NOT NULL CHECK(provider IN ('MICROSOFT_365', 'MICROSOFT_PERSONAL', 'GMAIL', 'IMAP')),
      email TEXT NOT NULL,
      display_name TEXT,
      access_token TEXT,
      refresh_token TEXT,
      token_expires_at TEXT,
      imap_host TEXT,
      imap_port INTEGER,
      imap_username TEXT,
      imap_password TEXT,
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_username TEXT,
      smtp_password TEXT,
      last_sync_at TEXT,
      sync_cursor TEXT,
      sync_status TEXT DEFAULT 'NEVER_SYNCED' CHECK(sync_status IN ('NEVER_SYNCED', 'SYNCING', 'SYNCED', 'ERROR')),
      color TEXT DEFAULT '#6366f1',
      is_active INTEGER DEFAULT 1,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create folders table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      external_id TEXT NOT NULL,
      name TEXT NOT NULL,
      display_name TEXT,
      type TEXT DEFAULT 'CUSTOM' CHECK(type IN ('INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'ARCHIVE', 'CUSTOM')),
      parent_id TEXT,
      total_count INTEGER DEFAULT 0,
      unread_count INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0
    )
  `)

  // Create threads table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS threads (
      id TEXT PRIMARY KEY,
      external_id TEXT NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      snippet TEXT,
      participant_emails TEXT,
      inbox_status INTEGER DEFAULT 1,
      sent_status INTEGER DEFAULT 0,
      draft_status INTEGER DEFAULT 0,
      starred_status INTEGER DEFAULT 0,
      archived_status INTEGER DEFAULT 0,
      trashed_status INTEGER DEFAULT 0,
      spam_status INTEGER DEFAULT 0,
      unread_count INTEGER DEFAULT 0,
      message_count INTEGER DEFAULT 1,
      has_attachments INTEGER DEFAULT 0,
      last_message_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create indexes for threads
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_threads_account ON threads(account_id);
    CREATE INDEX IF NOT EXISTS idx_threads_last_message ON threads(last_message_at DESC);
    CREATE INDEX IF NOT EXISTS idx_threads_inbox ON threads(inbox_status);
    CREATE INDEX IF NOT EXISTS idx_threads_starred ON threads(starred_status);
  `)

  // Create emails table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS emails (
      id TEXT PRIMARY KEY,
      external_id TEXT NOT NULL,
      thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      from_address TEXT NOT NULL,
      from_name TEXT,
      to_addresses TEXT,
      cc_addresses TEXT,
      bcc_addresses TEXT,
      reply_to_addresses TEXT,
      subject TEXT NOT NULL,
      body_text TEXT,
      body_html TEXT,
      snippet TEXT,
      message_id TEXT,
      in_reply_to TEXT,
      "references" TEXT,
      is_read INTEGER DEFAULT 0,
      is_starred INTEGER DEFAULT 0,
      is_draft INTEGER DEFAULT 0,
      is_deleted INTEGER DEFAULT 0,
      sent_at TEXT NOT NULL,
      received_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create indexes for emails
  sqlite.exec(`
    CREATE INDEX IF NOT EXISTS idx_emails_thread ON emails(thread_id);
    CREATE INDEX IF NOT EXISTS idx_emails_account ON emails(account_id);
    CREATE INDEX IF NOT EXISTS idx_emails_sent ON emails(sent_at DESC);
  `)

  // Create attachments table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS attachments (
      id TEXT PRIMARY KEY,
      email_id TEXT NOT NULL REFERENCES emails(id) ON DELETE CASCADE,
      external_id TEXT,
      filename TEXT NOT NULL,
      content_type TEXT,
      size INTEGER DEFAULT 0,
      content_id TEXT,
      is_inline INTEGER DEFAULT 0,
      local_path TEXT
    )
  `)

  // Create tags table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6366f1',
      icon TEXT,
      parent_id TEXT,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create thread_tags table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS thread_tags (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(thread_id, tag_id)
    )
  `)

  // Create thread_ai_metadata table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS thread_ai_metadata (
      id TEXT PRIMARY KEY,
      thread_id TEXT NOT NULL UNIQUE REFERENCES threads(id) ON DELETE CASCADE,
      category TEXT,
      category_confidence REAL,
      priority_score INTEGER,
      priority_reason TEXT,
      summary TEXT,
      action_items TEXT,
      extracted_dates TEXT,
      extracted_amounts TEXT,
      extracted_contacts TEXT,
      suggested_reply TEXT,
      processed_at TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create perspectives table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS perspectives (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT,
      filters TEXT,
      view_type TEXT DEFAULT 'list' CHECK(view_type IN ('list', 'kanban', 'mindmap')),
      sort_by TEXT DEFAULT 'date',
      sort_order TEXT DEFAULT 'desc' CHECK(sort_order IN ('asc', 'desc')),
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create rules table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      conditions TEXT NOT NULL,
      actions TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      last_triggered_at TEXT,
      trigger_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create settings table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Create sync_queue table
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      operation TEXT NOT NULL CHECK(operation IN ('CREATE', 'UPDATE', 'DELETE', 'MOVE', 'MARK_READ', 'MARK_UNREAD', 'STAR', 'UNSTAR', 'ARCHIVE', 'TRASH')),
      entity_type TEXT NOT NULL CHECK(entity_type IN ('EMAIL', 'THREAD', 'FOLDER')),
      entity_id TEXT NOT NULL,
      payload TEXT,
      status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
      retry_count INTEGER DEFAULT 0,
      last_error TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      processed_at TEXT
    )
  `)

  // Create FTS5 table for full-text search
  sqlite.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS emails_fts USING fts5(
      subject,
      body_text,
      from_address,
      from_name,
      content='emails',
      content_rowid='rowid'
    )
  `)

  // Create triggers to keep FTS in sync
  sqlite.exec(`
    CREATE TRIGGER IF NOT EXISTS emails_ai AFTER INSERT ON emails BEGIN
      INSERT INTO emails_fts(rowid, subject, body_text, from_address, from_name)
      VALUES (NEW.rowid, NEW.subject, NEW.body_text, NEW.from_address, NEW.from_name);
    END;

    CREATE TRIGGER IF NOT EXISTS emails_ad AFTER DELETE ON emails BEGIN
      INSERT INTO emails_fts(emails_fts, rowid, subject, body_text, from_address, from_name)
      VALUES ('delete', OLD.rowid, OLD.subject, OLD.body_text, OLD.from_address, OLD.from_name);
    END;

    CREATE TRIGGER IF NOT EXISTS emails_au AFTER UPDATE ON emails BEGIN
      INSERT INTO emails_fts(emails_fts, rowid, subject, body_text, from_address, from_name)
      VALUES ('delete', OLD.rowid, OLD.subject, OLD.body_text, OLD.from_address, OLD.from_name);
      INSERT INTO emails_fts(rowid, subject, body_text, from_address, from_name)
      VALUES (NEW.rowid, NEW.subject, NEW.body_text, NEW.from_address, NEW.from_name);
    END;
  `)

  console.log('Database migrations completed')
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function closeDatabase(): void {
  if (sqlite) {
    sqlite.close()
    sqlite = null
    db = null
  }
}
