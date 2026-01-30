import { useEffect, useMemo, useCallback, useRef } from 'react'
import { Star, Paperclip, RefreshCw, CheckSquare, Square } from 'lucide-react'
import { ScrollArea } from '../ui/scroll-area'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Avatar, AvatarFallback } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { Checkbox } from '../ui/checkbox'
import { cn, formatDate, getInitials, generateAvatarColor, truncate } from '@/renderer/lib/utils'
import { useEmailStore } from '@/renderer/stores/email-store'
import { useUIStore, type ViewType } from '@/renderer/stores/ui-store'
import { BulkSelectionBar } from './BulkSelectionBar'
import { BulkInsightsPanel } from './BulkInsightsPanel'
import { EmailFilterDropdown } from './EmailFilterDropdown'
import type { Thread } from '@/shared/types/email'
import type { BulkAnalysisOptions } from '@/shared/types/ai'

// Extended thread type with optional AI metadata
interface ThreadWithAI extends Thread {
  aiCategory?: string | null
  aiPriorityScore?: number | null
}

// Category color mapping for badges
const categoryBadgeColors: Record<string, string> = {
  work: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  personal: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
  finance: 'bg-green-500/20 text-green-600 dark:text-green-400',
  shopping: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  travel: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
  social: 'bg-pink-500/20 text-pink-600 dark:text-pink-400',
  newsletters: 'bg-gray-500/20 text-gray-600 dark:text-gray-400',
  promotions: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  updates: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  urgent: 'bg-red-500/20 text-red-600 dark:text-red-400',
}

function CategoryBadge({ category }: { category: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0',
        categoryBadgeColors[category] || 'bg-secondary text-secondary-foreground'
      )}
    >
      {category}
    </span>
  )
}

interface EmailListProps {
  view: ViewType
  accountId: string | null
  selectedThreadId?: string
  onSelectThread: (thread: ThreadWithAI) => void
}

export function EmailList({ view, accountId, selectedThreadId, onSelectThread }: EmailListProps) {
  const {
    threads,
    syncing,
    loadThreads,
    syncAllAccounts,
    isMultiSelectMode,
    toggleMultiSelectMode,
    selectedThreadIds,
    toggleThreadSelection,
    clearSelection,
    selectAll,
    isBulkAnalyzing,
    setIsBulkAnalyzing,
    setBulkAnalysisResult,
    setBulkAnalysisProgress,
    showBulkInsights,
    setShowBulkInsights,
    bulkAnalysisResult,
    bulkAnalysisProgress,
  } = useEmailStore()
  const { searchQuery, setSearchQuery } = useUIStore()
  const lastClickedIndex = useRef<number | null>(null)

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

  // Handle checkbox click with shift-select support
  const handleCheckboxClick = useCallback(
    (threadId: string, index: number, shiftKey: boolean) => {
      if (shiftKey && lastClickedIndex.current !== null) {
        const start = Math.min(lastClickedIndex.current, index)
        const end = Math.max(lastClickedIndex.current, index)
        for (let i = start; i <= end; i++) {
          const id = filteredThreads[i]?.id
          if (id && !selectedThreadIds.has(id)) {
            toggleThreadSelection(id)
          }
        }
      } else {
        toggleThreadSelection(threadId)
      }
      lastClickedIndex.current = index
    },
    [filteredThreads, selectedThreadIds, toggleThreadSelection]
  )

  // Run bulk analysis
  const handleBulkAnalyze = useCallback(
    async (options?: BulkAnalysisOptions) => {
      setIsBulkAnalyzing(true)
      setBulkAnalysisProgress(null)
      setBulkAnalysisResult(null)

      // Set up progress listener
      const unsubscribe = window.electron.ai.onBulkProgress((progress) => {
        setBulkAnalysisProgress(progress)
      })

      try {
        const analysisOptions = options || { threadIds: Array.from(selectedThreadIds) }
        console.log('[BulkAnalyze] Sending options:', analysisOptions)
        console.log('[BulkAnalyze] Selected IDs:', Array.from(selectedThreadIds))
        const result = await window.electron.ai.bulkAnalyze(analysisOptions)
        console.log('[BulkAnalyze] Result:', result)
        setBulkAnalysisResult(result)
        setShowBulkInsights(true)
      } catch (error) {
        console.error('Bulk analysis failed:', error)
      } finally {
        setIsBulkAnalyzing(false)
        unsubscribe()
      }
    },
    [selectedThreadIds, setIsBulkAnalyzing, setBulkAnalysisProgress, setBulkAnalysisResult, setShowBulkInsights]
  )

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
          className={cn('no-drag', isMultiSelectMode && 'bg-accent')}
          onClick={toggleMultiSelectMode}
          title={isMultiSelectMode ? 'Exit multi-select' : 'Multi-select'}
        >
          {isMultiSelectMode ? (
            <CheckSquare className="h-4 w-4" />
          ) : (
            <Square className="h-4 w-4" />
          )}
        </Button>
        <EmailFilterDropdown onAnalyze={handleBulkAnalyze} />
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

      {/* Bulk Selection Bar - show when any threads selected */}
      {selectedThreadIds.size > 0 && (
        <BulkSelectionBar onAnalyze={() => handleBulkAnalyze()} />
      )}

      {/* Search */}
      <div className="px-4 py-2 border-b border-border">
        <Input
          placeholder="Search emails..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9"
        />
      </div>

      {/* Multi-select header when in multi-select mode */}
      {isMultiSelectMode && filteredThreads.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-1.5 border-b border-border text-xs text-muted-foreground">
          <Button variant="link" size="sm" onClick={selectAll} className="h-6 p-0 text-xs">
            Select all
          </Button>
          {selectedThreadIds.size > 0 && (
            <>
              <span>•</span>
              <Button variant="link" size="sm" onClick={clearSelection} className="h-6 p-0 text-xs">
                Clear selection
              </Button>
            </>
          )}
        </div>
      )}

      {/* Bulk Insights Panel */}
      {showBulkInsights && (
        <BulkInsightsPanel
          result={bulkAnalysisResult}
          progress={bulkAnalysisProgress}
          isAnalyzing={isBulkAnalyzing}
          onClose={() => setShowBulkInsights(false)}
        />
      )}

      {/* Thread list */}
      <ScrollArea className="flex-1">
        {filteredThreads.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <p>No emails</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredThreads.map((thread, index) => (
              <ThreadItem
                key={thread.id}
                thread={thread}
                isSelected={thread.id === selectedThreadId}
                isChecked={selectedThreadIds.has(thread.id)}
                isMultiSelectMode={isMultiSelectMode}
                onClick={() => onSelectThread(thread)}
                onCheckboxClick={(shiftKey) => handleCheckboxClick(thread.id, index, shiftKey)}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}

interface ThreadItemProps {
  thread: ThreadWithAI
  isSelected: boolean
  isChecked: boolean
  isMultiSelectMode: boolean
  onClick: () => void
  onCheckboxClick: (shiftKey: boolean) => void
}

function ThreadItem({ thread, isSelected, isChecked, isMultiSelectMode, onClick, onCheckboxClick }: ThreadItemProps) {
  const isUnread = (thread.unreadCount ?? 0) > 0
  const participants = thread.participantEmails ? JSON.parse(thread.participantEmails) : []
  const primaryParticipant = participants[0] || 'Unknown'
  const avatarColor = generateAvatarColor(primaryParticipant)

  const handleClick = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      onCheckboxClick(e.shiftKey)
    } else if (!isMultiSelectMode) {
      onClick()
    } else {
      onCheckboxClick(e.shiftKey)
    }
  }

  return (
    <div
      className={cn(
        'w-full px-4 py-3 text-left hover:bg-accent/50 transition-colors cursor-pointer',
        isSelected && 'bg-accent',
        isChecked && 'bg-primary/10',
        isUnread && !isSelected && !isChecked && 'bg-muted/30'
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="flex gap-3">
        {/* Checkbox when in multi-select mode */}
        {isMultiSelectMode && (
          <div
            className="flex items-center justify-center shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              onCheckboxClick(e.shiftKey)
            }}
          >
            <Checkbox checked={isChecked} className="h-5 w-5" />
          </div>
        )}

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
            {/* Category badge - shows when AI metadata is available */}
            {thread.aiCategory && (
              <CategoryBadge category={thread.aiCategory} />
            )}
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
    </div>
  )
}
