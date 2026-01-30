import { useState, useEffect, useCallback } from 'react'
import {
  Search,
  Inbox,
  Send,
  FileText,
  Star,
  Archive,
  Trash2,
  Settings,
  Plus,
  Mail,
  RefreshCw,
} from 'lucide-react'
import { Dialog, DialogContent } from './ui/dialog'
import { Input } from './ui/input'
import { ScrollArea } from './ui/scroll-area'
import { cn } from '@/renderer/lib/utils'
import { useUIStore, type ViewType } from '@/renderer/stores/ui-store'
import { useEmailStore } from '@/renderer/stores/email-store'

interface CommandPaletteProps {
  onClose: () => void
}

interface Command {
  id: string
  label: string
  icon: typeof Inbox
  shortcut?: string
  category: 'navigation' | 'action' | 'search'
  action: () => void
}

export function CommandPalette({ onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  const { setCurrentView, setCurrentAccountId } = useUIStore()
  const { accounts, syncAllAccounts } = useEmailStore()

  const commands: Command[] = [
    {
      id: 'inbox',
      label: 'Go to Inbox',
      icon: Inbox,
      shortcut: '⌘1',
      category: 'navigation',
      action: () => {
        setCurrentView('inbox')
        setCurrentAccountId(null)
        onClose()
      },
    },
    {
      id: 'sent',
      label: 'Go to Sent',
      icon: Send,
      shortcut: '⌘2',
      category: 'navigation',
      action: () => {
        setCurrentView('sent')
        setCurrentAccountId(null)
        onClose()
      },
    },
    {
      id: 'drafts',
      label: 'Go to Drafts',
      icon: FileText,
      shortcut: '⌘3',
      category: 'navigation',
      action: () => {
        setCurrentView('drafts')
        setCurrentAccountId(null)
        onClose()
      },
    },
    {
      id: 'starred',
      label: 'Go to Starred',
      icon: Star,
      category: 'navigation',
      action: () => {
        setCurrentView('starred')
        setCurrentAccountId(null)
        onClose()
      },
    },
    {
      id: 'archive',
      label: 'Go to Archive',
      icon: Archive,
      category: 'navigation',
      action: () => {
        setCurrentView('archived')
        setCurrentAccountId(null)
        onClose()
      },
    },
    {
      id: 'trash',
      label: 'Go to Trash',
      icon: Trash2,
      category: 'navigation',
      action: () => {
        setCurrentView('trash')
        setCurrentAccountId(null)
        onClose()
      },
    },
    {
      id: 'sync',
      label: 'Sync all accounts',
      icon: RefreshCw,
      category: 'action',
      action: () => {
        syncAllAccounts()
        onClose()
      },
    },
  ]

  // Add account commands
  accounts.forEach((account) => {
    commands.push({
      id: `account-${account.id}`,
      label: `Go to ${account.displayName || account.email}`,
      icon: Mail,
      category: 'navigation',
      action: () => {
        setCurrentView('inbox')
        setCurrentAccountId(account.id)
        onClose()
      },
    })
  })

  // Filter commands based on query
  const filteredCommands = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  )

  // Search emails when query changes
  useEffect(() => {
    if (query.length > 2) {
      setSearching(true)
      const timer = setTimeout(async () => {
        try {
          const results = await window.electron.search.query(query)
          setSearchResults(results)
        } catch (error) {
          console.error('Search failed:', error)
        } finally {
          setSearching(false)
        }
      }, 300)
      return () => clearTimeout(timer)
    } else {
      setSearchResults([])
    }
  }, [query])

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const totalItems = filteredCommands.length + searchResults.length

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % totalItems)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems)
          break
        case 'Enter':
          e.preventDefault()
          if (selectedIndex < filteredCommands.length) {
            filteredCommands[selectedIndex].action()
          }
          break
        case 'Escape':
          e.preventDefault()
          onClose()
          break
      }
    },
    [filteredCommands, searchResults, selectedIndex, onClose]
  )

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Search input */}
        <div className="flex items-center px-4 border-b border-border">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelectedIndex(0)
            }}
            onKeyDown={handleKeyDown}
            placeholder="Search emails, commands, or navigate..."
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
            autoFocus
          />
        </div>

        {/* Results */}
        <ScrollArea className="max-h-96">
          {/* Commands */}
          {filteredCommands.length > 0 && (
            <div className="py-2">
              <div className="px-4 py-1 text-xs text-muted-foreground uppercase tracking-wider">
                Commands
              </div>
              {filteredCommands.map((cmd, index) => {
                const Icon = cmd.icon
                return (
                  <button
                    key={cmd.id}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 hover:bg-accent/50',
                      selectedIndex === index && 'bg-accent'
                    )}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelectedIndex(index)}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 text-left">{cmd.label}</span>
                    {cmd.shortcut && (
                      <kbd className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* Search results */}
          {query.length > 2 && (
            <div className="py-2 border-t border-border">
              <div className="px-4 py-1 text-xs text-muted-foreground uppercase tracking-wider">
                Emails {searching && '(searching...)'}
              </div>
              {searchResults.length === 0 && !searching && (
                <div className="px-4 py-2 text-sm text-muted-foreground">
                  No emails found
                </div>
              )}
              {searchResults.map((result, index) => {
                const adjustedIndex = filteredCommands.length + index
                return (
                  <button
                    key={result.id}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2 hover:bg-accent/50',
                      selectedIndex === adjustedIndex && 'bg-accent'
                    )}
                    onMouseEnter={() => setSelectedIndex(adjustedIndex)}
                  >
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 text-left min-w-0">
                      <div className="text-sm font-medium truncate">{result.subject}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {result.snippet}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {filteredCommands.length === 0 && searchResults.length === 0 && !searching && (
            <div className="py-8 text-center text-muted-foreground">
              No results found
            </div>
          )}
        </ScrollArea>

        {/* Footer hint */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-border text-xs text-muted-foreground">
          <span>
            <kbd className="bg-muted px-1 rounded">↑↓</kbd> navigate
          </span>
          <span>
            <kbd className="bg-muted px-1 rounded">↵</kbd> select
          </span>
          <span>
            <kbd className="bg-muted px-1 rounded">esc</kbd> close
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
