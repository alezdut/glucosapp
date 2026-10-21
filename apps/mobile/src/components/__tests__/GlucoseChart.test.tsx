import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { render, screen } from "@testing-library/react";
import { LineChart } from "react-native-gifted-charts";
import { GlucoseChart, type GlucoseDataPoint } from "../GlucoseChart";

const lineChartPropsHistory: Array<Record<string, unknown>> = [];

jest.mock("react-native-gifted-charts", () => ({
  LineChart: (props: Record<string, unknown>) => {
    lineChartPropsHistory.push(props);
    return <div data-testid="line-chart" />;
  },
}));

const mockLineChart = LineChart as jest.MockedFunction<typeof LineChart>;

describe("GlucoseChart", () => {
  beforeEach(() => {
    lineChartPropsHistory.length = 0;
    jest.clearAllMocks();
  });

  it("renders empty state when there is no data", () => {
    render(<GlucoseChart data={[]} title="Historial" />);

    expect(screen.getByText("Historial")).toBeTruthy();
    expect(screen.getByText("No hay datos disponibles")).toBeTruthy();
    expect(screen.queryByTestId("line-chart")).toBeNull();
  });

  it("builds target-range chart props, reference lines and out-of-range data points", () => {
    const data: GlucoseDataPoint[] = [
      { glucose: 60, timestamp: new Date(2026, 3, 9, 8, 0, 0, 0) },
      { glucose: 110, timestamp: new Date(2026, 3, 9, 9, 0, 0, 0) },
      { glucose: 190, timestamp: new Date(2026, 3, 9, 10, 0, 0, 0) },
    ];

    render(
      <GlucoseChart
        data={data}
        targetRange={{ min: 70, max: 140 }}
        title="Glucosa"
        showAllDataPoints
        alignToLabels
        endPadding={10}
        labelOffset={6}
      />,
    );

    expect(screen.getByText("Glucosa")).toBeTruthy();
    expect(screen.getByText("Rango objetivo: 70 - 140")).toBeTruthy();
    expect(screen.getByText("(mg/dL)")).toBeTruthy();
    expect(screen.getByTestId("line-chart")).toBeTruthy();

    const props = lineChartPropsHistory[lineChartPropsHistory.length - 1];

    expect(props).toMatchObject({
      height: 220,
      overflowTop: 0,
      overflowBottom: 0,
      initialSpacing: 0,
      endSpacing: 0,
      adjustToWidth: false,
      showReferenceLine1: true,
      showReferenceLine2: true,
    });

    expect(props.xAxisLength).toBeGreaterThan(0);

    expect(props.data).toEqual([
      {
        value: 60,
        dataPointRadius: 5,
        dataPointColor: expect.any(String),
      },
      {
        value: 85,
        dataPointRadius: 5,
        dataPointColor: expect.any(String),
      },
      {
        value: 190,
        dataPointRadius: 5,
        dataPointColor: expect.any(String),
      },
    ]);

    expect(props.yAxisOffset).toBe(35);
    expect(props.maxValue).toBe(140);
    expect(props.noOfSections).toBe(7);
    expect(props.stepValue).toBe(20);
    expect(props.referenceLine1Position).toBe(140);
    expect(props.referenceLine2Position).toBe(70);
    expect(props.referenceLine1Config.labelText).toBe("Máx: 140");
    expect(props.referenceLine2Config.labelText).toBe("Mín: 70");
  });

  it("renders inline empty state with no target range as a compact fallback", () => {
    render(
      <GlucoseChart
        data={[
          { glucose: 100, timestamp: new Date(2026, 3, 1, 8, 0, 0, 0) },
          { glucose: 102, timestamp: new Date(2026, 3, 1, 9, 0, 0, 0) },
        ]}
        inline
        showTargetRangeSubtitle={false}
      />,
    );

    const props = lineChartPropsHistory[lineChartPropsHistory.length - 1];
    expect(props).toMatchObject({
      adjustToWidth: true,
      showReferenceLine1: false,
      showReferenceLine2: false,
    });
    expect(props.yAxisOffset).toBeUndefined();
    expect(props.referenceLine1Config).toBeUndefined();
    expect(props.referenceLine2Config).toBeUndefined();
  });
});
