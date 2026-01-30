import { X, Archive, Trash2, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '../ui/button'
import { useEmailStore } from '@/renderer/stores/email-store'

interface BulkSelectionBarProps {
  onAnalyze: () => void
  onArchive?: () => void
  onDelete?: () => void
}

export function BulkSelectionBar({ onAnalyze, onArchive, onDelete }: BulkSelectionBarProps) {
  const { selectedThreadIds, clearSelection, isBulkAnalyzing } = useEmailStore()

  const count = selectedThreadIds.size

  if (count === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-accent/50 border-b border-border">
      <span className="text-sm font-medium">{count} selected</span>

      <Button variant="ghost" size="sm" onClick={clearSelection} className="h-7 px-2">
        <X className="h-4 w-4 mr-1" />
        Clear
      </Button>

      <div className="flex-1" />

      {onArchive && (
        <Button variant="ghost" size="sm" onClick={onArchive} className="h-7 px-2">
          <Archive className="h-4 w-4 mr-1" />
          Archive
        </Button>
      )}

      {onDelete && (
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-7 px-2 text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      )}

      <Button
        variant="default"
        size="sm"
        onClick={onAnalyze}
        disabled={isBulkAnalyzing}
        className="h-7 px-3"
      >
        {isBulkAnalyzing ? (
          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4 mr-1" />
        )}
        AI Analyze
      </Button>
    </div>
  )
}
