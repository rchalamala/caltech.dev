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

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);

    const [backdropButton] = screen.getAllByRole("button");
    fireEvent.click(backdropButton);
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
