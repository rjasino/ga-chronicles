import "@testing-library/jest-dom/vitest";

// The strict jsdom environment omits DOM surfaces that Tiptap/ProseMirror rely on
// during editing and selection measurement. These shims keep component tests
// deterministic without weakening assertions (they only fill in missing geometry).
if (!Object.hasOwn(HTMLElement.prototype, "innerText")) {
  Object.defineProperty(HTMLElement.prototype, "innerText", {
    get() {
      return this.textContent ?? "";
    },
    set(value: string) {
      this.textContent = value;
    },
  });
}

if (!Range.prototype.getBoundingClientRect) {
  Range.prototype.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    toJSON() {
      return {};
    },
  });
}

if (!Range.prototype.getClientRects) {
  // Empty array cast: nothing will access `.item()` on an empty result set.
  Range.prototype.getClientRects = () => [] as unknown as DOMRectList;
}
