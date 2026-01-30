import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  // If today, show time only
  if (diff < 86400000 && d.getDate() === now.getDate()) {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  // If this week, show day name
  if (diff < 604800000) {
    return d.toLocaleDateString('en-US', { weekday: 'short' })
  }

  // If this year, show month and day
  if (d.getFullYear() === now.getFullYear()) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Otherwise show full date
  return d.toLocaleDateString('en-US', options || { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return formatDate(d)
}

export function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

export function getEmailDomain(email: string): string {
  const match = email.match(/@(.+)$/)
  return match ? match[1] : email
}

export interface EmailAddress {
  address: string
  name?: string
}

export function parseAddresses(json: string | null | undefined): EmailAddress[] {
  if (!json) return []
  try {
    return JSON.parse(json)
  } catch {
    return []
  }
}

export function generateAvatarColor(email: string): string {
  const colors = [
    '#6366f1', // indigo
    '#8b5cf6', // violet
    '#a855f7', // purple
    '#d946ef', // fuchsia
    '#ec4899', // pink
    '#f43f5e', // rose
    '#ef4444', // red
    '#f97316', // orange
    '#f59e0b', // amber
    '#eab308', // yellow
    '#84cc16', // lime
    '#22c55e', // green
    '#10b981', // emerald
    '#14b8a6', // teal
    '#06b6d4', // cyan
    '#0ea5e9', // sky
    '#3b82f6', // blue
  ]

  let hash = 0
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash)
  }

  return colors[Math.abs(hash) % colors.length]
}
