import { Client } from '@microsoft/microsoft-graph-client'
import { ConfidentialClientApplication, PublicClientApplication } from '@azure/msal-node'
import { BaseEmailProvider, type SendEmailParams, type FolderInfo, type SyncResult } from './base-provider'
import type { Account } from '../../database/schema'

const MICROSOFT_CONFIG = {
  clientId: process.env.MICROSOFT_CLIENT_ID || '',
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || '',
  tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
  redirectUri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:3847/auth/microsoft/callback',
  scopes: [
    'openid',
    'profile',
    'email',
    'offline_access',
    'Mail.ReadWrite',
    'Mail.Send',
    'User.Read',
  ],
}

export class MicrosoftProvider extends BaseEmailProvider {
  private client: Client | null = null
  private msalApp: ConfidentialClientApplication | PublicClientApplication | null = null

  constructor(account?: Account) {
    super(account)
  }

  private getMsalApp(): ConfidentialClientApplication | PublicClientApplication {
    if (this.msalApp) return this.msalApp

    const msalConfig = {
      auth: {
        clientId: MICROSOFT_CONFIG.clientId,
        authority: `https://login.microsoftonline.com/${MICROSOFT_CONFIG.tenantId}`,
        ...(MICROSOFT_CONFIG.clientSecret && { clientSecret: MICROSOFT_CONFIG.clientSecret }),
      },
    }

    this.msalApp = MICROSOFT_CONFIG.clientSecret
      ? new ConfidentialClientApplication(msalConfig)
      : new PublicClientApplication(msalConfig)

    return this.msalApp
  }

  async connect(): Promise<void> {
    if (!this.account?.accessToken) {
      throw new Error('No access token available')
    }

    // Check if token is expired and refresh if needed
    let accessToken = this.account.accessToken
    if (this.account.tokenExpiresAt && new Date(this.account.tokenExpiresAt) <= new Date()) {
      if (this.account.refreshToken) {
        const refreshed = await this.refreshAccessToken(this.account.refreshToken)
        accessToken = refreshed.accessToken
        // Note: In production, update the account with new tokens
      }
    }

    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken)
      },
    })
  }

  async disconnect(): Promise<void> {
    this.client = null
  }

  getAuthUrl(): string {
    const msalApp = this.getMsalApp()
    const authUrl = new URL(`https://login.microsoftonline.com/${MICROSOFT_CONFIG.tenantId}/oauth2/v2.0/authorize`)
    authUrl.searchParams.set('client_id', MICROSOFT_CONFIG.clientId)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('redirect_uri', MICROSOFT_CONFIG.redirectUri)
    authUrl.searchParams.set('scope', MICROSOFT_CONFIG.scopes.join(' '))
    authUrl.searchParams.set('response_mode', 'query')
    authUrl.searchParams.set('prompt', 'consent')

    return authUrl.toString()
  }

  async handleCallback(code: string): Promise<{
    accessToken: string
    refreshToken: string
    expiresAt: Date
    email: string
    displayName?: string
  }> {
    const msalApp = this.getMsalApp()

    const response = await (msalApp as ConfidentialClientApplication).acquireTokenByCode({
      code,
      scopes: MICROSOFT_CONFIG.scopes,
      redirectUri: MICROSOFT_CONFIG.redirectUri,
    })

    if (!response) {
      throw new Error('Failed to acquire token')
    }

    // Get user info
    const tempClient = Client.init({
      authProvider: (done) => {
        done(null, response.accessToken)
      },
    })

    const user = await tempClient.api('/me').get()

    return {
      accessToken: response.accessToken,
      refreshToken: response.account?.homeAccountId || '', // MSAL handles refresh internally
      expiresAt: response.expiresOn || new Date(Date.now() + 3600 * 1000),
      email: user.mail || user.userPrincipalName,
      displayName: user.displayName,
    }
  }

  private async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
    const msalApp = this.getMsalApp()

    // MSAL handles token refresh through silent token acquisition
    const response = await (msalApp as ConfidentialClientApplication).acquireTokenByRefreshToken({
      refreshToken,
      scopes: MICROSOFT_CONFIG.scopes,
    })

    if (!response) {
      throw new Error('Failed to refresh token')
    }

    return {
      accessToken: response.accessToken,
      expiresAt: response.expiresOn || new Date(Date.now() + 3600 * 1000),
    }
  }

  async performInitialSync(): Promise<SyncResult> {
    if (!this.client) throw new Error('Not connected')

    const threads: SyncResult['threads'] = []

    // Fetch messages from inbox using delta query
    const response = await this.client
      .api('/me/mailFolders/inbox/messages/delta')
      .select('id,subject,from,toRecipients,ccRecipients,receivedDateTime,sentDateTime,body,bodyPreview,isRead,flag,hasAttachments,conversationId')
      .top(100)
      .get()

    const messagesByConversation = new Map<string, unknown[]>()

    for (const message of response.value || []) {
      const conversationId = message.conversationId || message.id
      if (!messagesByConversation.has(conversationId)) {
        messagesByConversation.set(conversationId, [])
      }
      messagesByConversation.get(conversationId)!.push(message)
    }

    for (const [conversationId, messages] of messagesByConversation) {
      const sortedMessages = messages.sort(
        (a: any, b: any) => new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime()
      )

      const latestMessage: any = sortedMessages[sortedMessages.length - 1]
      const threadId = this.generateId()

      const thread = {
        id: threadId,
        externalId: conversationId,
        accountId: this.account!.id,
        subject: latestMessage.subject || '(No Subject)',
        snippet: latestMessage.bodyPreview || '',
        participantEmails: JSON.stringify(this.extractParticipants(sortedMessages)),
        inboxStatus: true,
        sentStatus: false,
        draftStatus: false,
        starredStatus: latestMessage.flag?.flagStatus === 'flagged',
        archivedStatus: false,
        trashedStatus: false,
        spamStatus: false,
        unreadCount: sortedMessages.filter((m: any) => !m.isRead).length,
        messageCount: sortedMessages.length,
        hasAttachments: sortedMessages.some((m: any) => m.hasAttachments),
        lastMessageAt: latestMessage.receivedDateTime,
      }

      const emailRecords = sortedMessages.map((msg: any) => ({
        id: this.generateId(),
        externalId: msg.id,
        threadId,
        accountId: this.account!.id,
        fromAddress: msg.from?.emailAddress?.address || '',
        fromName: msg.from?.emailAddress?.name || null,
        toAddresses: JSON.stringify((msg.toRecipients || []).map((r: any) => r.emailAddress)),
        ccAddresses: JSON.stringify((msg.ccRecipients || []).map((r: any) => r.emailAddress)),
        bccAddresses: null,
        replyToAddresses: null,
        subject: msg.subject || '(No Subject)',
        bodyText: msg.body?.contentType === 'text' ? msg.body?.content : null,
        bodyHtml: msg.body?.contentType === 'html' ? msg.body?.content : null,
        snippet: msg.bodyPreview || null,
        messageId: msg.internetMessageId || null,
        inReplyTo: null,
        references: null,
        isRead: msg.isRead || false,
        isStarred: msg.flag?.flagStatus === 'flagged',
        isDraft: false,
        isDeleted: false,
        sentAt: msg.sentDateTime || msg.receivedDateTime,
        receivedAt: msg.receivedDateTime,
      }))

      threads.push({ thread, emails: emailRecords })
    }

    // Get delta link for incremental sync
    let newCursor = ''
    if (response['@odata.deltaLink']) {
      newCursor = response['@odata.deltaLink']
    } else if (response['@odata.nextLink']) {
      newCursor = response['@odata.nextLink']
    }

    return {
      threads,
      newCursor,
      hasMore: !!response['@odata.nextLink'],
    }
  }

  async performIncrementalSync(cursor: string): Promise<SyncResult> {
    if (!this.client) throw new Error('Not connected')

    const threads: SyncResult['threads'] = []
    const deletedThreadIds: string[] = []

    // Use the delta link from previous sync
    const response = await this.client.api(cursor).get()

    const messagesByConversation = new Map<string, unknown[]>()

    for (const message of response.value || []) {
      // Handle deleted messages
      if (message['@removed']) {
        deletedThreadIds.push(message.id)
        continue
      }

      const conversationId = message.conversationId || message.id
      if (!messagesByConversation.has(conversationId)) {
        messagesByConversation.set(conversationId, [])
      }
      messagesByConversation.get(conversationId)!.push(message)
    }

    for (const [conversationId, messages] of messagesByConversation) {
      const sortedMessages = messages.sort(
        (a: any, b: any) => new Date(a.receivedDateTime).getTime() - new Date(b.receivedDateTime).getTime()
      )

      const latestMessage: any = sortedMessages[sortedMessages.length - 1]
      const threadId = this.generateId()

      const thread = {
        id: threadId,
        externalId: conversationId,
        accountId: this.account!.id,
        subject: latestMessage.subject || '(No Subject)',
        snippet: latestMessage.bodyPreview || '',
        participantEmails: JSON.stringify(this.extractParticipants(sortedMessages)),
        inboxStatus: true,
        sentStatus: false,
        draftStatus: false,
        starredStatus: latestMessage.flag?.flagStatus === 'flagged',
        archivedStatus: false,
        trashedStatus: false,
        spamStatus: false,
        unreadCount: sortedMessages.filter((m: any) => !m.isRead).length,
        messageCount: sortedMessages.length,
        hasAttachments: sortedMessages.some((m: any) => m.hasAttachments),
        lastMessageAt: latestMessage.receivedDateTime,
      }

      const emailRecords = sortedMessages.map((msg: any) => ({
        id: this.generateId(),
        externalId: msg.id,
        threadId,
        accountId: this.account!.id,
        fromAddress: msg.from?.emailAddress?.address || '',
        fromName: msg.from?.emailAddress?.name || null,
        toAddresses: JSON.stringify((msg.toRecipients || []).map((r: any) => r.emailAddress)),
        ccAddresses: JSON.stringify((msg.ccRecipients || []).map((r: any) => r.emailAddress)),
        bccAddresses: null,
        replyToAddresses: null,
        subject: msg.subject || '(No Subject)',
        bodyText: msg.body?.contentType === 'text' ? msg.body?.content : null,
        bodyHtml: msg.body?.contentType === 'html' ? msg.body?.content : null,
        snippet: msg.bodyPreview || null,
        messageId: msg.internetMessageId || null,
        inReplyTo: null,
        references: null,
        isRead: msg.isRead || false,
        isStarred: msg.flag?.flagStatus === 'flagged',
        isDraft: false,
        isDeleted: false,
        sentAt: msg.sentDateTime || msg.receivedDateTime,
        receivedAt: msg.receivedDateTime,
      }))

      threads.push({ thread, emails: emailRecords })
    }

    let newCursor = ''
    if (response['@odata.deltaLink']) {
      newCursor = response['@odata.deltaLink']
    } else if (response['@odata.nextLink']) {
      newCursor = response['@odata.nextLink']
    }

    return {
      threads,
      newCursor,
      hasMore: !!response['@odata.nextLink'],
      deletedThreadIds,
    }
  }

  private extractParticipants(messages: unknown[]): string[] {
    const participants = new Set<string>()

    for (const msg of messages as any[]) {
      if (msg.from?.emailAddress?.address) {
        participants.add(msg.from.emailAddress.address.toLowerCase())
      }
      for (const recipient of msg.toRecipients || []) {
        if (recipient.emailAddress?.address) {
          participants.add(recipient.emailAddress.address.toLowerCase())
        }
      }
      for (const recipient of msg.ccRecipients || []) {
        if (recipient.emailAddress?.address) {
          participants.add(recipient.emailAddress.address.toLowerCase())
        }
      }
    }

    return Array.from(participants)
  }

  async getFolders(): Promise<FolderInfo[]> {
    if (!this.client) throw new Error('Not connected')

    const response = await this.client
      .api('/me/mailFolders')
      .select('id,displayName,totalItemCount,unreadItemCount,parentFolderId')
      .get()

    const folderTypeMap: Record<string, FolderInfo['type']> = {
      inbox: 'INBOX',
      sentitems: 'SENT',
      drafts: 'DRAFTS',
      deleteditems: 'TRASH',
      junkemail: 'SPAM',
      archive: 'ARCHIVE',
    }

    return (response.value || []).map((folder: any) => ({
      id: folder.id,
      name: folder.displayName.toLowerCase().replace(/\s+/g, ''),
      displayName: folder.displayName,
      type: folderTypeMap[folder.displayName.toLowerCase().replace(/\s+/g, '')] || 'CUSTOM',
      parentId: folder.parentFolderId,
      totalCount: folder.totalItemCount || 0,
      unreadCount: folder.unreadItemCount || 0,
    }))
  }

  async sendMessage(params: SendEmailParams): Promise<string> {
    if (!this.client) throw new Error('Not connected')

    const message: any = {
      subject: params.subject,
      body: {
        contentType: params.isHtml ? 'HTML' : 'Text',
        content: params.body,
      },
      toRecipients: params.to.map((email) => ({
        emailAddress: { address: email },
      })),
    }

    if (params.cc?.length) {
      message.ccRecipients = params.cc.map((email) => ({
        emailAddress: { address: email },
      }))
    }

    if (params.bcc?.length) {
      message.bccRecipients = params.bcc.map((email) => ({
        emailAddress: { address: email },
      }))
    }

    if (params.replyToMessageId) {
      // Send as reply
      const response = await this.client
        .api(`/me/messages/${params.replyToMessageId}/reply`)
        .post({ message, comment: params.body })
      return response?.id || params.replyToMessageId
    }

    // Send new message
    const response = await this.client.api('/me/sendMail').post({ message })
    return response?.id || this.generateId()
  }

  async markAsRead(externalIds: string[], isRead: boolean): Promise<void> {
    if (!this.client) throw new Error('Not connected')

    for (const id of externalIds) {
      await this.client.api(`/me/messages/${id}`).patch({ isRead })
    }
  }

  async markAsStarred(externalIds: string[], isStarred: boolean): Promise<void> {
    if (!this.client) throw new Error('Not connected')

    for (const id of externalIds) {
      await this.client.api(`/me/messages/${id}`).patch({
        flag: { flagStatus: isStarred ? 'flagged' : 'notFlagged' },
      })
    }
  }

  async moveToFolder(externalIds: string[], folderId: string): Promise<void> {
    if (!this.client) throw new Error('Not connected')

    for (const id of externalIds) {
      await this.client.api(`/me/messages/${id}/move`).post({ destinationId: folderId })
    }
  }

  async deleteMessages(externalIds: string[], permanent = false): Promise<void> {
    if (!this.client) throw new Error('Not connected')

    if (permanent) {
      for (const id of externalIds) {
        await this.client.api(`/me/messages/${id}`).delete()
      }
    } else {
      // Move to trash
      const folders = await this.getFolders()
      const trashFolder = folders.find((f) => f.type === 'TRASH')
      if (trashFolder) {
        await this.moveToFolder(externalIds, trashFolder.id)
      }
    }
  }

  async archiveMessages(externalIds: string[]): Promise<void> {
    if (!this.client) throw new Error('Not connected')

    const folders = await this.getFolders()
    const archiveFolder = folders.find((f) => f.type === 'ARCHIVE')
    if (archiveFolder) {
      await this.moveToFolder(externalIds, archiveFolder.id)
    }
  }
}
