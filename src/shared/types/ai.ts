// Bulk Analysis Types

export interface BulkAnalysisOptions {
  threadIds?: string[]
  domain?: string
  dateRange?: { start: string; end: string }
  preset?: 'today' | 'yesterday' | 'last7days' | 'last30days'
}

export interface BulkAnalysisProgress {
  current: number
  total: number
  threadId: string
  status: 'processing' | 'completed' | 'error'
  error?: string
}

export interface BulkAnalysisResult {
  threadCount: number
  categoryBreakdown: Record<string, number>
  priorityDistribution: {
    critical: number
    high: number
    medium: number
    low: number
  }
  topSenders: Array<{ email: string; count: number }>
  topDomains: Array<{ domain: string; count: number }>
  actionItems: Array<{ item: string; threadId: string; priority: 'low' | 'medium' | 'high' | 'critical' }>
  entities: {
    dates: Array<{ value: string; context: string; threadId: string }>
    amounts: Array<{ value: string; currency?: string; context: string; threadId: string }>
    contacts: Array<{ name?: string; email?: string; role?: string; threadId: string }>
    organizations: Array<{ name: string; threadId: string }>
  }
  executiveSummary: string
  analyzedAt: string
}

// Individual thread analysis result (used internally)
export interface ThreadAnalysisResult {
  threadId: string
  category: {
    category: string
    confidence: number
    subcategory?: string
  }
  priority: {
    score: number
    reason: string
    urgency: 'low' | 'medium' | 'high' | 'critical'
    suggestedDeadline?: string
  }
  entities: {
    dates: Array<{ value: string; context: string }>
    amounts: Array<{ value: string; currency?: string; context: string }>
    contacts: Array<{ name?: string; email?: string; role?: string }>
    organizations: string[]
    links: string[]
  }
  actionItems: string[]
  senderEmail: string
  senderDomain: string
}
