import { useState, useEffect } from 'react'
import { Send, Paperclip, Sparkles, Trash2 } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { RichTextEditor } from '../ui/editor/RichTextEditor'
import { cn } from '@/renderer/lib/utils'
import { useEmailStore } from '@/renderer/stores/email-store'
import type { Thread, Email } from '@/shared/types/email'

interface EmailComposerProps {
  mode: 'new' | 'reply' | 'forward'
  thread?: Thread | null
  emails?: Email[]
  onClose: () => void
}

export function EmailComposer({ mode, thread, emails, onClose }: EmailComposerProps) {
  const { accounts } = useEmailStore()
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '')
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [sending, setSending] = useState(false)
  const [aiSuggestion, setAISuggestion] = useState<string | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)

  // Initialize fields based on mode
  useEffect(() => {
    if (mode === 'reply' && thread && emails?.length) {
      const latestEmail = emails[emails.length - 1]
      setTo(latestEmail.fromAddress)
      setSubject(`Re: ${thread.subject.replace(/^Re:\s*/i, '')}`)

      // Quote the original message in HTML format
      const quotedBody = `<p><br></p><p>---</p><p>On ${new Date(latestEmail.sentAt).toLocaleString()}, ${
        latestEmail.fromName || latestEmail.fromAddress
      } wrote:</p><blockquote>${latestEmail.bodyHtml || latestEmail.bodyText?.replace(/\n/g, '<br>') || ''}</blockquote>`
      setBody(quotedBody)
    } else if (mode === 'forward' && thread && emails?.length) {
      const latestEmail = emails[emails.length - 1]
      setSubject(`Fwd: ${thread.subject.replace(/^Fwd:\s*/i, '')}`)

      // Format forwarded message in HTML
      const forwardedBody = `<p><br></p><p>---------- Forwarded message ----------</p><p>From: ${
        latestEmail.fromName || latestEmail.fromAddress
      }<br>Date: ${new Date(latestEmail.sentAt).toLocaleString()}<br>Subject: ${latestEmail.subject}</p><p>${
        latestEmail.bodyHtml || latestEmail.bodyText?.replace(/\n/g, '<br>') || ''
      }</p>`
      setBody(forwardedBody)
    }
  }, [mode, thread, emails])

  const handleSend = async () => {
    if (!to.trim() || !selectedAccountId) return

    setSending(true)
    try {
      const toAddresses = to
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const ccAddresses = showCc
        ? cc
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined
      const bccAddresses = showBcc
        ? bcc
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined

      await window.electron.emails.send({
        accountId: selectedAccountId,
        to: toAddresses,
        cc: ccAddresses,
        bcc: bccAddresses,
        subject,
        body,
        isHtml: true,
        replyToMessageId: mode === 'reply' && emails?.length ? emails[emails.length - 1].messageId || undefined : undefined,
      })

      onClose()
    } catch (error) {
      console.error('Failed to send email:', error)
    } finally {
      setSending(false)
    }
  }

  const handleAISuggest = async () => {
    if (!thread || !emails?.length) return

    setLoadingAI(true)
    try {
      const result = await window.electron.ai.suggestReply(thread.id, 'professional')
      setAISuggestion(result.suggestion)
    } catch (error) {
      console.error('Failed to get AI suggestion:', error)
    } finally {
      setLoadingAI(false)
    }
  }

  const applyAISuggestion = () => {
    if (aiSuggestion) {
      // Wrap AI suggestion in paragraph tags and prepend to body
      const suggestionHtml = `<p>${aiSuggestion.replace(/\n/g, '</p><p>')}</p>`
      setBody(suggestionHtml + body)
      setAISuggestion(null)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle>
            {mode === 'new' ? 'New Message' : mode === 'reply' ? 'Reply' : 'Forward'}
          </DialogTitle>
        </DialogHeader>

        {/* Form */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-2 space-y-2 border-b border-border">
            {/* From */}
            {accounts.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-12">From:</span>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.displayName || account.email} ({account.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* To */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-12">To:</span>
              <Input
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="Recipients"
                className="flex-1 h-9"
              />
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <button
                  className={cn(
                    'hover:text-foreground transition-colors',
                    showCc && 'text-foreground'
                  )}
                  onClick={() => setShowCc(!showCc)}
                >
                  Cc
                </button>
                <span>/</span>
                <button
                  className={cn(
                    'hover:text-foreground transition-colors',
                    showBcc && 'text-foreground'
                  )}
                  onClick={() => setShowBcc(!showBcc)}
                >
                  Bcc
                </button>
              </div>
            </div>

            {/* Cc */}
            {showCc && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-12">Cc:</span>
                <Input
                  value={cc}
                  onChange={(e) => setCc(e.target.value)}
                  placeholder="Cc recipients"
                  className="flex-1 h-9"
                />
              </div>
            )}

            {/* Bcc */}
            {showBcc && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground w-12">Bcc:</span>
                <Input
                  value={bcc}
                  onChange={(e) => setBcc(e.target.value)}
                  placeholder="Bcc recipients"
                  className="flex-1 h-9"
                />
              </div>
            )}

            {/* Subject */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground w-12">Subject:</span>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1 h-9"
              />
            </div>
          </div>

          {/* AI Suggestion */}
          {aiSuggestion && (
            <div className="px-4 py-3 bg-accent/50 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Suggestion</span>
                <div className="flex-1" />
                <Button variant="ghost" size="sm" onClick={() => setAISuggestion(null)}>
                  Dismiss
                </Button>
                <Button variant="default" size="sm" onClick={applyAISuggestion}>
                  Use this
                </Button>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {aiSuggestion}
              </p>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-hidden">
            <RichTextEditor
              content={body}
              onChange={setBody}
              placeholder="Write your message..."
              className="h-full border-0 rounded-none"
            />
          </div>

          {/* Footer */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border">
            <Button onClick={handleSend} disabled={!to.trim() || sending}>
              <Send className="h-4 w-4 mr-2" />
              {sending ? 'Sending...' : 'Send'}
            </Button>

            <Button variant="ghost" size="icon">
              <Paperclip className="h-4 w-4" />
            </Button>

            {mode === 'reply' && thread && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleAISuggest}
                disabled={loadingAI}
              >
                <Sparkles className={cn('h-4 w-4', loadingAI && 'animate-pulse')} />
              </Button>
            )}

            <div className="flex-1" />

            <Button variant="ghost" size="icon" onClick={onClose}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
