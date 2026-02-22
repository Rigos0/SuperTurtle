import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchBar } from "./SearchBar";

describe("SearchBar", () => {
  it("renders with initial value", () => {
    render(
      <SearchBar value="test" onDebouncedChange={vi.fn()} />,
    );

    expect(screen.getByRole("textbox")).toHaveValue("test");
  });

  it("shows clear button when input has value", () => {
    render(
      <SearchBar value="query" onDebouncedChange={vi.fn()} />,
    );

    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("hides clear button when input is empty", () => {
    render(
      <SearchBar value="" onDebouncedChange={vi.fn()} />,
    );

    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("calls onDebouncedChange immediately on clear", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <SearchBar value="query" onDebouncedChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("debounces input changes", () => {
    vi.useFakeTimers();
    const onChange = vi.fn();

    render(
      <SearchBar value="" onDebouncedChange={onChange} debounceMs={300} />,
    );

    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "hello" } });

    // Should not have fired yet
    expect(onChange).not.toHaveBeenCalled();

    // Advance past debounce
    act(() => vi.advanceTimersByTime(300));
    expect(onChange).toHaveBeenCalledWith("hello");

    vi.useRealTimers();
  });

  it("has accessible label", () => {
    render(
      <SearchBar value="" onDebouncedChange={vi.fn()} />,
    );

    expect(screen.getByLabelText("Search agents")).toBeInTheDocument();
  });
});
