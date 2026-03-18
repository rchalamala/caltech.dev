import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

describe("Modal", () => {
  it("renders content when open", () => {
    render(
      <Modal isOpen onClose={() => {}}>
        <p>Modal content</p>
      </Modal>,
    );

    expect(screen.getByText("Modal content")).toBeInTheDocument();
  });

  it("calls onClose when escape is pressed", () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen onClose={onClose}>
        <p>Modal content</p>
      </Modal>,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
