import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Select, TextArea, TextField } from "@/components/ui/text-field";

describe("TextField", () => {
  afterEach(cleanup);

  it("names the input from its label", () => {
    render(<TextField label="Username" name="username" />);
    expect(screen.getByLabelText("Username")).toHaveAttribute("name", "username");
  });

  it("shows the hint and links it to the input", () => {
    render(<TextField label="Password" name="password" hint="At least 12 characters." />);
    const input = screen.getByLabelText("Password");
    expect(input.getAttribute("aria-describedby")).toBeTruthy();
    expect(screen.getByText("At least 12 characters.")).toBeInTheDocument();
  });

  it("marks an invalid field and links the error message", () => {
    render(<TextField label="Username" name="username" error="Username is taken." />);
    const input = screen.getByLabelText("Username");
    expect(input).toHaveAttribute("aria-invalid", "true");
    const describedBy = input.getAttribute("aria-describedby")!;
    expect(document.getElementById(describedBy.split(" ").at(-1)!)).toHaveTextContent("Username is taken.");
  });

  it("passes disabled through", () => {
    render(<TextField label="Username" name="username" disabled />);
    expect(screen.getByLabelText("Username")).toBeDisabled();
  });

  it("keeps the textarea and select on the same contract", () => {
    render(
      <>
        <TextArea label="Comment" name="body" error="Too long." />
        <Select label="Role" name="role" defaultValue="reader"><option value="reader">Reader</option></Select>
      </>,
    );
    expect(screen.getByLabelText("Comment")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Role")).toHaveValue("reader");
  });
});
