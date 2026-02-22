import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("returns null when total <= limit", () => {
    const { container } = render(
      <Pagination total={10} limit={20} offset={0} onOffsetChange={vi.fn()} />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows page info", () => {
    render(
      <Pagination total={50} limit={20} offset={0} onOffsetChange={vi.fn()} />,
    );
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("disables Previous on first page", () => {
    render(
      <Pagination total={50} limit={20} offset={0} onOffsetChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeEnabled();
  });

  it("disables Next on last page", () => {
    render(
      <Pagination total={50} limit={20} offset={40} onOffsetChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeEnabled();
  });

  it("calls onOffsetChange with next offset", async () => {
    const user = userEvent.setup();
    const onOffsetChange = vi.fn();

    render(
      <Pagination total={50} limit={20} offset={0} onOffsetChange={onOffsetChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onOffsetChange).toHaveBeenCalledWith(20);
  });

  it("calls onOffsetChange with previous offset", async () => {
    const user = userEvent.setup();
    const onOffsetChange = vi.fn();

    render(
      <Pagination total={50} limit={20} offset={20} onOffsetChange={onOffsetChange} />,
    );

    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onOffsetChange).toHaveBeenCalledWith(0);
  });

  it("normalizes out-of-range offset", () => {
    render(
      <Pagination total={50} limit={20} offset={100} onOffsetChange={vi.fn()} />,
    );
    expect(screen.getByText("Page 3 of 3")).toBeInTheDocument();
  });
});
