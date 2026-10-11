import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Message } from "@/components/ui/message";

describe("Message", () => {
  afterEach(cleanup);

  it("announces errors as alerts with the form-error hook", () => {
    render(<Message tone="error">Password is incorrect.</Message>);
    const message = screen.getByRole("alert");
    expect(message).toHaveClass("form-error");
    expect(message).toHaveTextContent("Password is incorrect.");
  });

  it("announces success as a status with the form-success hook", () => {
    render(<Message tone="success">Saved.</Message>);
    const message = screen.getByRole("status");
    expect(message).toHaveClass("form-success");
  });

  it("renders notices as status with the preview-notice hook", () => {
    render(<Message tone="notice">Private preview.</Message>);
    expect(screen.getByRole("status")).toHaveClass("preview-notice");
  });

  it("lets the caller override the role", () => {
    render(<Message tone="error" role="status">Heads up.</Message>);
    expect(screen.getByRole("status")).toHaveTextContent("Heads up.");
  });
});
