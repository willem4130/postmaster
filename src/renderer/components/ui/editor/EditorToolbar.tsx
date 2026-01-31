import { type Editor } from '@tiptap/react'
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
} from 'lucide-react'
import { Button } from '../button'
import { cn } from '@/renderer/lib/utils'

interface EditorToolbarProps {
  editor: Editor | null
}

const fontFamilies = [
  { label: 'Default', value: '' },
  { label: 'Arial', value: 'Arial, sans-serif' },
  { label: 'Times New Roman', value: 'Times New Roman, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Courier New', value: 'Courier New, monospace' },
  { label: 'Verdana', value: 'Verdana, sans-serif' },
  { label: 'Helvetica', value: 'Helvetica, sans-serif' },
]

const fontSizes = [
  { label: '10', value: '10px' },
  { label: '12', value: '12px' },
  { label: '14', value: '14px' },
  { label: '16', value: '16px' },
  { label: '18', value: '18px' },
  { label: '20', value: '20px' },
  { label: '24', value: '24px' },
  { label: '28', value: '28px' },
  { label: '32', value: '32px' },
]


export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) {
    return null
  }

  const handleFontFamilyChange = (value: string) => {
    if (value) {
      editor.chain().focus().setFontFamily(value).run()
    } else {
      editor.chain().focus().unsetFontFamily().run()
    }
  }

  const handleFontSizeChange = (value: string) => {
    if (value) {
      editor.chain().focus().setFontSize(value).run()
    } else {
      editor.chain().focus().unsetFontSize().run()
    }
  }

  const handleColorChange = (value: string) => {
    if (value) {
      editor.chain().focus().setColor(value).run()
    } else {
      editor.chain().focus().unsetColor().run()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30">
      {/* Font Family */}
      <select
        className="h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        onChange={(e) => handleFontFamilyChange(e.target.value)}
        value={editor.getAttributes('textStyle').fontFamily || ''}
      >
        {fontFamilies.map((font) => (
          <option key={font.value} value={font.value}>
            {font.label}
          </option>
        ))}
      </select>

      {/* Font Size */}
      <select
        className="h-7 px-2 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring w-16"
        onChange={(e) => handleFontSizeChange(e.target.value)}
        value={editor.getAttributes('textStyle').fontSize || ''}
      >
        <option value="">Size</option>
        {fontSizes.map((size) => (
          <option key={size.value} value={size.value}>
            {size.label}
          </option>
        ))}
      </select>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Bold */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('bold') && 'bg-accent')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>

      {/* Italic */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('italic') && 'bg-accent')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>

      {/* Underline */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('underline') && 'bg-accent')}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Underline className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Text Color - Predefined swatches */}
      <div className="flex items-center gap-0.5">
        {[
          { color: '#000000', label: 'Black' },
          { color: '#6b7280', label: 'Gray' },
          { color: '#ef4444', label: 'Red' },
          { color: '#f97316', label: 'Orange' },
          { color: '#22c55e', label: 'Green' },
          { color: '#3b82f6', label: 'Blue' },
          { color: '#8b5cf6', label: 'Purple' },
        ].map(({ color, label }) => (
          <button
            key={color}
            type="button"
            title={label}
            className={cn(
              'w-5 h-5 rounded border border-border hover:scale-110 transition-transform',
              editor.getAttributes('textStyle').color === color && 'ring-2 ring-primary ring-offset-1'
            )}
            style={{ backgroundColor: color }}
            onClick={() => handleColorChange(color)}
          />
        ))}
        {/* Custom color picker */}
        <div className="relative h-5 w-5 ml-0.5">
          <input
            type="color"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => handleColorChange(e.target.value)}
            value={editor.getAttributes('textStyle').color || '#000000'}
            title="Custom color"
          />
          <div className="w-5 h-5 rounded border border-border bg-gradient-to-br from-red-500 via-green-500 to-blue-500" />
        </div>
      </div>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Align Left */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive({ textAlign: 'left' }) && 'bg-accent')}
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
      >
        <AlignLeft className="h-4 w-4" />
      </Button>

      {/* Align Center */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive({ textAlign: 'center' }) && 'bg-accent')}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
      >
        <AlignCenter className="h-4 w-4" />
      </Button>

      {/* Align Right */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive({ textAlign: 'right' }) && 'bg-accent')}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
      >
        <AlignRight className="h-4 w-4" />
      </Button>

      <div className="w-px h-5 bg-border mx-1" />

      {/* Bullet List */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('bulletList') && 'bg-accent')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>

      {/* Ordered List */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn('h-7 w-7 p-0', editor.isActive('orderedList') && 'bg-accent')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
    </div>
  )
}
