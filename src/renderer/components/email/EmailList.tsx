import { useEffect, useMemo } from 'react'
import { Star, Paperclip, RefreshCw } from 'lucide-react'
import { ScrollArea } from '../ui/scroll-area'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { cn, formatDate, getInitials, generateAvatarColor, truncate } from '@/renderer/lib/utils'
import { useEmailStore } from '@/renderer/stores/email-store'
import { useUIStore, type ViewType } from '@/renderer/stores/ui-store'
import type { Thread } from '@/shared/types/email'

interface EmailListProps {
  view: ViewType
  accountId: string | null
  selectedThreadId?: string
  onSelectThread: (thread: Thread) => void
}

export function EmailList({ view, accountId, selectedThreadId, onSelectThread }: EmailListProps) {
  const { threads, syncing, loadThreads, syncAllAccounts } = useEmailStore()
  const { searchQuery, setSearchQuery } = useUIStore()

  useEffect(() => {
    loadThreads({ accountId: accountId || undefined, status: view })
  }, [view, accountId, loadThreads])

  // Filter threads based on current view
  const filteredThreads = useMemo(() => {
    let result = threads

    // Filter by view
    switch (view) {
      case 'inbox':
        result = result.filter((t) => t.inboxStatus)
        break
      case 'sent':
        result = result.filter((t) => t.sentStatus)
        break
      case 'drafts':
        result = result.filter((t) => t.draftStatus)
        break
      case 'starred':
        result = result.filter((t) => t.starredStatus)
        break
      case 'archived':
        result = result.filter((t) => t.archivedStatus)
        break
      case 'trash':
        result = result.filter((t) => t.trashedStatus)
        break
    }

    // Filter by account
    if (accountId) {
      result = result.filter((t) => t.accountId === accountId)
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (t) =>
          t.subject.toLowerCase().includes(query) ||
          t.snippet?.toLowerCase().includes(query)
      )
    }

    // Sort by date
    return result.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
  }, [threads, view, accountId, searchQuery])

  const viewLabel = {
    inbox: 'Inbox',
    sent: 'Sent',
    drafts: 'Drafts',
    starred: 'Starred',
    archived: 'Archive',
    trash: 'Trash',
    all: 'All Mail',
    perspective: 'Perspective',
  }[view]

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border drag-region">
        <h2 className="text-lg font-semibold no-drag">{viewLabel}</h2>
        <Badge variant="secondary" className="no-drag">
          {filteredThreads.length}
        </Badge>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="no-drag"
          onClick={() => syncAllAccounts()}
          disabled={syncing}
        >
          <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
        </Button>
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b border-border">
        <Input
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p>No emails</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredThreads.map((thread) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isSelected={thread.id === selectedThreadId}
                onClick={() => onSelectThread(thread)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

interface ThreadItemProps {
  thread: Thread
  isSelected: boolean
  onClick: () => void
}

function ThreadItem({ thread, isSelected, onClick }: ThreadItemProps) {
  const isUnread = (thread.unreadCount ?? 0) > 0
  const participants = thread.participantEmails ? JSON.parse(thread.participantEmails) : []
  const primaryParticipant = participants[0] || 'Unknown'
  const avatarColor = generateAvatarColor(primaryParticipant)

  return (
    <button
      className={cn(
        'w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors',
        isSelected && 'bg-accent',
        isUnread && 'bg-muted/30'
      )}
      onClick={onClick}
    >
      <div className="flex gap-3">
        {/* Avatar */}
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarFallback style={{ backgroundColor: avatarColor }} className="text-white text-sm">
            {getInitials(primaryParticipant)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm truncate',
                isUnread ? 'font-semibold text-foreground' : 'text-foreground/80'
              )}
            >
              {primaryParticipant}
            </span>
            {(thread.messageCount ?? 1) > 1 && (
              <span className="text-xs text-muted-foreground">({thread.messageCount})</span>
            )}
            <div className="flex-1" />
            <span className="text-xs text-muted-foreground shrink-0">
              {formatDate(thread.lastMessageAt)}
            </span>
          </div>

          {/* Subject */}
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className={cn(
                'text-sm truncate',
                isUnread ? 'font-medium text-foreground' : 'text-foreground/70'
              )}
            >
              {thread.subject || '(No Subject)'}
            </span>
          </div>

          {/* Snippet */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground truncate">
              {truncate(thread.snippet || '', 80)}
            </span>
            <div className="flex-1" />

            {/* Indicators */}
            <div className="flex items-center gap-1 shrink-0">
              {thread.hasAttachments && (
                <Paperclip className="h-3.5 w-3.5 text-muted-foreground" />
              )}
              {thread.starredStatus && (
                <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              )}
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
