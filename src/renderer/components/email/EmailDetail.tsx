import { useState } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import {
  X,
  Reply,
  ReplyAll,
  Forward,
  Star,
  Archive,
  Trash2,
  MoreHorizontal,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Paperclip,
  Download,
  ExternalLink,
} from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'
import { cn, formatDate, formatRelativeTime, getInitials, generateAvatarColor, parseAddresses } from '@/renderer/lib/utils'
import { useEmailStore } from '@/renderer/stores/email-store'
import type { Thread, Email, EmailAddress } from '@/shared/types/email'

interface EmailDetailProps {
  thread: Thread
  emails: Email[]
  onClose: () => void
  onReply: () => void
  onForward: () => void
}

export function EmailDetail({ thread, emails, onClose, onReply, onForward }: EmailDetailProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(
    // Expand the last email by default
    emails.length > 0 ? new Set([emails[emails.length - 1].id]) : new Set()
  )
  const [showAISummary, setShowAISummary] = useState(false)
  const [aiSummary, setAISummary] = useState<string | null>(null)
  const [loadingAI, setLoadingAI] = useState(false)

  const { updateThread } = useEmailStore()

  const toggleEmailExpanded = (emailId: string) => {
    setExpandedEmails((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(emailId)) {
        newSet.delete(emailId)
      } else {
        newSet.add(emailId)
      }
      return newSet
    })
  }

  const handleStar = async () => {
    const newStarred = !thread.starredStatus
    updateThread(thread.id, { starredStatus: newStarred })
    await window.electron.threads.update(thread.id, { starredStatus: newStarred })
  }

  const handleArchive = async () => {
    updateThread(thread.id, { archivedStatus: true, inboxStatus: false })
    await window.electron.threads.update(thread.id, { archivedStatus: true, inboxStatus: false })
    onClose()
  }

  const handleDelete = async () => {
    updateThread(thread.id, { trashedStatus: true, inboxStatus: false })
    await window.electron.threads.update(thread.id, { trashedStatus: true, inboxStatus: false })
    onClose()
  }

  const handleAISummarize = async () => {
    setLoadingAI(true)
    try {
      const result = await window.electron.ai.summarize(thread.id)
      setAISummary(result.summary)
      setShowAISummary(true)
    } catch (error) {
      console.error('Failed to summarize:', error)
    } finally {
      setLoadingAI(false)
    }
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>

          <h2 className="text-lg font-semibold truncate flex-1">{thread.subject || '(No Subject)'}</h2>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onReply}>
                  <Reply className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reply</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={onForward}>
                  <Forward className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Forward</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleStar}>
                  <Star
                    className={cn(
                      'h-4 w-4',
                      thread.starredStatus && 'text-yellow-500 fill-yellow-500'
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Star</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleArchive}>
                  <Archive className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Archive</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Delete</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleAISummarize}
                  disabled={loadingAI}
                >
                  <Sparkles className={cn('h-4 w-4', loadingAI && 'animate-pulse')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI Summary</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* AI Summary */}
        {showAISummary && aiSummary && (
          <div className="px-4 py-3 bg-accent/50 border-b border-border">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">AI Summary</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-6 px-2"
                onClick={() => setShowAISummary(false)}
              >
                Hide
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">{aiSummary}</p>
          </div>
        )}

        {/* Email messages */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {emails.map((email, index) => (
              <EmailMessage
                key={email.id}
                email={email}
                isExpanded={expandedEmails.has(email.id)}
                isLast={index === emails.length - 1}
                onToggle={() => toggleEmailExpanded(email.id)}
              />
            ))}
          </div>
        </ScrollArea>

        {/* Quick reply */}
        <div className="px-4 py-3 border-t border-border">
          <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={onReply}>
            <Reply className="h-4 w-4 mr-2" />
            Reply to this email...
          </Button>
        </div>
      </div>
    </TooltipProvider>
  )
}

interface EmailMessageProps {
  email: Email
  isExpanded: boolean
  isLast: boolean
  onToggle: () => void
}

function EmailMessage({ email, isExpanded, isLast, onToggle }: EmailMessageProps) {
  const avatarColor = generateAvatarColor(email.fromAddress)
  const toAddresses = parseAddresses(email.toAddresses)
  const ccAddresses = parseAddresses(email.ccAddresses)

  // Sanitize HTML content
  const sanitizedHtml = email.bodyHtml
    ? DOMPurify.sanitize(email.bodyHtml, {
        ADD_TAGS: ['style'],
        ADD_ATTR: ['target'],
      })
    : null

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Email header - clickable to expand/collapse */}
      <button
        className={cn(
          'w-full px-4 py-3 flex items-center gap-3 hover:bg-accent/50 transition-colors text-left',
          !isExpanded && 'bg-muted/30'
        )}
        onClick={onToggle}
      >
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback style={{ backgroundColor: avatarColor }} className="text-white text-sm">
            {getInitials(email.fromName || email.fromAddress)}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">
              {email.fromName || email.fromAddress}
            </span>
            {!email.isRead && (
              <Badge variant="default" className="h-5 px-1.5 text-xs">
                New
              </Badge>
            )}
          </div>
          {!isExpanded && (
            <p className="text-sm text-muted-foreground truncate">
              {email.snippet || email.bodyText?.substring(0, 100)}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(email.sentAt)}
          </span>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded email content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Recipients */}
          <div className="px-4 py-2 bg-muted/30 text-sm">
            <div className="flex items-start gap-2">
              <span className="text-muted-foreground shrink-0">To:</span>
              <span className="text-foreground">
                {toAddresses.map((a: { name?: string; address: string }) => a.name || a.address).join(', ')}
              </span>
            </div>
            {ccAddresses.length > 0 && (
              <div className="flex items-start gap-2 mt-1">
                <span className="text-muted-foreground shrink-0">Cc:</span>
                <span className="text-foreground">
                  {ccAddresses.map((a: { name?: string; address: string }) => a.name || a.address).join(', ')}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">Date:</span>
              <span className="text-foreground">
                {formatDate(email.sentAt, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Email body */}
          <div className="px-4 py-4">
            {sanitizedHtml ? (
              <div
                className="email-content"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
              />
            ) : (
              <pre className="whitespace-pre-wrap font-sans text-sm">
                {email.bodyText || 'No content'}
              </pre>
            )}
          </div>

          {/* Attachments placeholder */}
          {/* TODO: Add attachment display */}
        </div>
      )}
    </div>
  )
}
