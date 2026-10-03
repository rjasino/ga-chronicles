import { Image } from "@tiptap/extension-image";
import { StarterKit } from "@tiptap/starter-kit";

// The editor's fixed capability set: StarterKit provides paragraphs, headings,
// bold/italic, lists, block quotes, and links; Image adds inline images that are
// only ever inserted through the upload flow (no raw URLs or base64 data).
export const richTextExtensions = [
  StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
  Image.configure({ inline: false, allowBase64: false }),
];