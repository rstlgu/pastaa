"use client";

import { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Code as CodeIcon, 
  List, 
  ListOrdered,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Undo,
  Redo,
  FileText,
  Code
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/components/language-provider';

interface EditorToolbarProps {
  editor: Editor | null;
  editorMode: 'code' | 'docs';
  onModeChange: (mode: 'code' | 'docs') => void;
  codeLanguage?: string;
  onCodeLanguageChange?: (language: string) => void;
}

export function EditorToolbar({ editor, editorMode, onModeChange, codeLanguage = 'auto', onCodeLanguageChange }: EditorToolbarProps) {
  const { t } = useLanguage();
  
  return (
    <TooltipProvider>
    <div className="border-b-2 border-primary/30 p-2 flex flex-wrap items-center gap-2 bg-muted/30 justify-between">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Mode Toggle */}
        <div className="flex items-center gap-1 bg-background rounded-lg p-1 border">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editorMode === 'code' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange('code')}
                className="h-7 w-7 p-0"
              >
                <Code className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('codeMode')}</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={editorMode === 'docs' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onModeChange('docs')}
                className="h-7 w-7 p-0"
              >
                <FileText className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('docsMode')}</TooltipContent>
          </Tooltip>
        </div>

        {editorMode === 'docs' && editor && (
        <>
      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('strike') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className="h-8 w-8 p-0"
        >
          <Strikethrough className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('code') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className="h-8 w-8 p-0"
        >
          <CodeIcon className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className="h-8 w-8 p-0"
        >
          <Heading1 className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className="h-8 w-8 p-0"
        >
          <Heading2 className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('heading', { level: 3 }) ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className="h-8 w-8 p-0"
        >
          <Heading3 className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-1">
        <Button
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-8 w-8 p-0"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('blockquote') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>
      </div>

      <div className="w-px h-6 bg-border" />

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="h-8 w-8 p-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="h-8 w-8 p-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
        </>
        )}
      </div>

      {/* Language Select for Code Mode - Aligned Right */}
      {editorMode === 'code' && onCodeLanguageChange && (
        <Select value={codeLanguage} onValueChange={onCodeLanguageChange}>
          <SelectTrigger className="w-36 h-8 border-2">
            <SelectValue placeholder={t('languageLabel')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">Auto</SelectItem>
            <SelectItem value="javascript">JavaScript</SelectItem>
            <SelectItem value="typescript">TypeScript</SelectItem>
            <SelectItem value="jsx">JSX</SelectItem>
            <SelectItem value="tsx">TSX</SelectItem>
            <SelectItem value="python">Python</SelectItem>
            <SelectItem value="html">HTML</SelectItem>
            <SelectItem value="css">CSS</SelectItem>
            <SelectItem value="json">JSON</SelectItem>
            <SelectItem value="markdown">Markdown</SelectItem>
            <SelectItem value="php">PHP</SelectItem>
            <SelectItem value="sql">SQL</SelectItem>
            <SelectItem value="xml">XML</SelectItem>
            <SelectItem value="java">Java</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
    </TooltipProvider>
  );
}

