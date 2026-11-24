import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { VoteChoiceLabel } from "@/components/go-force/vote-choice-label";

describe("VoteChoiceLabel", () => {
  afterEach(cleanup);

  it("labels go with the success treatment", () => {
    render(<VoteChoiceLabel choice="go" />);

    expect(screen.getByText("Go")).toHaveAttribute("data-vote-choice", "go");
    expect(screen.getByText("Go")).toHaveClass(
      "border-success-line",
      "bg-success-bg",
      "text-success-ink",
    );
  });

  it("labels no-go with the danger treatment", () => {
    render(<VoteChoiceLabel choice="no-go" />);

    expect(screen.getByText("No-go")).toHaveAttribute("data-vote-choice", "no-go");
    expect(screen.getByText("No-go")).toHaveClass("border-red", "bg-danger-bg", "text-danger-ink");
  });

  it("labels abstentions without borrowing either vote color", () => {
    render(<VoteChoiceLabel choice="abstain" />);

    expect(screen.getByText("Abstain")).toHaveAttribute("data-vote-choice", "abstain");
    expect(screen.getByText("Abstain")).toHaveClass("border-line", "bg-paper", "text-muted");
  });
});
