import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatusFilter } from "./StatusFilter";

describe("StatusFilter", () => {
  it("renders all status options", () => {
    render(<StatusFilter selected={undefined} onSelect={vi.fn()} />);

    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("Accepted")).toBeInTheDocument();
    expect(screen.getByText("Rejected")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
  });

  it("marks selected status as pressed", () => {
    render(<StatusFilter selected="running" onSelect={vi.fn()} />);

    expect(screen.getByText("Running")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Pending")).toHaveAttribute("aria-pressed", "false");
  });

  it("shows Clear button when a status is selected", () => {
    render(<StatusFilter selected="completed" onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });

  it("does not show Clear button when no status selected", () => {
    render(<StatusFilter selected={undefined} onSelect={vi.fn()} />);

    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("calls onSelect with status when clicking unselected", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StatusFilter selected={undefined} onSelect={onSelect} />);

    await user.click(screen.getByText("Running"));
    expect(onSelect).toHaveBeenCalledWith("running");
  });

  it("calls onSelect with undefined when clicking selected status", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StatusFilter selected="running" onSelect={onSelect} />);

    await user.click(screen.getByText("Running"));
    expect(onSelect).toHaveBeenCalledWith(undefined);
  });

  it("calls onSelect with undefined when clicking Clear", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<StatusFilter selected="pending" onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(onSelect).toHaveBeenCalledWith(undefined);
  });
});
