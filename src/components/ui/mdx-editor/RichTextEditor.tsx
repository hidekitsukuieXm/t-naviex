'use client';

import dynamic from 'next/dynamic';
import { forwardRef, useCallback, useEffect, useRef, useState } from 'react';
import { type MDXEditorMethods, type MDXEditorProps } from '@mdxeditor/editor';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const Editor = dynamic(() => import('./InitializedMDXEditor'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[100px] border rounded-lg bg-muted/20">
      <Loader2 className="size-5 animate-spin text-muted-foreground" />
    </div>
  ),
});

export interface RichTextEditorProps extends Omit<
  MDXEditorProps,
  'plugins' | 'markdown' | 'onChange'
> {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  enableTables?: boolean;
  enableImages?: boolean;
  imageUploadHandler?: () => Promise<string>;
  error?: boolean;
  placeholder?: string;
}

export const RichTextEditor = forwardRef<MDXEditorMethods, RichTextEditorProps>(
  (
    {
      value,
      onChange,
      disabled = false,
      maxLength,
      enableTables = true,
      enableImages = true,
      imageUploadHandler,
      error = false,
      placeholder,
      className,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<MDXEditorMethods>(null);
    const editorRef = (ref as React.RefObject<MDXEditorMethods>) || internalRef;
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    const handleChange = useCallback(
      (newValue: string) => {
        if (disabled) return;

        if (maxLength && newValue.length > maxLength) {
          const truncated = newValue.slice(0, maxLength);
          onChange(truncated);
          if (editorRef.current) {
            editorRef.current.setMarkdown(truncated);
          }
        } else {
          onChange(newValue);
        }
      },
      [disabled, maxLength, onChange, editorRef]
    );

    useEffect(() => {
      if (isMounted && editorRef.current) {
        const currentMarkdown = editorRef.current.getMarkdown();
        if (currentMarkdown !== value) {
          editorRef.current.setMarkdown(value);
        }
      }
    }, [value, isMounted, editorRef]);

    return (
      <div
        className={cn(
          'rich-text-editor rounded-lg border bg-background transition-colors',
          'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          error && 'border-destructive ring-3 ring-destructive/20',
          disabled && 'cursor-not-allowed opacity-50 bg-input/50',
          className
        )}
      >
        <Editor
          editorRef={editorRef}
          markdown={value}
          onChange={handleChange}
          enableTables={enableTables}
          enableImages={enableImages}
          imageUploadHandler={imageUploadHandler}
          readOnly={disabled}
          placeholder={placeholder}
          {...props}
        />
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';

export type { MDXEditorMethods };
