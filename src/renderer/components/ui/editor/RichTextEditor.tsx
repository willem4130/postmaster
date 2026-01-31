import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect } from 'react'
import { EditorToolbar } from './EditorToolbar'
import { FontSize } from './font-size'
import { cn } from '@/renderer/lib/utils'

interface RichTextEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
}

export function RichTextEditor({
  content,
  onChange,
  placeholder: _placeholder = 'Write your message...',
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        code: false,
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-muted-foreground/30 pl-4 italic',
          },
        },
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Underline,
      TextAlign.configure({
        types: ['paragraph', 'heading'],
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm dark:prose-invert max-w-none',
          'focus:outline-none min-h-[200px] px-4 py-3',
          '[&_p]:my-1 [&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync content from parent when it changes externally (e.g., AI suggestion)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, { emitUpdate: false })
    }
  }, [content, editor])

  return (
    <div className={cn('flex flex-col border border-input rounded-md overflow-hidden', className)}>
      <EditorToolbar editor={editor} />
      <div className="flex-1 overflow-auto">
        <EditorContent
          editor={editor}
          className="h-full"
        />
      </div>
    </div>
  )
}

export { type RichTextEditorProps }
