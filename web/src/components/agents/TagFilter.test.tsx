import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagFilter } from "./TagFilter";

describe("TagFilter", () => {
  it("returns null when tags array is empty", () => {
    const { container } = render(
      <TagFilter tags={[]} selectedTags={[]} onToggleTag={vi.fn()} onClear={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders tag buttons", () => {
    render(
      <TagFilter
        tags={["ai", "code"]}
        selectedTags={[]}
        onToggleTag={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText("ai")).toBeInTheDocument();
    expect(screen.getByText("code")).toBeInTheDocument();
  });

  it("marks selected tags as pressed", () => {
    render(
      <TagFilter
        tags={["ai", "code"]}
        selectedTags={["ai"]}
        onToggleTag={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByText("ai")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("code")).toHaveAttribute("aria-pressed", "false");
  });

  it("shows Clear tags button when tags selected", () => {
    render(
      <TagFilter
        tags={["ai"]}
        selectedTags={["ai"]}
        onToggleTag={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Clear tags" })).toBeInTheDocument();
  });

  it("hides Clear tags button when no tags selected", () => {
    render(
      <TagFilter
        tags={["ai"]}
        selectedTags={[]}
        onToggleTag={vi.fn()}
        onClear={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Clear tags" })).not.toBeInTheDocument();
  });

  it("calls onToggleTag when clicking a tag", async () => {
    const user = userEvent.setup();
    const onToggleTag = vi.fn();

    render(
      <TagFilter
        tags={["ai", "code"]}
        selectedTags={[]}
        onToggleTag={onToggleTag}
        onClear={vi.fn()}
      />,
    );

    await user.click(screen.getByText("code"));
    expect(onToggleTag).toHaveBeenCalledWith("code");
  });

  it("calls onClear when clicking Clear tags", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();

    render(
      <TagFilter
        tags={["ai"]}
        selectedTags={["ai"]}
        onToggleTag={vi.fn()}
        onClear={onClear}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Clear tags" }));
    expect(onClear).toHaveBeenCalledOnce();
  });
});
