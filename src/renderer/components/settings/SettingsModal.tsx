import { useState } from 'react'
import { X, Sun, Moon, Monitor, User, Bell, Palette, Shield, Database } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { cn } from '@/renderer/lib/utils'
import { useUIStore } from '@/renderer/stores/ui-store'
import { useEmailStore } from '@/renderer/stores/email-store'

interface SettingsModalProps {
  onClose: () => void
}

type SettingsTab = 'general' | 'accounts' | 'appearance' | 'notifications' | 'privacy' | 'data'

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general')
  const { theme, setTheme } = useUIStore()
  const { accounts } = useEmailStore()

  const tabs = [
    { id: 'general' as const, label: 'General', icon: User },
    { id: 'accounts' as const, label: 'Accounts', icon: User },
    { id: 'appearance' as const, label: 'Appearance', icon: Palette },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield },
    { id: 'data' as const, label: 'Data', icon: Database },
  ]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl h-[70vh] p-0 flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-48 border-r border-border bg-muted/30 p-2">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                    activeTab === tab.id
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                  )}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              )
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          <DialogHeader className="px-6 py-4 border-b border-border">
            <DialogTitle>
              {tabs.find((t) => t.id === activeTab)?.label} Settings
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="p-6">
              {activeTab === 'general' && <GeneralSettings />}
              {activeTab === 'accounts' && <AccountsSettings accounts={accounts} />}
              {activeTab === 'appearance' && (
                <AppearanceSettings theme={theme} setTheme={setTheme} />
              )}
              {activeTab === 'notifications' && <NotificationsSettings />}
              {activeTab === 'privacy' && <PrivacySettings />}
              {activeTab === 'data' && <DataSettings />}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Startup</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">Launch Postmaster at login</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Start minimized</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Default View</h3>
        <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
          <option value="inbox">Unified Inbox</option>
          <option value="recent">Recent</option>
          <option value="starred">Starred</option>
        </select>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Sync</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">Sync automatically</span>
          </label>
          <div className="flex items-center gap-2 ml-6">
            <span className="text-sm text-muted-foreground">Every</span>
            <select className="h-8 px-2 rounded-md border border-input bg-background text-sm">
              <option value="1">1 minute</option>
              <option value="5">5 minutes</option>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

function AccountsSettings({ accounts }: { accounts: any[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Connected Accounts</h3>
        <div className="space-y-2">
          {accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm"
                  style={{ backgroundColor: account.color || '#6366f1' }}
                >
                  {account.email[0].toUpperCase()}
                </div>
                <div>
                  <div className="text-sm font-medium">{account.displayName || account.email}</div>
                  <div className="text-xs text-muted-foreground">{account.provider}</div>
                </div>
              </div>
              <Button variant="ghost" size="sm">
                Settings
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button variant="outline">Add Account</Button>
    </div>
  )
}

function AppearanceSettings({
  theme,
  setTheme,
}: {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor },
          ].map((option) => {
            const Icon = option.icon
            return (
              <button
                key={option.id}
                className={cn(
                  'flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors',
                  theme === option.id
                    ? 'border-primary bg-accent'
                    : 'border-border hover:border-muted-foreground'
                )}
                onClick={() => setTheme(option.id as typeof theme)}
              >
                <Icon className="h-6 w-6" />
                <span className="text-sm">{option.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Accent Color</h3>
        <div className="flex gap-2">
          {['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e', '#0ea5e9'].map(
            (color) => (
              <button
                key={color}
                className="w-8 h-8 rounded-full border-2 border-transparent hover:border-muted-foreground"
                style={{ backgroundColor: color }}
              />
            )
          )}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Font Size</h3>
        <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm">
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>
    </div>
  )
}

function NotificationsSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Email Notifications</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">Show notifications for new emails</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">Play sound for new emails</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Show badge count on dock icon</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Focus Mode</h3>
        <label className="flex items-center gap-2">
          <input type="checkbox" className="rounded" />
          <span className="text-sm">Respect system Do Not Disturb</span>
        </label>
      </div>
    </div>
  )
}

function PrivacySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Email Content</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" />
            <span className="text-sm">Block remote images by default</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">Block tracking pixels</span>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">AI Features</h3>
        <div className="space-y-2">
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">Enable AI categorization</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">Enable AI summaries</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="rounded" defaultChecked />
            <span className="text-sm">Enable AI reply suggestions</span>
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          AI features use Claude by Anthropic. Email content is processed securely and not stored.
        </p>
      </div>
    </div>
  )
}

function DataSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium mb-3">Local Storage</h3>
        <div className="p-4 rounded-lg border border-border">
          <div className="flex justify-between text-sm">
            <span>Database size</span>
            <span className="text-muted-foreground">12.4 MB</span>
          </div>
          <div className="flex justify-between text-sm mt-2">
            <span>Cached attachments</span>
            <span className="text-muted-foreground">45.2 MB</span>
          </div>
        </div>
        <Button variant="outline" className="mt-3">
          Clear Cache
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Export</h3>
        <Button variant="outline">Export All Data</Button>
      </div>

      <div>
        <h3 className="text-sm font-medium mb-3">Danger Zone</h3>
        <Button variant="destructive">Reset All Settings</Button>
      </div>
    </div>
  )
}
