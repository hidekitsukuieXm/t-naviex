'use client';

import { type ForwardedRef } from 'react';
import {
  MDXEditor,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  linkDialogPlugin,
  tablePlugin,
  imagePlugin,
  toolbarPlugin,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertImage,
  ListsToggle,
  UndoRedo,
  Separator,
  type MDXEditorMethods,
  type MDXEditorProps,
} from '@mdxeditor/editor';
import '@mdxeditor/editor/style.css';

export interface InitializedMDXEditorProps extends Omit<MDXEditorProps, 'plugins'> {
  editorRef: ForwardedRef<MDXEditorMethods> | null;
  enableTables?: boolean;
  enableImages?: boolean;
  imageUploadHandler?: () => Promise<string>;
}

function ToolbarContents({
  enableTables = true,
  enableImages = true,
}: {
  enableTables?: boolean;
  enableImages?: boolean;
}) {
  return (
    <>
      <UndoRedo />
      <Separator />
      <BoldItalicUnderlineToggles />
      <Separator />
      <BlockTypeSelect />
      <Separator />
      <ListsToggle />
      <Separator />
      <CreateLink />
      {enableTables && (
        <>
          <Separator />
          <InsertTable />
        </>
      )}
      {enableImages && (
        <>
          <Separator />
          <InsertImage />
        </>
      )}
    </>
  );
}

export default function InitializedMDXEditor({
  editorRef,
  enableTables = true,
  enableImages = true,
  imageUploadHandler,
  className,
  ...props
}: InitializedMDXEditorProps) {
  const plugins = [
    headingsPlugin(),
    listsPlugin(),
    quotePlugin(),
    thematicBreakPlugin(),
    markdownShortcutPlugin(),
    linkPlugin(),
    linkDialogPlugin(),
    toolbarPlugin({
      toolbarContents: () => (
        <ToolbarContents enableTables={enableTables} enableImages={enableImages} />
      ),
    }),
  ];

  if (enableTables) {
    plugins.push(tablePlugin());
  }

  if (enableImages) {
    plugins.push(
      imagePlugin({
        imageUploadHandler: imageUploadHandler ?? (() => Promise.resolve('')),
      })
    );
  }

  return (
    <MDXEditor
      plugins={plugins}
      className={className}
      contentEditableClassName="prose prose-sm dark:prose-invert max-w-none min-h-[100px] focus:outline-none"
      {...props}
      ref={editorRef}
    />
  );
}
