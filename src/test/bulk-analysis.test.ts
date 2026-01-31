import { describe, it, expect } from 'vitest'
import type { BulkAnalysisOptions, BulkAnalysisResult, BulkAnalysisProgress } from '@/shared/types/ai'

describe('Bulk Analysis Types', () => {
  it('should define valid BulkAnalysisOptions', () => {
    const options: BulkAnalysisOptions = {
      threadIds: ['thread-1', 'thread-2'],
    }
    expect(options.threadIds).toHaveLength(2)

    const domainOptions: BulkAnalysisOptions = { domain: 'example.com' }
    expect(domainOptions.domain).toBe('example.com')

    const presetOptions: BulkAnalysisOptions = { preset: 'today' }
    expect(presetOptions.preset).toBe('today')

    const rangeOptions: BulkAnalysisOptions = {
      dateRange: { start: '2024-01-01', end: '2024-01-31' },
    }
    expect(rangeOptions.dateRange?.start).toBe('2024-01-01')
  })

  it('should define valid BulkAnalysisResult structure', () => {
    const result: BulkAnalysisResult = {
      threadCount: 10,
      categoryBreakdown: { work: 5, personal: 3, finance: 2 },
      priorityDistribution: { critical: 1, high: 2, medium: 4, low: 3 },
      topSenders: [{ email: 'test@example.com', count: 5 }],
      topDomains: [{ domain: 'example.com', count: 8 }],
      actionItems: [{ item: 'Reply to client', threadId: 't1', priority: 'high' }],
      entities: {
        dates: [{ value: '2024-02-01', context: 'deadline', threadId: 't1' }],
        amounts: [{ value: '100.00', currency: 'USD', context: 'invoice', threadId: 't2' }],
        contacts: [{ name: 'John', email: 'john@test.com', threadId: 't3' }],
        organizations: [{ name: 'Acme Inc', threadId: 't1' }],
      },
      executiveSummary: 'Summary of analysis',
      analyzedAt: new Date().toISOString(),
    }

    expect(result.threadCount).toBe(10)
    expect(result.categoryBreakdown.work).toBe(5)
    expect(result.priorityDistribution.critical).toBe(1)
    expect(result.topSenders).toHaveLength(1)
    expect(result.actionItems[0].priority).toBe('high')
  })

  it('should define valid BulkAnalysisProgress', () => {
    const progress: BulkAnalysisProgress = {
      current: 5,
      total: 10,
      threadId: 'thread-5',
      status: 'processing',
    }
    expect(progress.current).toBe(5)
    expect(progress.status).toBe('processing')

    const errorProgress: BulkAnalysisProgress = {
      current: 6,
      total: 10,
      threadId: 'thread-6',
      status: 'error',
      error: 'API timeout',
    }
    expect(errorProgress.error).toBe('API timeout')
  })
})
