import { X, AlertCircle, Calendar, DollarSign, Users, Building2, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { ScrollArea } from '../ui/scroll-area'
import { Badge } from '../ui/badge'
import { cn } from '@/renderer/lib/utils'
import type { BulkAnalysisResult, BulkAnalysisProgress } from '@/shared/types/ai'

// Category colors
const categoryColors: Record<string, string> = {
  work: 'bg-blue-500',
  personal: 'bg-purple-500',
  finance: 'bg-green-500',
  shopping: 'bg-orange-500',
  travel: 'bg-cyan-500',
  social: 'bg-pink-500',
  newsletters: 'bg-gray-500',
  promotions: 'bg-yellow-500',
  updates: 'bg-indigo-500',
  urgent: 'bg-red-500',
}

// Priority badge colors
const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-600 dark:text-red-400',
  high: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
  medium: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
  low: 'bg-green-500/20 text-green-600 dark:text-green-400',
}

interface BulkInsightsPanelProps {
  result: BulkAnalysisResult | null
  progress: BulkAnalysisProgress | null
  isAnalyzing: boolean
  onClose: () => void
}

export function BulkInsightsPanel({ result, progress, isAnalyzing, onClose }: BulkInsightsPanelProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    priorities: true,
    senders: false,
    actions: true,
    entities: false,
    summary: true,
  })

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const progressPercent = progress ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <div className="border-b border-border bg-muted/30">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
        <span className="text-sm font-semibold">AI Insights</span>
        {result && (
          <Badge variant="secondary" className="text-xs">
            {result.threadCount} emails
          </Badge>
        )}
        <div className="flex-1" />
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="max-h-[60vh] overflow-auto">
        <div className="p-4 space-y-4">
          {/* Progress indicator during analysis */}
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Analyzing emails...</span>
                <span className="text-muted-foreground">
                  {progress?.current || 0} / {progress?.total || 0}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              {progress?.threadId && (
                <p className="text-xs text-muted-foreground truncate">
                  Processing: {progress.threadId.substring(0, 20)}...
                </p>
              )}
            </div>
          )}

          {/* Results */}
          {result && !isAnalyzing && (
            <>
              {/* Executive Summary */}
              <Section
                title="Executive Summary"
                isExpanded={expandedSections.summary}
                onToggle={() => toggleSection('summary')}
              >
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {result.executiveSummary}
                </p>
              </Section>

              {/* Category Breakdown */}
              <Section
                title="Categories"
                isExpanded={expandedSections.categories}
                onToggle={() => toggleSection('categories')}
              >
                <div className="space-y-2">
                  {Object.entries(result.categoryBreakdown)
                    .sort((a, b) => b[1] - a[1])
                    .map(([category, count]) => {
                      const percent = Math.round((count / result.threadCount) * 100)
                      return (
                        <div key={category} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="capitalize">{category}</span>
                            <span className="text-muted-foreground">
                              {count} ({percent}%)
                            </span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', categoryColors[category] || 'bg-primary')}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      )
                    })}
                </div>
              </Section>

              {/* Priority Distribution */}
              <Section
                title="Priority"
                isExpanded={expandedSections.priorities}
                onToggle={() => toggleSection('priorities')}
              >
                <div className="flex flex-wrap gap-2">
                  {result.priorityDistribution.critical > 0 && (
                    <Badge className={priorityColors.critical}>
                      {result.priorityDistribution.critical} Critical
                    </Badge>
                  )}
                  {result.priorityDistribution.high > 0 && (
                    <Badge className={priorityColors.high}>
                      {result.priorityDistribution.high} High
                    </Badge>
                  )}
                  {result.priorityDistribution.medium > 0 && (
                    <Badge className={priorityColors.medium}>
                      {result.priorityDistribution.medium} Medium
                    </Badge>
                  )}
                  {result.priorityDistribution.low > 0 && (
                    <Badge className={priorityColors.low}>
                      {result.priorityDistribution.low} Low
                    </Badge>
                  )}
                </div>
              </Section>

              {/* Top Senders */}
              <Section
                title={`Top Senders (${result.topSenders.length})`}
                isExpanded={expandedSections.senders}
                onToggle={() => toggleSection('senders')}
              >
                <div className="space-y-1">
                  {result.topSenders.slice(0, 5).map((sender, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate max-w-[200px]">{sender.email}</span>
                      <Badge variant="secondary">{sender.count}</Badge>
                    </div>
                  ))}
                  {result.topDomains.length > 0 && (
                    <>
                      <div className="text-xs text-muted-foreground pt-2">Top Domains</div>
                      {result.topDomains.slice(0, 3).map((domain, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="truncate max-w-[200px]">@{domain.domain}</span>
                          <Badge variant="secondary">{domain.count}</Badge>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </Section>

              {/* Action Items */}
              {result.actionItems.length > 0 && (
                <Section
                  title={`Action Items (${result.actionItems.length})`}
                  isExpanded={expandedSections.actions}
                  onToggle={() => toggleSection('actions')}
                >
                  <div className="space-y-2">
                    {result.actionItems.slice(0, 10).map((action, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle className={cn(
                          'h-4 w-4 mt-0.5 shrink-0',
                          action.priority === 'critical' && 'text-red-500',
                          action.priority === 'high' && 'text-orange-500',
                          action.priority === 'medium' && 'text-yellow-500',
                          action.priority === 'low' && 'text-green-500'
                        )} />
                        <span>{action.item}</span>
                      </div>
                    ))}
                    {result.actionItems.length > 10 && (
                      <p className="text-xs text-muted-foreground">
                        +{result.actionItems.length - 10} more items
                      </p>
                    )}
                  </div>
                </Section>
              )}

              {/* Entities */}
              <Section
                title="Extracted Data"
                isExpanded={expandedSections.entities}
                onToggle={() => toggleSection('entities')}
              >
                <div className="space-y-3">
                  {/* Dates */}
                  {result.entities.dates.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Calendar className="h-3 w-3" />
                        Dates ({result.entities.dates.length})
                      </div>
                      <div className="space-y-1">
                        {result.entities.dates.slice(0, 5).map((date, i) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium">{date.value}</span>
                            <span className="text-muted-foreground"> - {date.context}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Amounts */}
                  {result.entities.amounts.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <DollarSign className="h-3 w-3" />
                        Amounts ({result.entities.amounts.length})
                      </div>
                      <div className="space-y-1">
                        {result.entities.amounts.slice(0, 5).map((amount, i) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium">
                              {amount.currency || '$'}{amount.value}
                            </span>
                            <span className="text-muted-foreground"> - {amount.context}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contacts */}
                  {result.entities.contacts.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Users className="h-3 w-3" />
                        Contacts ({result.entities.contacts.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.entities.contacts.slice(0, 10).map((contact, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {contact.name || contact.email || 'Unknown'}
                            {contact.role && ` (${contact.role})`}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Organizations */}
                  {result.entities.organizations.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                        <Building2 className="h-3 w-3" />
                        Organizations ({result.entities.organizations.length})
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {result.entities.organizations.slice(0, 10).map((org, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {org.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              <p className="text-xs text-muted-foreground text-right">
                Analyzed at {new Date(result.analyzedAt).toLocaleTimeString()}
              </p>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

// Collapsible section component
function Section({
  title,
  isExpanded,
  onToggle,
  children,
}: {
  title: string
  isExpanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/50 hover:bg-muted text-sm font-medium"
      >
        {title}
        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {isExpanded && <div className="px-3 py-2">{children}</div>}
    </div>
  )
}
