import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Button, ButtonLink } from "@/components/ui/button";

describe("Button", () => {
  afterEach(cleanup);

  it("renders the primary purpose with the blue fill", () => {
    render(<Button purpose="primary">Publish</Button>);
    expect(screen.getByRole("button", { name: "Publish" })).toHaveClass("bg-blue", "text-white");
  });

  it("renders the error purpose with the red fill", () => {
    render(<Button purpose="error">Remove comment</Button>);
    expect(screen.getByRole("button", { name: "Remove comment" })).toHaveClass("bg-red");
  });

  it("renders the success purpose with the success fill", () => {
    render(<Button purpose="success">Saved</Button>);
    expect(screen.getByRole("button", { name: "Saved" })).toHaveClass("bg-success");
  });

  it("renders the text purpose without a fill", () => {
    render(<Button purpose="text">Sign out</Button>);
    expect(screen.getByRole("button", { name: "Sign out" })).toHaveClass("bg-transparent", "underline");
  });

  it("defaults to the secondary purpose", () => {
    render(<Button>Apply filters</Button>);
    const button = screen.getByRole("button", { name: "Apply filters" });
    expect(button).toHaveClass("border-blue", "bg-transparent", "text-blue");
    expect(button).not.toHaveClass("bg-blue");
  });

  it("is at least 44 px tall at the default size", () => {
    render(<Button>Continue</Button>);
    expect(screen.getByRole("button", { name: "Continue" })).toHaveClass("min-h-11");
  });

  it("disables itself while pending and keeps its purpose styling", () => {
    render(<Button purpose="primary" pending>Publishing…</Button>);
    const button = screen.getByRole("button", { name: "Publishing…" });
    expect(button).toBeDisabled();
    expect(button).toHaveClass("bg-blue");
  });

  it("passes native props through", () => {
    const onClick = vi.fn();
    render(<Button type="submit" name="intent" value="publish" aria-pressed="true" onClick={onClick}>Publish</Button>);
    const button = screen.getByRole("button", { name: "Publish" });
    expect(button).toHaveAttribute("type", "submit");
    expect(button).toHaveAttribute("name", "intent");
    expect(button).toHaveAttribute("value", "publish");
    expect(button).toHaveAttribute("aria-pressed", "true");
    button.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("renders the toolbar size with the active state for toggles", () => {
    render(<Button size="toolbar" active aria-pressed="true" aria-label="Bold">B</Button>);
    const button = screen.getByRole("button", { name: "Bold" });
    expect(button).toHaveClass("min-h-[34px]", "bg-blue");
  });
});

describe("ButtonLink", () => {
  it("renders an anchor with the purpose classes", () => {
    render(<ButtonLink purpose="primary" href="/admin/articles/new">Write an article</ButtonLink>);
    const link = screen.getByRole("link", { name: "Write an article" });
    expect(link).toHaveAttribute("href", "/admin/articles/new");
    expect(link).toHaveClass("bg-blue", "text-white");
  });
});
