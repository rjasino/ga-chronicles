import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RouletteReveal } from "@/components/go-force/roulette-reveal";

function setReducedMotion(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
}

describe("Wheel of Names roulette reveal", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("shows status text while waiting without drawing a local placeholder wheel", () => {
    render(<RouletteReveal status="pending" />);

    expect(screen.getByRole("status")).toHaveTextContent(/waiting for the wheel of names/i);
    expect(screen.queryByText("Spinning…")).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("does not reveal a title before the provider animation completes", () => {
    setReducedMotion(false);
    vi.useFakeTimers();
    const onAnimationComplete = vi.fn();
    render(
      <RouletteReveal
        status="spinning"
        title="Game One"
        animation="cHJvdmlkZXItYW5pbWF0aW9u"
        animationFormat="webp"
        animationDurationMs={250}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    const image = screen.getByRole("img", { name: "Wheel of Names is spinning" });
    expect(screen.queryByText("Game One")).not.toBeInTheDocument();
    fireEvent.load(image);
    expect(onAnimationComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(249));
    expect(onAnimationComplete).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onAnimationComplete).toHaveBeenCalledOnce();
  });

  it("continues to the result immediately when the animation fails to load", () => {
    setReducedMotion(false);
    const onAnimationComplete = vi.fn();
    render(
      <RouletteReveal
        status="spinning"
        animation="cHJvdmlkZXItYW5pbWF0aW9u"
        onAnimationComplete={onAnimationComplete}
      />,
    );

    fireEvent.error(screen.getByRole("img", { name: "Wheel of Names is spinning" }));
    expect(onAnimationComplete).toHaveBeenCalledOnce();
  });

  it("continues to the result if playback is interrupted by leaving the page", () => {
    setReducedMotion(false);
    const onAnimationComplete = vi.fn();
    render(
      <RouletteReveal
        status="spinning"
        animation="cHJvdmlkZXItYW5pbWF0aW9u"
        animationDurationMs={10_000}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    fireEvent(window, new Event("pagehide"));
    expect(onAnimationComplete).toHaveBeenCalledOnce();
  });

  it("skips playback and completes immediately when reduced motion is enabled", async () => {
    setReducedMotion(true);
    const onAnimationComplete = vi.fn();
    render(
      <RouletteReveal
        status="spinning"
        animation="cHJvdmlkZXItYW5pbWF0aW9u"
        animationDurationMs={10_000}
        onAnimationComplete={onAnimationComplete}
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    await waitFor(() => expect(onAnimationComplete).toHaveBeenCalledOnce());
  });

  it("shows the committed title after the animation has completed", () => {
    setReducedMotion(false);
    render(<RouletteReveal status="success" title="Game One" />);

    expect(screen.getByText("Game One")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("shows a recoverable provider error without a selected title", () => {
    render(<RouletteReveal status="error" error="Wheel of Names is unavailable. Please retry." />);

    expect(screen.getByRole("alert")).toHaveTextContent(/please retry/i);
    expect(screen.queryByText("Selected game")).not.toBeInTheDocument();
  });
});
