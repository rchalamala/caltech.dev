import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("defaults the root path to the current term", () => {
    render(<App />);

    expect(screen.getByText(/current term: sp2026/i)).toBeInTheDocument();
    expect(screen.getByText(/choose workspace/i)).toBeInTheDocument();
  });

  it("renders a supported term directly from the pathname", () => {
    window.history.replaceState({}, "", "/fa2025");

    render(<App />);

    expect(screen.getByText(/current term: fa2025/i)).toBeInTheDocument();
  });
});
