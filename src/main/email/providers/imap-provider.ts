import { ImapFlow } from 'imapflow'
import { simpleParser, ParsedMail } from 'mailparser'
import { createTransport, Transporter } from 'nodemailer'
import { BaseEmailProvider, type SendEmailParams, type FolderInfo, type SyncResult } from './base-provider'
import type { Account } from '../../database/schema'

export class ImapProvider extends BaseEmailProvider {
  private imap: ImapFlow | null = null
  private smtp: Transporter | null = null

  constructor(account?: Account) {
    super(account)
  }

  async connect(): Promise<void> {
    if (!this.account) {
      throw new Error('No account configured')
    }

    if (!this.account.imapHost || !this.account.imapUsername || !this.account.imapPassword) {
      throw new Error('IMAP credentials not configured')
    }

    this.imap = new ImapFlow({
      host: this.account.imapHost,
      port: this.account.imapPort || 993,
      secure: true,
      auth: {
        user: this.account.imapUsername,
        pass: this.account.imapPassword,
      },
      logger: false,
    })

    await this.imap.connect()

    // Set up SMTP if configured
    if (this.account.smtpHost) {
      this.smtp = createTransport({
        host: this.account.smtpHost,
        port: this.account.smtpPort || 587,
        secure: (this.account.smtpPort || 587) === 465,
        auth: {
          user: this.account.smtpUsername || this.account.imapUsername,
          pass: this.account.smtpPassword || this.account.imapPassword,
        },
      })
    }
  }

  async disconnect(): Promise<void> {
    if (this.imap) {
      await this.imap.logout()
      this.imap = null
    }
    if (this.smtp) {
      this.smtp.close()
      this.smtp = null
    }
  }

  async performInitialSync(): Promise<SyncResult> {
    if (!this.imap) throw new Error('Not connected')

    const threads: SyncResult['threads'] = []

    // Open INBOX
    const mailbox = await this.imap.getMailboxLock('INBOX')

    try {
      // Get recent messages (last 100)
      const messages = await this.imap.fetch('1:100', {
        uid: true,
        envelope: true,
        bodyStructure: true,
        flags: true,
        source: true,
      })

      // Group messages by conversation (using In-Reply-To / References)
      const messagesByConversation = new Map<string, unknown[]>()

      for await (const message of messages) {
        // Parse the raw source to get full details
        if (!message.source) continue
        const parsed = await simpleParser(message.source)

        const conversationId = this.getConversationId(parsed)
        if (!messagesByConversation.has(conversationId)) {
          messagesByConversation.set(conversationId, [])
        }
        messagesByConversation.get(conversationId)!.push({ message, parsed })
      }

      // Convert to threads
      for (const [conversationId, msgs] of messagesByConversation) {
        const sortedMsgs = msgs.sort(
          (a: any, b: any) => new Date(a.parsed.date).getTime() - new Date(b.parsed.date).getTime()
        )

        const threadId = this.generateId()
        const emailRecords = sortedMsgs.map((m: any) => this.parseImapMessage(m.message, m.parsed, threadId))

        const latestEmail = emailRecords[emailRecords.length - 1]
        const hasAttachments = sortedMsgs.some((m: any) => m.parsed.attachments?.length > 0)

        const thread = {
          id: threadId,
          externalId: conversationId,
          accountId: this.account!.id,
          subject: latestEmail.subject,
          snippet: latestEmail.snippet || '',
          participantEmails: JSON.stringify(this.extractParticipantsFromEmails(emailRecords)),
          inboxStatus: true,
          sentStatus: false,
          draftStatus: false,
          starredStatus: sortedMsgs.some((m: any) => m.message.flags?.has('\\Flagged')),
          archivedStatus: false,
          trashedStatus: sortedMsgs.some((m: any) => m.message.flags?.has('\\Deleted')),
          spamStatus: false,
          unreadCount: sortedMsgs.filter((m: any) => !m.message.flags?.has('\\Seen')).length,
          messageCount: sortedMsgs.length,
          hasAttachments,
          lastMessageAt: latestEmail.receivedAt,
        }

        threads.push({ thread, emails: emailRecords })
      }

      // Use UIDVALIDITY + highest UID as cursor
      const mailboxStatus = await this.imap.status('INBOX', { uidValidity: true, uidNext: true })
      const cursor = `${mailboxStatus.uidValidity}:${(mailboxStatus.uidNext || 1) - 1}`

      return {
        threads,
        newCursor: cursor,
        hasMore: false, // For simplicity, not implementing pagination
      }
    } finally {
      mailbox.release()
    }
  }

  async performIncrementalSync(cursor: string): Promise<SyncResult> {
    if (!this.imap) throw new Error('Not connected')

    const threads: SyncResult['threads'] = []
    const deletedThreadIds: string[] = []

    // Parse cursor (uidValidity:lastUid)
    const [uidValidity, lastUid] = cursor.split(':').map(Number)

    const mailbox = await this.imap.getMailboxLock('INBOX')

    try {
      // Get mailbox status to check UIDVALIDITY
      const mailboxStatus = await this.imap.status('INBOX', { uidValidity: true, uidNext: true })

      // Check if UIDVALIDITY changed (mailbox was recreated)
      if (Number(mailboxStatus.uidValidity) !== uidValidity) {
        // Full resync needed
        mailbox.release()
        return this.performInitialSync()
      }

      // Fetch new messages since last UID
      const messages = await this.imap.fetch(`${lastUid + 1}:*`, {
        uid: true,
        envelope: true,
        bodyStructure: true,
        flags: true,
        source: true,
      })

      const messagesByConversation = new Map<string, unknown[]>()

      for await (const message of messages) {
        if (!message.source) continue
        const parsed = await simpleParser(message.source)
        const conversationId = this.getConversationId(parsed)

        if (!messagesByConversation.has(conversationId)) {
          messagesByConversation.set(conversationId, [])
        }
        messagesByConversation.get(conversationId)!.push({ message, parsed })
      }

      for (const [conversationId, msgs] of messagesByConversation) {
        const sortedMsgs = msgs.sort(
          (a: any, b: any) => new Date(a.parsed.date).getTime() - new Date(b.parsed.date).getTime()
        )

        const threadId = this.generateId()
        const emailRecords = sortedMsgs.map((m: any) => this.parseImapMessage(m.message, m.parsed, threadId))

        const latestEmail = emailRecords[emailRecords.length - 1]
        const hasAttachments = sortedMsgs.some((m: any) => m.parsed.attachments?.length > 0)

        const thread = {
          id: threadId,
          externalId: conversationId,
          accountId: this.account!.id,
          subject: latestEmail.subject,
          snippet: latestEmail.snippet || '',
          participantEmails: JSON.stringify(this.extractParticipantsFromEmails(emailRecords)),
          inboxStatus: true,
          sentStatus: false,
          draftStatus: false,
          starredStatus: sortedMsgs.some((m: any) => m.message.flags?.has('\\Flagged')),
          archivedStatus: false,
          trashedStatus: sortedMsgs.some((m: any) => m.message.flags?.has('\\Deleted')),
          spamStatus: false,
          unreadCount: sortedMsgs.filter((m: any) => !m.message.flags?.has('\\Seen')).length,
          messageCount: sortedMsgs.length,
          hasAttachments,
          lastMessageAt: latestEmail.receivedAt,
        }

        threads.push({ thread, emails: emailRecords })
      }

      const newCursor = `${mailboxStatus.uidValidity}:${(mailboxStatus.uidNext || 1) - 1}`

      return {
        threads,
        newCursor,
        hasMore: false,
        deletedThreadIds,
      }
    } finally {
      mailbox.release()
    }
  }

  private getConversationId(parsed: ParsedMail): string {
    // Try to get conversation ID from References or In-Reply-To
    if (parsed.references?.length) {
      return parsed.references[0]
    }
    if (parsed.inReplyTo) {
      return parsed.inReplyTo
    }
    // Fall back to Message-ID
    return parsed.messageId || this.generateId()
  }

  private parseImapMessage(message: any, parsed: ParsedMail, threadId: string) {
    const fromObj = parsed.from
    const fromAddr = Array.isArray(fromObj) ? fromObj[0]?.value?.[0] : fromObj?.value?.[0]
    const toObj = parsed.to
    const toAddrs = Array.isArray(toObj) ? toObj.flatMap(t => t.value) : toObj?.value || []
    const ccObj = parsed.cc
    const ccAddrs = Array.isArray(ccObj) ? ccObj.flatMap(c => c.value) : ccObj?.value || []

    const refs = parsed.references
    const refsStr = refs ? (Array.isArray(refs) ? refs.join(' ') : refs) : null

    return {
      id: this.generateId(),
      externalId: message.uid.toString(),
      threadId,
      accountId: this.account!.id,
      fromAddress: fromAddr?.address || '',
      fromName: fromAddr?.name || null,
      toAddresses: JSON.stringify(toAddrs.map((a: any) => ({ address: a.address, name: a.name }))),
      ccAddresses: JSON.stringify(ccAddrs.map((a: any) => ({ address: a.address, name: a.name }))),
      bccAddresses: null,
      replyToAddresses: parsed.replyTo?.value
        ? JSON.stringify((Array.isArray(parsed.replyTo) ? parsed.replyTo.flatMap(r => r.value) : parsed.replyTo.value).map((a: any) => ({ address: a.address, name: a.name })))
        : null,
      subject: parsed.subject || '(No Subject)',
      bodyText: parsed.text || null,
      bodyHtml: parsed.html || (typeof parsed.html === 'boolean' ? null : parsed.html),
      snippet: parsed.text?.substring(0, 200) || null,
      messageId: parsed.messageId || null,
      inReplyTo: parsed.inReplyTo || null,
      references: refsStr,
      isRead: message.flags?.has('\\Seen') || false,
      isStarred: message.flags?.has('\\Flagged') || false,
      isDraft: message.flags?.has('\\Draft') || false,
      isDeleted: message.flags?.has('\\Deleted') || false,
      sentAt: (parsed.date || new Date()).toISOString(),
      receivedAt: (parsed.date || new Date()).toISOString(),
    }
  }

  private extractParticipantsFromEmails(emails: { fromAddress: string; toAddresses: string | null }[]): string[] {
    const participants = new Set<string>()

    for (const email of emails) {
      if (email.fromAddress) {
        participants.add(email.fromAddress.toLowerCase())
      }

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
    if (!this.imap) throw new Error('Not connected')

    const mailboxes = await this.imap.list()
    const folders: FolderInfo[] = []

    const folderTypeMap: Record<string, FolderInfo['type']> = {
      inbox: 'INBOX',
      sent: 'SENT',
      'sent mail': 'SENT',
      'sent items': 'SENT',
      drafts: 'DRAFTS',
      trash: 'TRASH',
      deleted: 'TRASH',
      'deleted items': 'TRASH',
      spam: 'SPAM',
      junk: 'SPAM',
      archive: 'ARCHIVE',
      'all mail': 'ARCHIVE',
    }

    for (const mailbox of mailboxes) {
      const normalizedName = mailbox.name.toLowerCase()
      const status = await this.imap.status(mailbox.path, { messages: true, unseen: true })

      folders.push({
        id: mailbox.path,
        name: normalizedName.replace(/\s+/g, '-'),
        displayName: mailbox.name,
        type: folderTypeMap[normalizedName] || 'CUSTOM',
        parentId: mailbox.parentPath || undefined,
        totalCount: status?.messages || 0,
        unreadCount: status?.unseen || 0,
      })
    }

    return folders
  }

  async sendMessage(params: SendEmailParams): Promise<string> {
    if (!this.smtp) {
      throw new Error('SMTP not configured')
    }

    const result = await this.smtp.sendMail({
      from: this.account!.email,
      to: params.to.join(', '),
      cc: params.cc?.join(', '),
      bcc: params.bcc?.join(', '),
      subject: params.subject,
      text: params.isHtml ? undefined : params.body,
      html: params.isHtml ? params.body : undefined,
      inReplyTo: params.replyToMessageId,
      references: params.replyToMessageId,
      attachments: params.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
        cid: a.contentId,
      })),
    })

    return result.messageId || this.generateId()
  }

  async markAsRead(externalIds: string[], isRead: boolean): Promise<void> {
    if (!this.imap) throw new Error('Not connected')

    const mailbox = await this.imap.getMailboxLock('INBOX')
    try {
      for (const uid of externalIds) {
        if (isRead) {
          await this.imap.messageFlagsAdd(uid, ['\\Seen'], { uid: true })
        } else {
          await this.imap.messageFlagsRemove(uid, ['\\Seen'], { uid: true })
        }
      }
    } finally {
      mailbox.release()
    }
  }

  async markAsStarred(externalIds: string[], isStarred: boolean): Promise<void> {
    if (!this.imap) throw new Error('Not connected')

    const mailbox = await this.imap.getMailboxLock('INBOX')
    try {
      for (const uid of externalIds) {
        if (isStarred) {
          await this.imap.messageFlagsAdd(uid, ['\\Flagged'], { uid: true })
        } else {
          await this.imap.messageFlagsRemove(uid, ['\\Flagged'], { uid: true })
        }
      }
    } finally {
      mailbox.release()
    }
  }

  async moveToFolder(externalIds: string[], folderId: string): Promise<void> {
    if (!this.imap) throw new Error('Not connected')

    const mailbox = await this.imap.getMailboxLock('INBOX')
    try {
      for (const uid of externalIds) {
        await this.imap.messageMove(uid, folderId, { uid: true })
      }
    } finally {
      mailbox.release()
    }
  }

  async deleteMessages(externalIds: string[], permanent = false): Promise<void> {
    if (!this.imap) throw new Error('Not connected')

    const mailbox = await this.imap.getMailboxLock('INBOX')
    try {
      for (const uid of externalIds) {
        if (permanent) {
          await this.imap.messageDelete(uid, { uid: true })
        } else {
          await this.imap.messageFlagsAdd(uid, ['\\Deleted'], { uid: true })
          // Move to Trash folder if available
          const folders = await this.getFolders()
          const trashFolder = folders.find((f) => f.type === 'TRASH')
          if (trashFolder) {
            await this.imap.messageMove(uid, trashFolder.id, { uid: true })
          }
        }
      }
    } finally {
      mailbox.release()
    }
  }

  async archiveMessages(externalIds: string[]): Promise<void> {
    if (!this.imap) throw new Error('Not connected')

    const folders = await this.getFolders()
    const archiveFolder = folders.find((f) => f.type === 'ARCHIVE')

    if (archiveFolder) {
      await this.moveToFolder(externalIds, archiveFolder.id)
    }
  }
}
