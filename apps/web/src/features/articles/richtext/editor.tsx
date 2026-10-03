"use client";

import { useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { uploadArticleBodyImage } from "@/features/articles/actions";
import { richTextExtensions } from "@/features/articles/richtext/extensions";
import { isPlainTextBody, plainTextToHtml, sanitizeRichHtml } from "@/features/articles/richtext/rich-html";

type RichTextEditorProps = {
  initialBody: string;
};

type ToolbarButtonProps = {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: string;
};

function ToolbarButton({ onClick, active = false, disabled = false, label, children }: ToolbarButtonProps) {
  return (
    <button type="button" className={active ? "rich-button rich-button--active" : "rich-button"} aria-pressed={active} aria-label={label} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

export function RichTextEditor({ initialBody }: RichTextEditorProps) {
  const [bodyHtml, setBodyHtml] = useState(() =>
    sanitizeRichHtml(isPlainTextBody(initialBody) ? plainTextToHtml(initialBody) : initialBody),
  );
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const editor = useEditor({
    extensions: richTextExtensions,
    immediatelyRender: false,
    content: bodyHtml,
    editorProps: {
      attributes: {
        class: "rich-editor__content",
        role: "textbox",
        "aria-label": "Article body",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: current }) => {
      setBodyHtml(sanitizeRichHtml(current.getHTML()));
      setImageError(null);
    },
  });

  if (!editor) return <div className="rich-editor">Loading editor…</div>;

  const insertImage = async (file: File) => {
    setImageError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("image", file);
      const result = await uploadArticleBodyImage(form);
      if (result.error) {
        setImageError(result.error);
      } else if (result.url) {
        editor.chain().focus().setImage({ src: result.url, alt: file.name }).run();
      }
    } finally {
      setUploading(false);
    }
  };

  const promptLink = () => {
    const current = editor.getAttributes("link").href as string | undefined;
    const entered = window.prompt("Link URL", current ?? "https://");
    if (!entered) return;
    const href = /^https?:\/\//.test(entered) ? entered : `https://${entered}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  return (
    <div className="rich-editor">
      <div className="rich-toolbar" role="toolbar" aria-label="Article body formatting">
        <ToolbarButton label="Heading 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolbarButton>
        <ToolbarButton label="Heading 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolbarButton>
        <ToolbarButton label="Heading 3" active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</ToolbarButton>
        <span className="rich-toolbar__separator" aria-hidden="true" />
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>I</ToolbarButton>
        <span className="rich-toolbar__separator" aria-hidden="true" />
        <ToolbarButton label="Bulleted list" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()}>• List</ToolbarButton>
        <ToolbarButton label="Numbered list" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. List</ToolbarButton>
        <ToolbarButton label="Block quote" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝ Quote</ToolbarButton>
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={promptLink}>🔗 Link</ToolbarButton>
        <span className="rich-toolbar__separator" aria-hidden="true" />
        <ToolbarButton label="Insert image" disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading ? "Uploading…" : "🖼 Image"}</ToolbarButton>
      </div>
      <EditorContent editor={editor} className="rich-editor__content-wrap" />
      <input ref={fileInput} className="rich-editor__file" name="body_image" type="file" accept="image/jpeg,image/png,image/webp" aria-hidden="true" tabIndex={-1} onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void insertImage(file);
        event.target.value = "";
      }} />
      {uploading && <p className="form-status" role="status">Uploading image…</p>}
      {imageError && <p className="form-error" role="alert">{imageError}</p>}
      <input type="hidden" name="body" value={bodyHtml} />
    </div>
  );
}