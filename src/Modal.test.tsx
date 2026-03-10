import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Modal from "./Modal";

describe("Modal", () => {
  it("renders nothing while closed", () => {
    render(
      <Modal isOpen={false} onClose={vi.fn()}>
        <p>Hidden modal content</p>
      </Modal>,
    );

    expect(screen.queryByText("Hidden modal content")).not.toBeInTheDocument();
  });

  it("closes on escape and backdrop clicks", () => {
    const onClose = vi.fn();

    render(
      <Modal isOpen onClose={onClose}>
        <p>Visible modal content</p>
      </Modal>,
    );

    expect(screen.getByText("Visible modal content")).toBeInTheDocument();

    // Escape is now handled by onKeyDown on the dialog element
    const dialog = screen.getByRole("dialog");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    // Backdrop close button
    const backdropButton = screen.getByLabelText("Close dialog");
    fireEvent.click(backdropButton);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("has accessible dialog role and close button", () => {
    render(
      <Modal isOpen onClose={vi.fn()}>
        <p>Content</p>
      </Modal>,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");

    expect(screen.getByLabelText("Close")).toBeInTheDocument();
    expect(screen.getByLabelText("Close dialog")).toBeInTheDocument();
  });
});
