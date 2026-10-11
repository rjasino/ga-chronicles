import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Checkbox } from "@/components/ui/checkbox";

describe("Checkbox", () => {
  afterEach(cleanup);

  it("toggles when its label text is clicked", () => {
    render(<Checkbox label="Moderator" name="roles" value="moderator" />);
    const box = screen.getByRole("checkbox", { name: "Moderator" });
    expect(box).not.toBeChecked();
    fireEvent.click(screen.getByText("Moderator"));
    expect(box).toBeChecked();
  });

  it("passes name, value, and defaultChecked through", () => {
    render(<Checkbox label="Contributor" name="roles" value="contributor" defaultChecked />);
    const box = screen.getByRole("checkbox", { name: "Contributor" });
    expect(box).toHaveAttribute("name", "roles");
    expect(box).toHaveAttribute("value", "contributor");
    expect(box).toBeChecked();
  });
});
