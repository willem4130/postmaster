import { useState, useEffect } from 'react'
import {
  Inbox,
  Send,
  FileText,
  Star,
  Archive,
  Trash2,
  Plus,
  Settings,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Mail,
} from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '../ui/tooltip'
import { cn, getInitials, generateAvatarColor } from '@/renderer/lib/utils'
import { useUIStore, type ViewType } from '@/renderer/stores/ui-store'
import { useEmailStore } from '@/renderer/stores/email-store'
import type { Account, Perspective } from '@/shared/types/email'

interface SidebarProps {
  collapsed: boolean
  onComposeClick: () => void
  onSettingsClick: () => void
  onAddAccountClick: () => void
}

export function Sidebar({ collapsed, onComposeClick, onSettingsClick, onAddAccountClick }: SidebarProps) {
  const { currentView, currentAccountId, setCurrentView, setCurrentAccountId, toggleSidebar } = useUIStore()
  const { accounts, perspectives, syncing, syncAllAccounts, loadAccounts, loadPerspectives } = useEmailStore()
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set())

  useEffect(() => {
    loadAccounts()
    loadPerspectives()
  }, [loadAccounts, loadPerspectives])

  const toggleAccountExpanded = (accountId: string) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(accountId)) {
        newSet.delete(accountId)
      } else {
        newSet.add(accountId)
      }
      return newSet
    })
  }

  const handleViewClick = (view: ViewType, accountId?: string | null) => {
    setCurrentView(view)
    setCurrentAccountId(accountId ?? null)
  }

  const navItems = [
    { id: 'inbox' as ViewType, label: 'Inbox', icon: Inbox },
    { id: 'sent' as ViewType, label: 'Sent', icon: Send },
    { id: 'drafts' as ViewType, label: 'Drafts', icon: FileText },
    { id: 'starred' as ViewType, label: 'Starred', icon: Star },
    { id: 'archived' as ViewType, label: 'Archive', icon: Archive },
    { id: 'trash' as ViewType, label: 'Trash', icon: Trash2 },
  ]

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          'flex flex-col h-full bg-background border-r border-border transition-all duration-200',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Drag region for window controls */}
        <div className="h-12 drag-region flex items-center px-4">
          {!collapsed && (
            <span className="text-lg font-semibold no-drag">Postmaster</span>
          )}
        </div>

        {/* Compose button */}
        <div className="px-3 mb-4">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="default" size="icon" onClick={onComposeClick} className="w-10 h-10">
                  <Plus className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Compose</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="default" onClick={onComposeClick} className="w-full justify-start gap-2">
              <Plus className="h-4 w-4" />
              Compose
            </Button>
          )}
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="px-3 space-y-1">
            {/* Main navigation */}
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = currentView === item.id && !currentAccountId

              if (collapsed) {
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        size="icon"
                        className="w-10 h-10"
                        onClick={() => handleViewClick(item.id, null)}
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                )
              }

              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className="w-full justify-start gap-2"
                  onClick={() => handleViewClick(item.id, null)}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              )
            })}

            {/* Divider */}
            {!collapsed && accounts.length > 0 && (
              <div className="py-2">
                <div className="h-px bg-border" />
              </div>
            )}

            {/* Accounts */}
            {accounts.map((account) => (
              <AccountItem
                key={account.id}
                account={account}
                collapsed={collapsed}
                expanded={expandedAccounts.has(account.id)}
                onToggle={() => toggleAccountExpanded(account.id)}
                isActive={currentAccountId === account.id}
                onSelect={() => handleViewClick(currentView, account.id)}
              />
            ))}

            {/* Perspectives */}
            {!collapsed && perspectives.length > 0 && (
              <>
                <div className="py-2">
                  <div className="h-px bg-border" />
                  <div className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-2">
                    Perspectives
                  </div>
                </div>
                {perspectives.map((perspective) => (
                  <PerspectiveItem
                    key={perspective.id}
                    perspective={perspective}
                    isActive={false}
                    onSelect={() => {}}
                  />
                ))}
              </>
            )}

            {/* Add account button */}
            {!collapsed && (
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground"
                onClick={onAddAccountClick}
              >
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-border flex items-center gap-2">
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => syncAllAccounts()}
                    disabled={syncing}
                  >
                    <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sync</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={onSettingsClick}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">Settings</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => syncAllAccounts()}
                disabled={syncing}
                className="gap-2"
              >
                <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
                {syncing ? 'Syncing...' : 'Sync'}
              </Button>
              <div className="flex-1" />
              <Button variant="ghost" size="icon" onClick={onSettingsClick}>
                <Settings className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
}

interface AccountItemProps {
  account: Account
  collapsed: boolean
  expanded: boolean
  onToggle: () => void
  isActive: boolean
  onSelect: () => void
}

function AccountItem({ account, collapsed, expanded, onToggle, isActive, onSelect }: AccountItemProps) {
  const color = account.color || generateAvatarColor(account.email)

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isActive ? 'secondary' : 'ghost'}
            size="icon"
            className="w-10 h-10"
            onClick={onSelect}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
              style={{ backgroundColor: color }}
            >
              {getInitials(account.displayName || account.email)}
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">{account.email}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div>
      <Button
        variant={isActive && !expanded ? 'secondary' : 'ghost'}
        className="w-full justify-start gap-2"
        onClick={expanded ? onToggle : onSelect}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium text-white shrink-0"
            style={{ backgroundColor: color }}
          >
            {getInitials(account.displayName || account.email)}
          </div>
          <span className="truncate text-sm">{account.displayName || account.email}</span>
        </div>
        <button
          className="p-1 hover:bg-accent rounded"
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </Button>

      {expanded && (
        <div className="ml-8 space-y-1 mt-1">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8">
            <Inbox className="h-3.5 w-3.5" />
            <span className="text-sm">Inbox</span>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8">
            <Send className="h-3.5 w-3.5" />
            <span className="text-sm">Sent</span>
          </Button>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8">
            <FileText className="h-3.5 w-3.5" />
            <span className="text-sm">Drafts</span>
          </Button>
        </div>
      )}
    </div>
  )
}

interface PerspectiveItemProps {
  perspective: Perspective
  isActive: boolean
  onSelect: () => void
}

function PerspectiveItem({ perspective, isActive, onSelect }: PerspectiveItemProps) {
  return (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      className="w-full justify-start gap-2"
      onClick={onSelect}
    >
      <Mail className="h-4 w-4" style={{ color: perspective.color || undefined }} />
      {perspective.name}
    </Button>
  )
}
