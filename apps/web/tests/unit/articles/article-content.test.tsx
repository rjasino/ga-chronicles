import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ArticleContent } from "@/components/articles/article-content";
import type { Article } from "@/features/articles/queries";

const article: Article = {
  id: "00000000-0000-4000-8000-000000000101",
  title: "A test story",
  slug: "a-test-story",
  body: "<p>Hello</p>",
  type: "news",
  status: "published",
  author_id: "00000000-0000-4000-8000-000000000001",
  cover_image: null,
  published_at: "2026-10-01T00:00:00Z",
  created_at: "2026-09-30T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
};

describe("ArticleContent byline and read time", () => {
  afterEach(cleanup);

  it("shows the author's display name when one is set", () => {
    render(<ArticleContent article={article} meta={{ byline: { displayName: "Ako Writer", username: "ako" }, readMinutes: 3 }} />);
    expect(screen.getByText("By Ako Writer")).toBeInTheDocument();
  });

  it("shows the username when there is no display name", () => {
    render(<ArticleContent article={article} meta={{ byline: { displayName: null, username: "ako" }, readMinutes: 3 }} />);
    expect(screen.getByText("By ako")).toBeInTheDocument();
  });

  it("shows the neutral staff label when no author resolves", () => {
    render(<ArticleContent article={article} meta={{ byline: null, readMinutes: 3 }} />);
    expect(screen.getByText("By Game Ako Chronicles staff")).toBeInTheDocument();
  });

  it("shows the read time as whole minutes", () => {
    render(<ArticleContent article={article} meta={{ byline: null, readMinutes: 3 }} />);
    expect(screen.getByText("3 min read")).toBeInTheDocument();
  });

  it("groups byline then read time in one meta element", () => {
    const { container } = render(<ArticleContent article={article} meta={{ byline: { displayName: "Ako Writer", username: "ako" }, readMinutes: 3 }} />);
    const meta = container.querySelector(".story__meta");
    expect(meta).not.toBeNull();
    const parts = Array.from(meta!.children).map((child) => child.textContent);
    expect(parts).toEqual(["By Ako Writer", "3 min read"]);
  });

  it("omits the byline and read time when no meta is given, as on draft previews", () => {
    const { container } = render(<ArticleContent article={article} />);
    expect(container.querySelector(".story__meta")).toBeNull();
  });
});
