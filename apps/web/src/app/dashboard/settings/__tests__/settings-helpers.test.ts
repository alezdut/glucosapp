import {
  buildGroupReportFilters,
  getSelectedReportTypes,
  shouldEnableDailySummary,
  validateAlertSettings,
} from "../settings-helpers";

describe("settings helpers", () => {
  it("validates alert thresholds and cross-field relationships", () => {
    expect(
      validateAlertSettings({
        hypoglycemiaThreshold: 20,
        severeHypoglycemiaThreshold: 50,
        hyperglycemiaThreshold: 60,
        persistentHyperglycemiaThreshold: 65,
      }),
    ).toEqual({
      hypoglycemiaThreshold: "El valor debe estar entre 40 y 80 mg/dL",
      severeHypoglycemiaThreshold:
        "El umbral de hipoglucemia severa debe ser menor que el umbral de hipoglucemia",
      hyperglycemiaThreshold: "El valor debe estar entre 180 y 400 mg/dL",
      persistentHyperglycemiaThreshold: "El valor debe estar entre 180 y 400 mg/dL",
    });
  });

  it("builds group report filters from UI filters", () => {
    expect(
      buildGroupReportFilters([
        { type: "diabetesType", value: "TYPE_1" },
        { type: "activeOnly", value: "true" },
        { type: "search", value: "Ada" },
      ]),
    ).toEqual({
      diabetesType: "TYPE_1",
      activeOnly: true,
      search: "Ada",
    });
  });

  it("selects report types and daily summary behavior", () => {
    expect(
      getSelectedReportTypes(
        { glucosa: true, comidas: false, insulina: true },
        { glucosa: "glucose", insulina: "insulin" },
      ),
    ).toEqual(["glucose", "insulin"]);
    expect(shouldEnableDailySummary("DAILY")).toBe(true);
    expect(shouldEnableDailySummary("WEEKLY")).toBe(true);
    expect(shouldEnableDailySummary("IMMEDIATE")).toBe(false);
  });
});
