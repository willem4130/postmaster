import { useState, useEffect } from 'react'
import { Sidebar } from './components/sidebar/Sidebar'
import { EmailList } from './components/email/EmailList'
import { EmailDetail } from './components/email/EmailDetail'
import { EmailComposer } from './components/email/EmailComposer'
import { SettingsModal } from './components/settings/SettingsModal'
import { AddAccountModal } from './components/settings/AddAccountModal'
import { CommandPalette } from './components/CommandPalette'
import { Toaster } from './components/ui/toaster'
import { useUIStore } from './stores/ui-store'
import { useEmailStore } from './stores/email-store'
import type { Thread, Email } from '@/shared/types/email'

export default function App() {
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null)
  const [selectedEmails, setSelectedEmails] = useState<Email[]>([])
  const [showComposer, setShowComposer] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAddAccount, setShowAddAccount] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [composerMode, setComposerMode] = useState<'new' | 'reply' | 'forward'>('new')

  const { currentView, currentAccountId, sidebarCollapsed } = useUIStore()
  const { syncAllAccounts } = useEmailStore()

  // Listen for IPC events from menu
  useEffect(() => {
    const unsubscribers: (() => void)[] = []

    // Menu commands
    unsubscribers.push(window.electron.on('compose-new', () => {
      setComposerMode('new')
      setShowComposer(true)
    }))

    unsubscribers.push(window.electron.on('open-settings', () => {
      setShowSettings(true)
    }))

    unsubscribers.push(window.electron.on('add-account', () => {
      setShowAddAccount(true)
    }))

    unsubscribers.push(window.electron.on('open-search', () => {
      setShowCommandPalette(true)
    }))

    unsubscribers.push(window.electron.on('reply', () => {
      if (selectedThread) {
        setComposerMode('reply')
        setShowComposer(true)
      }
    }))

    unsubscribers.push(window.electron.on('forward', () => {
      if (selectedThread) {
        setComposerMode('forward')
        setShowComposer(true)
      }
    }))

    // Keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    // Initial sync
    syncAllAccounts()

    return () => {
      unsubscribers.forEach((unsub) => unsub())
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedThread, syncAllAccounts])

  const handleSelectThread = async (thread: Thread) => {
    setSelectedThread(thread)

    // Fetch emails for this thread
    const result = await window.electron.threads.get(thread.id)
    setSelectedEmails(result.emails || [])
  }

  const handleCloseDetail = () => {
    setSelectedThread(null)
    setSelectedEmails([])
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onComposeClick={() => {
          setComposerMode('new')
          setShowComposer(true)
        }}
        onSettingsClick={() => setShowSettings(true)}
        onAddAccountClick={() => setShowAddAccount(true)}
      />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Email list */}
        <div className={`flex flex-col ${selectedThread ? 'w-1/3 border-r border-border' : 'flex-1'}`}>
          <EmailList
            view={currentView}
            accountId={currentAccountId}
            selectedThreadId={selectedThread?.id}
            onSelectThread={handleSelectThread}
          />
        </div>

        {/* Email detail */}
        {selectedThread && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <EmailDetail
              thread={selectedThread}
              emails={selectedEmails}
              onClose={handleCloseDetail}
              onReply={() => {
                setComposerMode('reply')
                setShowComposer(true)
              }}
              onForward={() => {
                setComposerMode('forward')
                setShowComposer(true)
              }}
            />
          </div>
        )}
      </div>

      {/* Composer modal */}
      {showComposer && (
        <EmailComposer
          mode={composerMode}
          thread={composerMode !== 'new' ? selectedThread : undefined}
          emails={composerMode !== 'new' ? selectedEmails : undefined}
          onClose={() => setShowComposer(false)}
        />
      )}

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal onClose={() => setShowSettings(false)} />
      )}

      {/* Add account modal */}
      {showAddAccount && (
        <AddAccountModal onClose={() => setShowAddAccount(false)} />
      )}

      {/* Command palette */}
      {showCommandPalette && (
        <CommandPalette onClose={() => setShowCommandPalette(false)} />
      )}

      {/* Toast notifications */}
      <Toaster />
    </div>
  )
}
