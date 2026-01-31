import { describe, it, expect, beforeEach } from 'vitest'
import { useEmailStore } from '@/renderer/stores/email-store'

describe('Email Store - Multi-Select', () => {
  beforeEach(() => {
    useEmailStore.setState({
      selectedThreadIds: new Set(),
      isMultiSelectMode: false,
      threads: [
        { id: 't1', externalId: 'e1', accountId: 'a1', subject: 'Test 1', lastMessageAt: '2024-01-01' },
        { id: 't2', externalId: 'e2', accountId: 'a1', subject: 'Test 2', lastMessageAt: '2024-01-02' },
        { id: 't3', externalId: 'e3', accountId: 'a1', subject: 'Test 3', lastMessageAt: '2024-01-03' },
      ],
      bulkAnalysisResult: null,
      bulkAnalysisProgress: null,
      isBulkAnalyzing: false,
      showBulkInsights: false,
    })
  })

  it('should toggle multi-select mode', () => {
    const { toggleMultiSelectMode, isMultiSelectMode } = useEmailStore.getState()
    expect(isMultiSelectMode).toBe(false)

    toggleMultiSelectMode()
    expect(useEmailStore.getState().isMultiSelectMode).toBe(true)

    toggleMultiSelectMode()
    expect(useEmailStore.getState().isMultiSelectMode).toBe(false)
  })

  it('should clear selection when exiting multi-select mode', () => {
    const store = useEmailStore.getState()
    store.toggleMultiSelectMode() // enter
    store.toggleThreadSelection('t1')
    store.toggleThreadSelection('t2')
    expect(useEmailStore.getState().selectedThreadIds.size).toBe(2)

    store.toggleMultiSelectMode() // exit
    expect(useEmailStore.getState().selectedThreadIds.size).toBe(0)
  })

  it('should toggle thread selection', () => {
    const { toggleThreadSelection } = useEmailStore.getState()

    toggleThreadSelection('t1')
    expect(useEmailStore.getState().selectedThreadIds.has('t1')).toBe(true)

    toggleThreadSelection('t1')
    expect(useEmailStore.getState().selectedThreadIds.has('t1')).toBe(false)
  })

  it('should select and deselect multiple threads', () => {
    const store = useEmailStore.getState()

    store.toggleThreadSelection('t1')
    store.toggleThreadSelection('t2')
    store.toggleThreadSelection('t3')

    const state = useEmailStore.getState()
    expect(state.selectedThreadIds.size).toBe(3)

    store.clearSelection()
    expect(useEmailStore.getState().selectedThreadIds.size).toBe(0)
  })

  it('should select all threads', () => {
    const { selectAll } = useEmailStore.getState()

    selectAll()
    const { selectedThreadIds, threads } = useEmailStore.getState()
    expect(selectedThreadIds.size).toBe(threads.length)
  })

  it('should manage bulk analysis state', () => {
    const store = useEmailStore.getState()

    store.setIsBulkAnalyzing(true)
    expect(useEmailStore.getState().isBulkAnalyzing).toBe(true)

    store.setBulkAnalysisProgress({
      current: 1,
      total: 3,
      threadId: 't1',
      status: 'processing',
    })
    expect(useEmailStore.getState().bulkAnalysisProgress?.current).toBe(1)

    store.setBulkAnalysisResult({
      threadCount: 3,
      categoryBreakdown: { work: 3 },
      priorityDistribution: { critical: 0, high: 1, medium: 1, low: 1 },
      topSenders: [],
      topDomains: [],
      actionItems: [],
      entities: { dates: [], amounts: [], contacts: [], organizations: [] },
      executiveSummary: 'Test summary',
      analyzedAt: '2024-01-01T00:00:00Z',
    })
    expect(useEmailStore.getState().bulkAnalysisResult?.threadCount).toBe(3)

    store.setShowBulkInsights(true)
    expect(useEmailStore.getState().showBulkInsights).toBe(true)
  })
})
