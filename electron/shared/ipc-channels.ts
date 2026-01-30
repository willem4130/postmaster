export const IPC_CHANNELS = {
  // Accounts
  ACCOUNTS_LIST: 'accounts:list',
  ACCOUNTS_ADD: 'accounts:add',
  ACCOUNTS_UPDATE: 'accounts:update',
  ACCOUNTS_DELETE: 'accounts:delete',

  // Threads
  THREADS_LIST: 'threads:list',
  THREAD_GET: 'thread:get',
  THREAD_UPDATE: 'thread:update',

  // Emails
  EMAIL_MARK_READ: 'email:mark-read',
  EMAIL_STAR: 'email:star',
  EMAIL_SEND: 'email:send',
  EMAIL_DELETE: 'email:delete',
  EMAIL_ARCHIVE: 'email:archive',
  EMAIL_MOVE: 'email:move',

  // Search
  SEARCH: 'search',
  SEARCH_ADVANCED: 'search:advanced',

  // Tags
  TAGS_LIST: 'tags:list',
  TAGS_CREATE: 'tags:create',
  TAGS_UPDATE: 'tags:update',
  TAGS_DELETE: 'tags:delete',
  TAGS_ASSIGN: 'tags:assign',
  TAGS_REMOVE: 'tags:remove',

  // Perspectives
  PERSPECTIVES_LIST: 'perspectives:list',
  PERSPECTIVES_CREATE: 'perspectives:create',
  PERSPECTIVES_UPDATE: 'perspectives:update',
  PERSPECTIVES_DELETE: 'perspectives:delete',

  // Sync
  SYNC_ACCOUNT: 'sync:account',
  SYNC_ALL: 'sync:all',
  SYNC_STATUS: 'sync:status',

  // AI
  AI_CATEGORIZE: 'ai:categorize',
  AI_SUMMARIZE: 'ai:summarize',
  AI_PRIORITY: 'ai:priority',
  AI_EXTRACT_ENTITIES: 'ai:extract-entities',
  AI_SUGGEST_REPLY: 'ai:suggest-reply',

  // OAuth
  OAUTH_START_MICROSOFT: 'oauth:start:microsoft',
  OAUTH_CALLBACK_MICROSOFT: 'oauth:callback:microsoft',
  OAUTH_START_GOOGLE: 'oauth:start:google',
  OAUTH_CALLBACK_GOOGLE: 'oauth:callback:google',

  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_UPDATE: 'settings:update',

  // Notifications
  NOTIFICATION_SHOW: 'notification:show',
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
