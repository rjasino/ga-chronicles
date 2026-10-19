"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { EditorContent, useEditor } from "@tiptap/react";
import { uploadArticleBodyImage } from "@/features/articles/actions";
import { ARTICLE_BODY_IMAGE_SUBJECT, ARTICLE_IMAGES_MAX_SIZE, imageTooLargeMessage } from "@/features/articles/body-image";
import { richTextExtensions } from "@/features/articles/richtext/extensions";
import { isPlainTextBody, plainTextToHtml, sanitizeRichHtml } from "@/features/articles/richtext/rich-html";
import { Button } from "@/components/ui/button";
import { Message } from "@/components/ui/message";
import { TextField } from "@/components/ui/text-field";

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
    <Button type="button" size="toolbar" active={active} aria-pressed={active} aria-label={label} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

export function RichTextEditor({ initialBody }: RichTextEditorProps) {
  const [bodyHtml, setBodyHtml] = useState(() =>
    sanitizeRichHtml(isPlainTextBody(initialBody) ? plainTextToHtml(initialBody) : initialBody),
  );
  const [uploading, setUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const dialog = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!uploading) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const blocked = Array.from(document.body.children).filter((element) => !element.hasAttribute("data-upload-modal"));
    blocked.forEach((element) => element.setAttribute("inert", ""));
    dialog.current?.focus();
    return () => {
      blocked.forEach((element) => element.removeAttribute("inert"));
      previouslyFocused?.focus();
    };
  }, [uploading]);

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
    if (file.size > ARTICLE_IMAGES_MAX_SIZE) {
      setImageError(imageTooLargeMessage(ARTICLE_BODY_IMAGE_SUBJECT, file.size, ARTICLE_IMAGES_MAX_SIZE));
      return;
    }
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
    } catch {
      setImageError("The image could not be uploaded. Try again.");
    } finally {
      setUploading(false);
    }
  };

  const openLinkForm = () => {
    const current = editor.getAttributes("link").href as string | undefined;
    setLinkDraft(current ?? "https://");
  };

  const applyLink = () => {
    const entered = (linkDraft ?? "").trim();
    setLinkDraft(null);
    if (!entered) return;
    const href = /^https?:\/\//.test(entered) ? entered : `https://${entered}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  const removeLink = () => {
    setLinkDraft(null);
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
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
        <ToolbarButton label="Link" active={editor.isActive("link")} onClick={openLinkForm}>🔗 Link</ToolbarButton>
        <span className="rich-toolbar__separator" aria-hidden="true" />
        <ToolbarButton label="Insert image" disabled={uploading} onClick={() => fileInput.current?.click()}>{uploading ? "Uploading…" : "🖼 Image"}</ToolbarButton>
      </div>
      {linkDraft !== null && (
        <div className="rich-link-form" role="group" aria-label="Link settings" onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            applyLink();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setLinkDraft(null);
          }
        }}>
          <TextField label="Link URL" value={linkDraft} placeholder="https://example.com" autoFocus onChange={(event) => setLinkDraft(event.target.value)} />
          <div className="rich-link-form__actions">
            <Button type="button" purpose="primary" onClick={applyLink}>Apply link</Button>
            <Button type="button" purpose="secondary" onClick={() => setLinkDraft(null)}>Cancel</Button>
            {editor.isActive("link") && <Button type="button" purpose="text" onClick={removeLink}>Remove link</Button>}
          </div>
        </div>
      )}
      <EditorContent editor={editor} className="rich-editor__content-wrap" />
      <input ref={fileInput} className="rich-editor__file" name="body_image" type="file" accept="image/jpeg,image/png,image/webp" aria-hidden="true" tabIndex={-1} onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) void insertImage(file);
        event.target.value = "";
      }} />
      {uploading && createPortal(
        <div className="rich-upload-modal" data-upload-modal="" role="dialog" aria-modal="true" aria-labelledby="rich-upload-status" tabIndex={-1} ref={dialog}>
          <div className="rich-upload-modal__card">
            <span className="rich-upload-modal__spinner" aria-hidden="true" />
            <p id="rich-upload-status" role="status" className="m-0 font-semibold">Uploading image…</p>
          </div>
        </div>,
        document.body,
      )}
      {imageError && <Message tone="error">{imageError}</Message>}
      <input type="hidden" name="body" value={bodyHtml} />
    </div>
  );
}
