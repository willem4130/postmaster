import '@testing-library/dom'
import { vi } from 'vitest'

// Mock window.electron API
const mockElectron = {
  ai: {
    bulkAnalyze: vi.fn(),
    onBulkProgress: vi.fn(() => vi.fn()),
    categorize: vi.fn(),
    summarize: vi.fn(),
    priority: vi.fn(),
    extractEntities: vi.fn(),
    suggestReply: vi.fn(),
  },
  threads: {
    list: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
  },
  accounts: {
    list: vi.fn(),
    add: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  tags: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  perspectives: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  sync: {
    account: vi.fn(),
    all: vi.fn(),
  },
}

// @ts-expect-error - mock window.electron
globalThis.window = { electron: mockElectron }
