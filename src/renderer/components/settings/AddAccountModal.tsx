import { useState } from 'react'
import { Mail, Building2, Globe, Server, ArrowRight, Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { cn } from '@/renderer/lib/utils'
import { useEmailStore } from '@/renderer/stores/email-store'

interface AddAccountModalProps {
  onClose: () => void
}

type Step = 'provider' | 'oauth-waiting' | 'imap-config' | 'success'
type Provider = 'microsoft' | 'google' | 'imap'

export function AddAccountModal({ onClose }: AddAccountModalProps) {
  const [step, setStep] = useState<Step>('provider')
  const [provider, setProvider] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // IMAP config
  const [imapEmail, setImapEmail] = useState('')
  const [imapPassword, setImapPassword] = useState('')
  const [imapHost, setImapHost] = useState('')
  const [imapPort, setImapPort] = useState('993')
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')

  const { addAccount, loadAccounts } = useEmailStore()

  const handleProviderSelect = async (selectedProvider: Provider) => {
    setProvider(selectedProvider)
    setError(null)

    if (selectedProvider === 'imap') {
      setStep('imap-config')
      return
    }

    // Start OAuth flow
    setLoading(true)
    try {
      let authUrl: string

      if (selectedProvider === 'microsoft') {
        authUrl = await window.electron.oauth.startMicrosoft()
      } else {
        authUrl = await window.electron.oauth.startGoogle()
      }

      // Open auth URL in default browser
      // In production, this would open in system browser
      // For now, we'll simulate
      console.log('Auth URL:', authUrl)

      setStep('oauth-waiting')

      // In production, we'd listen for the callback
      // For now, show waiting state
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleImapSubmit = async () => {
    if (!imapEmail || !imapPassword || !imapHost) {
      setError('Please fill in all required fields')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const newAccount = {
        id: `imap-${Date.now()}`,
        provider: 'IMAP' as const,
        email: imapEmail,
        displayName: imapEmail.split('@')[0],
        imapHost,
        imapPort: parseInt(imapPort),
        imapUsername: imapEmail,
        imapPassword,
        smtpHost: smtpHost || imapHost.replace('imap.', 'smtp.'),
        smtpPort: parseInt(smtpPort),
        smtpUsername: imapEmail,
        smtpPassword: imapPassword,
        syncStatus: 'NEVER_SYNCED' as const,
      }

      await window.electron.accounts.add(newAccount)
      addAccount(newAccount)
      setStep('success')
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  const handleOAuthCallback = async (code: string) => {
    setLoading(true)
    setError(null)

    try {
      let result

      if (provider === 'microsoft') {
        result = await window.electron.oauth.callbackMicrosoft(code)
      } else {
        result = await window.electron.oauth.callbackGoogle(code)
      }

      const newAccount = {
        id: `${provider}-${Date.now()}`,
        provider: provider === 'microsoft' ? 'MICROSOFT_365' : 'GMAIL',
        email: result.email,
        displayName: result.displayName || result.email.split('@')[0],
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tokenExpiresAt: result.expiresAt.toISOString(),
        syncStatus: 'NEVER_SYNCED' as const,
      }

      await window.electron.accounts.add(newAccount)
      addAccount(newAccount as any)
      setStep('success')
    } catch (err) {
      setError(String(err))
      setStep('provider')
    } finally {
      setLoading(false)
    }
  }

  const providers = [
    {
      id: 'microsoft' as const,
      name: 'Microsoft 365 / Outlook',
      description: 'Work or personal Microsoft accounts',
      icon: Building2,
      color: '#0078D4',
    },
    {
      id: 'google' as const,
      name: 'Gmail',
      description: 'Google Workspace or personal Gmail',
      icon: Mail,
      color: '#EA4335',
    },
    {
      id: 'imap' as const,
      name: 'IMAP Account',
      description: 'Custom email servers (scex.nl, etc.)',
      icon: Server,
      color: '#6366f1',
    },
  ]

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        {step === 'provider' && (
          <>
            <DialogHeader>
              <DialogTitle>Add Email Account</DialogTitle>
              <DialogDescription>
                Choose your email provider to get started
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-4">
              {providers.map((p) => {
                const Icon = p.icon
                return (
                  <button
                    key={p.id}
                    className="w-full flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                    onClick={() => handleProviderSelect(p.id)}
                    disabled={loading}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                      style={{ backgroundColor: p.color }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-muted-foreground">{p.description}</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                )
              })}
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </>
        )}

        {step === 'oauth-waiting' && (
          <>
            <DialogHeader>
              <DialogTitle>Connecting to {provider === 'microsoft' ? 'Microsoft' : 'Google'}</DialogTitle>
              <DialogDescription>
                Complete the sign-in in your browser
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                A browser window should have opened for you to sign in.
                <br />
                If it didn't,{' '}
                <button className="text-primary hover:underline">click here</button> to try again.
              </p>
            </div>

            {/* For demo purposes, add a manual callback button */}
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-2">Demo: Paste OAuth code</p>
              <div className="flex gap-2">
                <Input placeholder="OAuth code" id="oauth-code" />
                <Button
                  onClick={() => {
                    const input = document.getElementById('oauth-code') as HTMLInputElement
                    if (input?.value) {
                      handleOAuthCallback(input.value)
                    }
                  }}
                >
                  Submit
                </Button>
              </div>
            </div>

            <Button variant="ghost" onClick={() => setStep('provider')}>
              Cancel
            </Button>
          </>
        )}

        {step === 'imap-config' && (
          <>
            <DialogHeader>
              <DialogTitle>Configure IMAP Account</DialogTitle>
              <DialogDescription>
                Enter your email server settings
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={imapEmail}
                  onChange={(e) => setImapEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={imapPassword}
                  onChange={(e) => setImapPassword(e.target.value)}
                  placeholder="App password recommended"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">IMAP Server</label>
                  <Input
                    value={imapHost}
                    onChange={(e) => setImapHost(e.target.value)}
                    placeholder="imap.example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">IMAP Port</label>
                  <Input
                    value={imapPort}
                    onChange={(e) => setImapPort(e.target.value)}
                    placeholder="993"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">SMTP Server</label>
                  <Input
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">SMTP Port</label>
                  <Input
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setStep('provider')}>
                Back
              </Button>
              <Button onClick={handleImapSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Add Account'
                )}
              </Button>
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle>Account Added!</DialogTitle>
              <DialogDescription>
                Your email account has been connected successfully
              </DialogDescription>
            </DialogHeader>

            <div className="py-8 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <Mail className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Postmaster will now sync your emails. This may take a few moments.
              </p>
            </div>

            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
