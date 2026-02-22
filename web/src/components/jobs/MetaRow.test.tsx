import { render, screen } from "@testing-library/react";
import { MetaRow } from "./MetaRow";

describe("MetaRow", () => {
  it("renders label and value", () => {
    render(<MetaRow label="Agent ID" value="abc-123" />);

    expect(screen.getByText("Agent ID")).toBeInTheDocument();
    expect(screen.getByText("abc-123")).toBeInTheDocument();
  });

  it("applies mono class when mono=true", () => {
    render(<MetaRow label="ID" value="xyz" mono />);

    const value = screen.getByText("xyz");
    expect(value).toHaveClass("font-mono");
  });

  it("does not apply mono class by default", () => {
    render(<MetaRow label="Status" value="running" />);

    const value = screen.getByText("running");
    expect(value).not.toHaveClass("font-mono");
  });
});
