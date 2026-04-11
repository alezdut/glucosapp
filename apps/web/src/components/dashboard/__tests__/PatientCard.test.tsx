import { render, screen } from "@testing-library/react";
import { PatientCard } from "../PatientCard";

jest.mock("next/image", () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => <img {...props} alt={props.alt} />,
}));

describe("PatientCard", () => {
  it("renders patient details with recent glucose data", () => {
    render(
      <PatientCard
        patient={
          {
            id: "patient-1",
            email: "patient@example.com",
            firstName: "Ana",
            lastName: "Paz",
            status: "Riesgo",
            activityStatus: "Activo",
            diabetesType: "TYPE_1",
            lastGlucoseReading: {
              value: 132,
              recordedAt: "2026-04-08T10:00:00.000Z",
            },
          } as never
        }
      />,
    );

    expect(screen.getByText("Ana Paz")).toBeInTheDocument();
    expect(screen.getByText(/132 mg\/dL/i)).toBeInTheDocument();
    expect(screen.getByText("Tipo 1")).toBeInTheDocument();
    expect(screen.getByText("Riesgo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver detalles/i })).toHaveAttribute(
      "href",
      "/dashboard/patients/patient-1",
    );
  });

  it("returns null for invalid patients and shows empty reading state otherwise", () => {
    const { rerender, container } = render(<PatientCard patient={null as never} />);
    expect(container).toBeEmptyDOMElement();

    rerender(
      <PatientCard
        patient={
          {
            id: "patient-2",
            email: "patient-2@example.com",
            status: "Estable",
            activityStatus: "Inactivo",
          } as never
        }
      />,
    );

    expect(screen.getByText(/sin lecturas recientes/i)).toBeInTheDocument();
  });
});
