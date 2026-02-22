import { render } from "@testing-library/react";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("renders with correct width", () => {
    const { container } = render(<ProgressBar progress={75} />);

    const bar = container.querySelector("[style]");
    expect(bar).toHaveStyle({ width: "75%" });
  });

  it("clamps to 0 for negative values", () => {
    const { container } = render(<ProgressBar progress={-10} />);

    const bar = container.querySelector("[style]");
    expect(bar).toHaveStyle({ width: "0%" });
  });

  it("clamps to 100 for values above 100", () => {
    const { container } = render(<ProgressBar progress={150} />);

    const bar = container.querySelector("[style]");
    expect(bar).toHaveStyle({ width: "100%" });
  });

  it("renders 0% width for zero progress", () => {
    const { container } = render(<ProgressBar progress={0} />);

    const bar = container.querySelector("[style]");
    expect(bar).toHaveStyle({ width: "0%" });
  });
});
