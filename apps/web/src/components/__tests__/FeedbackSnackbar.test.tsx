"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { FeedbackSnackbar } from "../FeedbackSnackbar";

describe("FeedbackSnackbar", () => {
  it("renders the message with custom severity and closes from both alert and snackbar", () => {
    const onClose = jest.fn();

    render(
      <FeedbackSnackbar
        open
        message="Cambios guardados"
        severity="success"
        autoHideDuration={4500}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("Cambios guardados")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Cambios guardados");

    fireEvent.click(screen.getByTitle(/close/i));
    expect(onClose).toHaveBeenCalled();
  });

  it("uses default props when severity and positioning are omitted", () => {
    render(<FeedbackSnackbar open message="Info" onClose={jest.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Info");
  });
});
