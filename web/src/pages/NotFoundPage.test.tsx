import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NotFoundPage } from "./NotFoundPage";

function renderAtPath(path: string) {
  return render(
    <MemoryRouter
      initialEntries={[path]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <NotFoundPage />
    </MemoryRouter>,
  );
}

describe("NotFoundPage", () => {
  it("renders 404 heading", () => {
    renderAtPath("/unknown-route");

    expect(screen.getByText("Page not found")).toBeInTheDocument();
    expect(screen.getByText("HTTP 404")).toBeInTheDocument();
  });

  it("displays the attempted path", () => {
    renderAtPath("/some/bad/path");

    expect(screen.getByText("/some/bad/path")).toBeInTheDocument();
  });

  it("has link to browse agents", () => {
    renderAtPath("/missing");

    expect(screen.getByRole("link", { name: "Browse Agents" })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("has link to my jobs", () => {
    renderAtPath("/missing");

    expect(screen.getByRole("link", { name: "My Jobs" })).toHaveAttribute(
      "href",
      "/jobs",
    );
  });
});
