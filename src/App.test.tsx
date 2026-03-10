import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, beforeEach } from "vitest";
import App from "./App";

beforeEach(() => {
  // Clear localStorage to prevent state leaking between tests
  localStorage.clear();
});

describe("App routing and error states", () => {
  it("loads the default term when visiting /", async () => {
    window.history.pushState({}, "", "/");

    render(<App />);

    // Should show loading state first
    expect(screen.getByText(/loading course data/i)).toBeInTheDocument();

    // Then should resolve to the planner (default term /sp2026)
    await waitFor(
      () => {
        expect(screen.getByText(/current term: sp2026/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("loads course data for a valid term route", async () => {
    window.history.pushState({}, "", "/sp2026");

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText(/current term: sp2026/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );

    // Should not show error
    expect(screen.queryByText(/unable to load/i)).not.toBeInTheDocument();
  });

  it("shows error state for an invalid term route", async () => {
    window.history.pushState({}, "", "/invalid");

    render(<App />);

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
    window.history.pushState({}, "", "/unknown");

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText(/supported terms/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });

  it("shows a link to the default term on error page", async () => {
    window.history.pushState({}, "", "/nosuchterm");

    render(<App />);

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
    window.history.pushState({}, "", "/SP2026");

    render(<App />);

    await waitFor(
      () => {
        expect(screen.getByText(/current term: sp2026/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
