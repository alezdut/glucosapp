"use client";

import { render, screen } from "@testing-library/react";
import { PatientNotesMessages } from "../PatientNotesMessages";

describe("PatientNotesMessages", () => {
  it("renders the placeholder content for notes and messages", () => {
    render(<PatientNotesMessages />);

    expect(screen.getByText("Notas y Mensajes")).toBeInTheDocument();
    expect(screen.getByText("Funcionalidad próximamente")).toBeInTheDocument();
    expect(
      screen.getByText(/la sección de notas y mensajes estará disponible pronto/i),
    ).toBeInTheDocument();
  });
});
