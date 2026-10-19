import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleCard } from "@/components/articles/article-card";
import type { Article } from "@/features/articles/queries";

function article(body: string): Article {
  return {
    id: "a1",
    title: "A story",
    slug: "a-story",
    type: "news",
    body,
    cover_image: null,
  } as unknown as Article;
}

describe("ArticleCard summary", () => {
  it("shows the body as text without markup tags", () => {
    const { container } = render(<ArticleCard article={article("<p>AI may help <strong>smaller teams</strong>.</p>")} />);
    const summary = container.querySelector(".article-card__summary");
    expect(summary).toHaveTextContent("AI may help smaller teams.");
    expect(summary?.textContent).not.toMatch(/[<>]/);
  });

  it("truncates long summaries with an ellipsis at 155 characters", () => {
    const longText = "word ".repeat(80).trim();
    render(<ArticleCard article={article(`<p>${longText}</p>`)} />);
    const text = screen.getByText(/word/, { selector: ".article-card__summary" }).textContent ?? "";
    expect(text.endsWith("…")).toBe(true);
    expect(text.length).toBe(156);
  });

  it("renders an empty summary for an empty body", () => {
    const { container } = render(<ArticleCard article={article("<p></p>")} />);
    expect(container.querySelector(".article-card__summary")?.textContent).toBe("");
  });
});
