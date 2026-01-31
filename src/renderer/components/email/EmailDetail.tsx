import { useState, useEffect } from 'react'
import DOMPurify from 'isomorphic-dompurify'
import {
  X,
  Reply,
  Forward,
  Star,
  Archive,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
  DollarSign,
  Users,
  Building2,
  Link2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'
import { cn, formatDate, formatRelativeTime, getInitials, generateAvatarColor, parseAddresses } from '@/renderer/lib/utils'
import { useEmailStore } from '@/renderer/stores/email-store'
import type { Thread, Email } from '@/shared/types/email'
import type {
  CategoryResult,
  PriorityResult,
  EntityResult,
  SummaryResult,
} from '@/main/ai/claude-client'

interface EmailDetailProps {
  thread: Thread
  emails: Email[]
  onClose: () => void
  onReply: () => void
  onForward: () => void
}

interface AIInsights {
  category?: CategoryResult
  priority?: PriorityResult
  entities?: EntityResult
  summary?: SummaryResult
}

export function EmailDetail({ thread, emails, onClose, onReply, onForward }: EmailDetailProps) {
  const [expandedEmails, setExpandedEmails] = useState<Set<string>>(new Set())
  const [showAIInsights, setShowAIInsights] = useState(false)
  const [aiInsights, setAIInsights] = useState<AIInsights>({})
  const [loadingAI, setLoadingAI] = useState(false)

  // Auto-expand the last email when emails load or change
  useEffect(() => {
    if (emails.length > 0) {
      // For single email, expand it; for multiple, expand the last one
      const lastEmail = emails[emails.length - 1]
      setExpandedEmails(new Set([lastEmail.id]))
    }
  }, [emails])

  // Reset AI insights when thread changes
  useEffect(() => {
    setAIInsights({})
    setShowAIInsights(false)
  }, [thread.id])

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

  const handleLoadAIInsights = async () => {
    setLoadingAI(true)
    setShowAIInsights(true)
    try {
      // Load all AI insights in parallel
      const [category, priority, entities, summary] = await Promise.all([
        window.electron.ai.categorize(thread.id),
        window.electron.ai.priority(thread.id),
        window.electron.ai.extractEntities(thread.id),
        window.electron.ai.summarize(thread.id),
      ])
      setAIInsights({ category, priority, entities, summary })
    } catch (error) {
      console.error('Failed to load AI insights:', error)
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
                  onClick={handleLoadAIInsights}
                  disabled={loadingAI}
                >
                  <Sparkles className={cn('h-4 w-4', loadingAI && 'animate-pulse')} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>AI Insights</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* AI Insights Panel */}
        {showAIInsights && (
          <AIInsightsPanel
            insights={aiInsights}
            loading={loadingAI}
            onClose={() => setShowAIInsights(false)}
          />
        )}

        {/* Email messages */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {emails.map((email) => (
              <EmailMessage
                key={email.id}
                email={email}
                isExpanded={expandedEmails.has(email.id)}
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
  onToggle: () => void
}

function EmailMessage({ email, isExpanded, onToggle }: EmailMessageProps) {
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

// Category color mapping
const categoryColors: Record<string, string> = {
  work: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
  personal: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
  finance: 'bg-green-500/20 text-green-700 dark:text-green-300',
  shopping: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  travel: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300',
  social: 'bg-pink-500/20 text-pink-700 dark:text-pink-300',
  newsletters: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
  promotions: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  updates: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
  urgent: 'bg-red-500/20 text-red-700 dark:text-red-300',
  spam: 'bg-red-500/20 text-red-700 dark:text-red-300',
}

// Urgency color mapping
const urgencyColors: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-700 dark:text-gray-300',
  medium: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300',
  high: 'bg-orange-500/20 text-orange-700 dark:text-orange-300',
  critical: 'bg-red-500/20 text-red-700 dark:text-red-300',
}

interface AIInsightsPanelProps {
  insights: AIInsights
  loading: boolean
  onClose: () => void
}

function AIInsightsPanel({ insights, loading, onClose }: AIInsightsPanelProps) {
  const { category, priority, entities, summary } = insights

  return (
    <div className="border-b border-border bg-accent/30">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border/50">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">AI Insights</span>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2"
          onClick={onClose}
        >
          Hide
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Analyzing email...</span>
        </div>
      ) : (
        <div className="px-4 py-3 space-y-4">
          {/* Category & Priority Row */}
          <div className="flex flex-wrap gap-3">
            {category && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Category:</span>
                <Badge
                  className={cn(
                    'text-xs',
                    categoryColors[category.category] || 'bg-secondary'
                  )}
                >
                  {category.category}
                </Badge>
                {category.subcategory && (
                  <span className="text-xs text-muted-foreground">
                    / {category.subcategory}
                  </span>
                )}
              </div>
            )}

            {priority && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Priority:</span>
                <Badge
                  className={cn(
                    'text-xs',
                    urgencyColors[priority.urgency] || 'bg-secondary'
                  )}
                >
                  {priority.urgency} ({priority.score})
                </Badge>
              </div>
            )}
          </div>

          {/* Priority Reason */}
          {priority?.reason && (
            <div className="text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3 inline mr-1" />
              {priority.reason}
            </div>
          )}

          {/* Summary */}
          {summary && (
            <div className="space-y-2">
              <p className="text-sm">{summary.summary}</p>

              {summary.keyPoints.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Key Points:</span>
                  <ul className="mt-1 space-y-0.5">
                    {summary.keyPoints.map((point, i) => (
                      <li key={i} className="text-xs text-muted-foreground">• {point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {summary.actionItems.length > 0 && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Action Items:</span>
                  <ul className="mt-1 space-y-0.5">
                    {summary.actionItems.map((item, i) => (
                      <li key={i} className="text-xs text-muted-foreground">• {item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Extracted Entities */}
          {entities && (
            <div className="space-y-2">
              {/* Dates */}
              {entities.dates.length > 0 && (
                <div className="flex items-start gap-2">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-muted-foreground">Dates:</span>
                    <div className="mt-0.5 space-y-0.5">
                      {entities.dates.map((date, i) => (
                        <div key={i} className="text-xs">
                          <span className="font-medium">{date.value}</span>
                          {date.context && (
                            <span className="text-muted-foreground"> - {date.context}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Amounts */}
              {entities.amounts.length > 0 && (
                <div className="flex items-start gap-2">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-muted-foreground">Amounts:</span>
                    <div className="mt-0.5 space-y-0.5">
                      {entities.amounts.map((amount, i) => (
                        <div key={i} className="text-xs">
                          <span className="font-medium">
                            {amount.currency && `${amount.currency} `}{amount.value}
                          </span>
                          {amount.context && (
                            <span className="text-muted-foreground"> - {amount.context}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Contacts */}
              {entities.contacts.length > 0 && (
                <div className="flex items-start gap-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-muted-foreground">Contacts:</span>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {entities.contacts.map((contact, i) => (
                        <Badge key={i} variant="outline" className="text-xs py-0">
                          {contact.name || contact.email}
                          {contact.role && <span className="text-muted-foreground ml-1">({contact.role})</span>}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Organizations */}
              {entities.organizations.length > 0 && (
                <div className="flex items-start gap-2">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-muted-foreground">Organizations:</span>
                    <div className="mt-0.5 flex flex-wrap gap-1">
                      {entities.organizations.map((org, i) => (
                        <Badge key={i} variant="outline" className="text-xs py-0">
                          {org}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Links */}
              {entities.links.length > 0 && (
                <div className="flex items-start gap-2">
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <span className="text-xs font-medium text-muted-foreground">Links:</span>
                    <div className="mt-0.5 space-y-0.5">
                      {entities.links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-primary hover:underline truncate"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
