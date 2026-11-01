import { Image } from "@tiptap/extension-image";
import { Youtube } from "@tiptap/extension-youtube";
import { StarterKit } from "@tiptap/starter-kit";

// The editor's fixed capability set: StarterKit provides paragraphs, headings,
// bold/italic, lists, block quotes, and links; Image adds inline images that are
// only ever inserted through the upload flow (no raw URLs or base64 data); and
// Youtube adds provider-restricted video embeds (host allowlisted by the
// sanitizer in rich-html.ts).
export const richTextExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    link: { HTMLAttributes: { target: "_blank", rel: "noopener noreferrer" } },
  }),
  Image.configure({ inline: false, allowBase64: false }),
  Youtube.configure({
    nocookie: true,
    width: 640,
    height: 360,
    HTMLAttributes: {
      loading: "lazy",
      title: "Embedded video",
      allow: "accelerometer; encrypted-media; gyroscope; picture-in-picture",
    },
  }),
];
