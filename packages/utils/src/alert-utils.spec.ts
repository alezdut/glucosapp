import {
  ALERT_TYPE_DEFAULT,
  ALERT_TYPE_LABELS,
  BUTTON_TEXT_ACKNOWLEDGE,
  BUTTON_TEXT_ACKNOWLEDGING,
  PATIENT_UNKNOWN,
  getAlertTypeLabel,
} from "./alert-utils";

describe("alert-utils", () => {
  it("returns known labels and falls back for unknown alert types", () => {
    expect(getAlertTypeLabel("HYPOGLYCEMIA")).toBe(ALERT_TYPE_LABELS.HYPOGLYCEMIA);
    expect(getAlertTypeLabel("UNMAPPED")).toBe(ALERT_TYPE_DEFAULT);
  });

  it("exports stable UI constants", () => {
    expect(PATIENT_UNKNOWN).toBe("Paciente desconocido");
    expect(BUTTON_TEXT_ACKNOWLEDGE).toContain("Paciente");
    expect(BUTTON_TEXT_ACKNOWLEDGING).toBe("Marcando...");
  });
});
