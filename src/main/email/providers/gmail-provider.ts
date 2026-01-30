import { google, gmail_v1 } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'
import { BaseEmailProvider, type SendEmailParams, type FolderInfo, type SyncResult } from './base-provider'
import type { Account } from '../../database/schema'

const GOOGLE_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3847/auth/google/callback',
  scopes: [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
  ],
}

export class GmailProvider extends BaseEmailProvider {
  private gmail: gmail_v1.Gmail | null = null
  private oauth2Client: OAuth2Client

  constructor(account?: Account) {
    super(account)
    this.oauth2Client = new OAuth2Client(
      GOOGLE_CONFIG.clientId,
      GOOGLE_CONFIG.clientSecret,
      GOOGLE_CONFIG.redirectUri
    )
  }

  async connect(): Promise<void> {
    if (!this.account?.accessToken) {
      throw new Error('No access token available')
    }

    this.oauth2Client.setCredentials({
      access_token: this.account.accessToken,
      refresh_token: this.account.refreshToken || undefined,
    })

    // Check if token is expired and refresh if needed
    if (this.account.tokenExpiresAt && new Date(this.account.tokenExpiresAt) <= new Date()) {
      if (this.account.refreshToken) {
        const { credentials } = await this.oauth2Client.refreshAccessToken()
        this.oauth2Client.setCredentials(credentials)
      }
    }

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
  }

  async disconnect(): Promise<void> {
    this.gmail = null
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_CONFIG.scopes,
      prompt: 'consent',
    })
  }

  async handleCallback(code: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresAt: Date
    email: string
    displayName?: string
  }> {
    const { tokens } = await this.oauth2Client.getToken(code)
    this.oauth2Client.setCredentials(tokens)

    // Get user info
    const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client })
    const userInfo = await oauth2.userinfo.get()

    return {
      accessToken: tokens.access_token!,
      refreshToken: tokens.refresh_token!,
      expiresAt: new Date(tokens.expiry_date!),
      email: userInfo.data.email!,
      displayName: userInfo.data.name || undefined,
    }
  }

  async performInitialSync(): Promise<SyncResult> {
    if (!this.gmail) throw new Error('Not connected')

    const threads: SyncResult['threads'] = []

    // Get list of threads in inbox
    const listResponse = await this.gmail.users.threads.list({
      userId: 'me',
      labelIds: ['INBOX'],
      maxResults: 100,
    })

    const threadIds = listResponse.data.threads || []

    // Fetch full thread data
    for (const threadRef of threadIds) {
      if (!threadRef.id) continue

      const threadResponse = await this.gmail.users.threads.get({
        userId: 'me',
        id: threadRef.id,
        format: 'full',
      })

      const gmailThread = threadResponse.data
      if (!gmailThread.messages?.length) continue

      const threadId = this.generateId()
      const messages = gmailThread.messages

      // Process messages
      const emailRecords = messages.map((msg) => this.parseGmailMessage(msg, threadId))

      const latestMessage = emailRecords[emailRecords.length - 1]
      const hasAttachments = messages.some(
        (msg) => msg.payload?.parts?.some((part) => part.filename && part.filename.length > 0)
      )

      const thread = {
        id: threadId,
        externalId: gmailThread.id!,
        accountId: this.account!.id,
        subject: latestMessage.subject,
        snippet: gmailThread.snippet || '',
        participantEmails: JSON.stringify(this.extractParticipantsFromEmails(emailRecords)),
        inboxStatus: this.hasLabel(messages, 'INBOX'),
        sentStatus: this.hasLabel(messages, 'SENT'),
        draftStatus: this.hasLabel(messages, 'DRAFT'),
        starredStatus: this.hasLabel(messages, 'STARRED'),
        archivedStatus: !this.hasLabel(messages, 'INBOX') && !this.hasLabel(messages, 'TRASH'),
        trashedStatus: this.hasLabel(messages, 'TRASH'),
        spamStatus: this.hasLabel(messages, 'SPAM'),
        unreadCount: messages.filter((m) => this.hasLabel([m], 'UNREAD')).length,
        messageCount: messages.length,
        hasAttachments,
        lastMessageAt: latestMessage.receivedAt,
      }

      threads.push({ thread, emails: emailRecords })
    }

    // Get history ID for incremental sync
    const profile = await this.gmail.users.getProfile({ userId: 'me' })
    const newCursor = profile.data.historyId || ''

    return {
      threads,
      newCursor,
      hasMore: !!listResponse.data.nextPageToken,
    }
  }

  async performIncrementalSync(cursor: string): Promise<SyncResult> {
    if (!this.gmail) throw new Error('Not connected')

    const threads: SyncResult['threads'] = []
    const deletedThreadIds: string[] = []

    try {
      // Get history since last sync
      const historyResponse = await this.gmail.users.history.list({
        userId: 'me',
        startHistoryId: cursor,
        historyTypes: ['messageAdded', 'messageDeleted', 'labelAdded', 'labelRemoved'],
      })

      const history = historyResponse.data.history || []

      // Collect affected thread IDs
      const affectedThreadIds = new Set<string>()

      for (const record of history) {
        // Messages added
        for (const added of record.messagesAdded || []) {
          if (added.message?.threadId) {
            affectedThreadIds.add(added.message.threadId)
          }
        }

        // Messages deleted
        for (const deleted of record.messagesDeleted || []) {
          if (deleted.message?.threadId) {
            affectedThreadIds.add(deleted.message.threadId)
          }
        }

        // Label changes
        for (const labelAdded of record.labelsAdded || []) {
          if (labelAdded.message?.threadId) {
            affectedThreadIds.add(labelAdded.message.threadId)
          }
        }

        for (const labelRemoved of record.labelsRemoved || []) {
          if (labelRemoved.message?.threadId) {
            affectedThreadIds.add(labelRemoved.message.threadId)
          }
        }
      }

      // Fetch updated threads
      for (const gmailThreadId of affectedThreadIds) {
        try {
          const threadResponse = await this.gmail.users.threads.get({
            userId: 'me',
            id: gmailThreadId,
            format: 'full',
          })

          const gmailThread = threadResponse.data
          if (!gmailThread.messages?.length) continue

          const threadId = this.generateId()
          const messages = gmailThread.messages

          const emailRecords = messages.map((msg) => this.parseGmailMessage(msg, threadId))

          const latestMessage = emailRecords[emailRecords.length - 1]
          const hasAttachments = messages.some(
            (msg) => msg.payload?.parts?.some((part) => part.filename && part.filename.length > 0)
          )

          const thread = {
            id: threadId,
            externalId: gmailThread.id!,
            accountId: this.account!.id,
            subject: latestMessage.subject,
            snippet: gmailThread.snippet || '',
            participantEmails: JSON.stringify(this.extractParticipantsFromEmails(emailRecords)),
            inboxStatus: this.hasLabel(messages, 'INBOX'),
            sentStatus: this.hasLabel(messages, 'SENT'),
            draftStatus: this.hasLabel(messages, 'DRAFT'),
            starredStatus: this.hasLabel(messages, 'STARRED'),
            archivedStatus: !this.hasLabel(messages, 'INBOX') && !this.hasLabel(messages, 'TRASH'),
            trashedStatus: this.hasLabel(messages, 'TRASH'),
            spamStatus: this.hasLabel(messages, 'SPAM'),
            unreadCount: messages.filter((m) => this.hasLabel([m], 'UNREAD')).length,
            messageCount: messages.length,
            hasAttachments,
            lastMessageAt: latestMessage.receivedAt,
          }

          threads.push({ thread, emails: emailRecords })
        } catch (error: any) {
          // Thread was deleted
          if (error.code === 404) {
            deletedThreadIds.push(gmailThreadId)
          }
        }
      }

      return {
        threads,
        newCursor: historyResponse.data.historyId || cursor,
        hasMore: false,
        deletedThreadIds,
      }
    } catch (error: any) {
      // History ID is too old, need full sync
      if (error.code === 404) {
        return this.performInitialSync()
      }
      throw error
    }
  }

  private parseGmailMessage(message: gmail_v1.Schema$Message, threadId: string) {
    const headers = message.payload?.headers || []
    const getHeader = (name: string) =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || ''

    const fromRaw = getHeader('From')
    const fromParsed = this.parseEmailAddress(fromRaw)

    // Extract body
    let bodyText = ''
    let bodyHtml = ''

    const extractBody = (part: gmail_v1.Schema$MessagePart) => {
      if (part.mimeType === 'text/plain' && part.body?.data) {
        bodyText = Buffer.from(part.body.data, 'base64').toString('utf-8')
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8')
      }

      for (const subPart of part.parts || []) {
        extractBody(subPart)
      }
    }

    if (message.payload) {
      extractBody(message.payload)
    }

    const internalDate = message.internalDate
      ? new Date(parseInt(message.internalDate)).toISOString()
      : new Date().toISOString()

    return {
      id: this.generateId(),
      externalId: message.id!,
      threadId,
      accountId: this.account!.id,
      fromAddress: fromParsed.address,
      fromName: fromParsed.name || null,
      toAddresses: JSON.stringify(this.parseAddressList(getHeader('To'))),
      ccAddresses: JSON.stringify(this.parseAddressList(getHeader('Cc'))),
      bccAddresses: JSON.stringify(this.parseAddressList(getHeader('Bcc'))),
      replyToAddresses: JSON.stringify(this.parseAddressList(getHeader('Reply-To'))),
      subject: getHeader('Subject') || '(No Subject)',
      bodyText: bodyText || null,
      bodyHtml: bodyHtml || null,
      snippet: message.snippet || null,
      messageId: getHeader('Message-ID') || null,
      inReplyTo: getHeader('In-Reply-To') || null,
      references: getHeader('References') || null,
      isRead: !this.hasLabel([message], 'UNREAD'),
      isStarred: this.hasLabel([message], 'STARRED'),
      isDraft: this.hasLabel([message], 'DRAFT'),
      isDeleted: this.hasLabel([message], 'TRASH'),
      sentAt: internalDate,
      receivedAt: internalDate,
    }
  }

  private parseAddressList(raw: string): { address: string; name?: string }[] {
    if (!raw) return []

    return raw.split(',').map((addr) => {
      const parsed = this.parseEmailAddress(addr.trim())
      return { address: parsed.address, name: parsed.name }
    })
  }

  private hasLabel(messages: gmail_v1.Schema$Message[], label: string): boolean {
    return messages.some((m) => m.labelIds?.includes(label))
  }

  private extractParticipantsFromEmails(emails: { fromAddress: string; toAddresses: string | null }[]): string[] {
    const participants = new Set<string>()

    for (const email of emails) {
      participants.add(email.fromAddress.toLowerCase())

      if (email.toAddresses) {
        try {
          const toList = JSON.parse(email.toAddresses)
          for (const to of toList) {
            if (to.address) {
              participants.add(to.address.toLowerCase())
            }
          }
        } catch {}
      }
    }

    return Array.from(participants)
  }

  async getFolders(): Promise<FolderInfo[]> {
    if (!this.gmail) throw new Error('Not connected')

    const response = await this.gmail.users.labels.list({ userId: 'me' })
    const labels = response.data.labels || []

    const systemLabels: Record<string, FolderInfo['type']> = {
      INBOX: 'INBOX',
      SENT: 'SENT',
      DRAFT: 'DRAFTS',
      TRASH: 'TRASH',
      SPAM: 'SPAM',
    }

    const folders: FolderInfo[] = []

    for (const label of labels) {
      if (!label.id || !label.name) continue

      // Get detailed label info
      const labelDetail = await this.gmail.users.labels.get({
        userId: 'me',
        id: label.id,
      })

      folders.push({
        id: label.id,
        name: label.name.toLowerCase().replace(/\s+/g, '-'),
        displayName: label.name,
        type: systemLabels[label.id] || 'CUSTOM',
        totalCount: labelDetail.data.messagesTotal || 0,
        unreadCount: labelDetail.data.messagesUnread || 0,
      })
    }

    return folders
  }

  async sendMessage(params: SendEmailParams): Promise<string> {
    if (!this.gmail) throw new Error('Not connected')

    // Build raw email
    const boundary = `----=_Part_${Date.now()}`
    const lines: string[] = []

    lines.push(`To: ${params.to.join(', ')}`)
    if (params.cc?.length) {
      lines.push(`Cc: ${params.cc.join(', ')}`)
    }
    if (params.bcc?.length) {
      lines.push(`Bcc: ${params.bcc.join(', ')}`)
    }
    lines.push(`Subject: ${params.subject}`)
    lines.push(`MIME-Version: 1.0`)

    if (params.replyToMessageId) {
      lines.push(`In-Reply-To: ${params.replyToMessageId}`)
      lines.push(`References: ${params.replyToMessageId}`)
    }

    lines.push(`Content-Type: ${params.isHtml ? 'text/html' : 'text/plain'}; charset=utf-8`)
    lines.push('')
    lines.push(params.body)

    const raw = Buffer.from(lines.join('\r\n')).toString('base64url')

    const response = await this.gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw,
        threadId: params.replyToMessageId || undefined,
      },
    })

    return response.data.id || this.generateId()
  }

  async markAsRead(externalIds: string[], isRead: boolean): Promise<void> {
    if (!this.gmail) throw new Error('Not connected')

    for (const id of externalIds) {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: {
          addLabelIds: isRead ? [] : ['UNREAD'],
          removeLabelIds: isRead ? ['UNREAD'] : [],
        },
      })
    }
  }

  async markAsStarred(externalIds: string[], isStarred: boolean): Promise<void> {
    if (!this.gmail) throw new Error('Not connected')

    for (const id of externalIds) {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: {
          addLabelIds: isStarred ? ['STARRED'] : [],
          removeLabelIds: isStarred ? [] : ['STARRED'],
        },
      })
    }
  }

  async moveToFolder(externalIds: string[], folderId: string): Promise<void> {
    if (!this.gmail) throw new Error('Not connected')

    for (const id of externalIds) {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: {
          addLabelIds: [folderId],
          removeLabelIds: ['INBOX'],
        },
      })
    }
  }

  async deleteMessages(externalIds: string[], permanent = false): Promise<void> {
    if (!this.gmail) throw new Error('Not connected')

    for (const id of externalIds) {
      if (permanent) {
        await this.gmail.users.messages.delete({
          userId: 'me',
          id,
        })
      } else {
        await this.gmail.users.messages.trash({
          userId: 'me',
          id,
        })
      }
    }
  }

  async archiveMessages(externalIds: string[]): Promise<void> {
    if (!this.gmail) throw new Error('Not connected')

    for (const id of externalIds) {
      await this.gmail.users.messages.modify({
        userId: 'me',
        id,
        requestBody: {
          removeLabelIds: ['INBOX'],
        },
      })
    }
  }
}
