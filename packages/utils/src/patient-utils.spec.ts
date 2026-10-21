import { DiabetesType } from "@glucosapp/types";
import { DIABETES_TYPE_LABELS, getDiabetesTypeLabel } from "./patient-utils";

describe("patient-utils", () => {
  it("returns localized diabetes labels", () => {
    expect(getDiabetesTypeLabel(DiabetesType.TYPE_1)).toBe(DIABETES_TYPE_LABELS.TYPE_1);
    expect(getDiabetesTypeLabel(DiabetesType.TYPE_2)).toBe(DIABETES_TYPE_LABELS.TYPE_2);
  });

  it("falls back when the type is missing", () => {
    expect(getDiabetesTypeLabel(undefined)).toBe(DIABETES_TYPE_LABELS.NOT_SPECIFIED);
    expect(getDiabetesTypeLabel(undefined, null)).toBeNull();
  });
});
