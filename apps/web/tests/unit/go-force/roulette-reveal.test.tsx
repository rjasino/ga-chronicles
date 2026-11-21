import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { RouletteReveal } from "@/components/go-force/roulette-reveal";

describe("Wheel of Names roulette reveal", () => {
  afterEach(cleanup);

  it("announces a pending spin without revealing a title", () => {
    render(<RouletteReveal status="pending" />);

    expect(screen.getByRole("status")).toHaveTextContent(/spin in progress/i);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows the provider animation and selected title after a successful commit", () => {
    render(
      <RouletteReveal
        status="success"
        title="Game One"
        animation="R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="
      />,
    );

    expect(screen.getByRole("img", { name: /wheel of names spin animation ending with game one/i }))
      .toHaveAttribute("src", "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=");
    expect(screen.getByText("Game One")).toBeInTheDocument();
    expect(screen.getByText("Animated reveal of the server-selected game.")).toBeInTheDocument();
  });

  it("shows a recoverable failure without an animation or selected title", () => {
    render(<RouletteReveal status="error" error="Wheel of Names is unavailable. Please retry." />);

    expect(screen.getByRole("alert")).toHaveTextContent(/please retry/i);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText("Selected game")).not.toBeInTheDocument();
  });

  it("can render a static committed title when no animation is available", () => {
    render(<RouletteReveal status="success" title="Game One" />);

    expect(screen.getByText("Game One")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
