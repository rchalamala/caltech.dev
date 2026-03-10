import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import App from "./App";

function renderApp(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe("App routing and error states", () => {
  it("redirects / to the default term", async () => {
    renderApp("/");

    await waitFor(
      () => {
        expect(screen.getByText(/current term: sp2026/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("loads course data for a valid term route", async () => {
    renderApp("/sp2026");

    await waitFor(
      () => {
        expect(screen.getByText(/current term: sp2026/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    expect(screen.queryByText(/unable to load/i)).not.toBeInTheDocument();
  });

  it("shows error state for an invalid term route", async () => {
    renderApp("/invalid");

    await waitFor(
      () => {
        expect(
          screen.getByText(/unable to load course data/i),
        ).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("shows supported terms on error page", async () => {
    renderApp("/unknown");

    await waitFor(
      () => {
        expect(screen.getByText(/supported terms/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("shows a link to the default term on error page", async () => {
    renderApp("/nosuchterm");

    await waitFor(
      () => {
        const link = screen.getByRole("link", { name: /sp2026/i });
        expect(link).toBeInTheDocument();
        expect(link).toHaveAttribute("href", "/sp2026");
      },
      { timeout: 5000 },
    );
  });

  it("normalizes uppercase term paths", async () => {
    renderApp("/SP2026");

    await waitFor(
      () => {
        expect(screen.getByText(/current term: sp2026/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
