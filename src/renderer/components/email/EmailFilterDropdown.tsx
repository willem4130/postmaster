import { useState } from 'react'
import { Filter, Calendar, AtSign, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover'
import type { BulkAnalysisOptions } from '@/shared/types/ai'

interface EmailFilterDropdownProps {
  onAnalyze: (options: BulkAnalysisOptions) => void
}

export function EmailFilterDropdown({ onAnalyze }: EmailFilterDropdownProps) {
  const [domainFilter, setDomainFilter] = useState('')
  const [showDomainInput, setShowDomainInput] = useState(false)
  const [customDateStart, setCustomDateStart] = useState('')
  const [customDateEnd, setCustomDateEnd] = useState('')
  const [showCustomDate, setShowCustomDate] = useState(false)

  const handleTimePreset = (preset: 'today' | 'yesterday' | 'last7days' | 'last30days') => {
    onAnalyze({ preset })
  }

  const handleDomainAnalyze = () => {
    if (domainFilter.trim()) {
      onAnalyze({ domain: domainFilter.trim() })
      setDomainFilter('')
      setShowDomainInput(false)
    }
  }

  const handleCustomDateAnalyze = () => {
    if (customDateStart && customDateEnd) {
      onAnalyze({
        dateRange: {
          start: new Date(customDateStart).toISOString(),
          end: new Date(customDateEnd + 'T23:59:59').toISOString(),
        },
      })
      setCustomDateStart('')
      setCustomDateEnd('')
      setShowCustomDate(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="no-drag" title="AI Filter & Analyze">
            <Filter className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            AI Batch Analysis
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* Time-based presets */}
          <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Time Period
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => handleTimePreset('today')}>
            Today
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTimePreset('yesterday')}>
            Yesterday
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTimePreset('last7days')}>
            Last 7 days
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleTimePreset('last30days')}>
            Last 30 days
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowCustomDate(true)}>
            Custom range...
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Domain filter */}
          <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-1">
            <AtSign className="h-3 w-3" />
            By Sender Domain
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowDomainInput(true)}>
            Filter by domain...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Domain input popover */}
      <Popover open={showDomainInput} onOpenChange={setShowDomainInput}>
        <PopoverTrigger asChild>
          <span className="hidden" />
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Analyze by Domain</h4>
              <p className="text-xs text-muted-foreground">
                Enter a domain to analyze all emails from senders at that domain.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <AtSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="example.com"
                  value={domainFilter}
                  onChange={(e) => setDomainFilter(e.target.value)}
                  className="pl-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleDomainAnalyze()}
                />
              </div>
              <Button onClick={handleDomainAnalyze} disabled={!domainFilter.trim()}>
                <Sparkles className="h-4 w-4 mr-1" />
                Analyze
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Custom date range popover */}
      <Popover open={showCustomDate} onOpenChange={setShowCustomDate}>
        <PopoverTrigger asChild>
          <span className="hidden" />
        </PopoverTrigger>
        <PopoverContent className="w-80" align="end">
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Custom Date Range</h4>
              <p className="text-xs text-muted-foreground">
                Select a date range to analyze emails from that period.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm w-12">From</label>
                <Input
                  type="date"
                  value={customDateStart}
                  onChange={(e) => setCustomDateStart(e.target.value)}
                  className="flex-1"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm w-12">To</label>
                <Input
                  type="date"
                  value={customDateEnd}
                  onChange={(e) => setCustomDateEnd(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <Button
              onClick={handleCustomDateAnalyze}
              disabled={!customDateStart || !customDateEnd}
              className="w-full"
            >
              <Sparkles className="h-4 w-4 mr-1" />
              Analyze Period
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </>
  )
}
