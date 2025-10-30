import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { theme } from "../theme";

/**
 * Glucose reading data point
 */
export type GlucoseDataPoint = {
  glucose: number;
  timestamp: Date;
};

/**
 * Target glucose range
 */
export type TargetRange = {
  min: number;
  max: number;
};

/**
 * Props for GlucoseChart component
 */
type GlucoseChartProps = {
  /** Array of glucose readings with timestamps */
  data: GlucoseDataPoint[];
  /** Target glucose range (optional) */
  targetRange?: TargetRange;
  /** Chart title */
  title?: string;
  /** Chart height in pixels (default: theme.chartDimensions.defaultHeight) */
  height?: number;
  /** Chart width (kept for compatibility, but chart calculates width automatically based on data) */
  width?: number;
  /** Show subtitle with target range */
  showTargetRangeSubtitle?: boolean;
  /** Inline mode - removes card styling (no background, borders, shadows) */
  inline?: boolean;
};

/**
 * Reusable Glucose Chart Component
 *
 * Displays glucose readings over time with:
 * - Area chart with gradient fill
 * - Curved lines
 * - Color-coded data points for out-of-range values (red for hypoglycemia, orange for hyperglycemia)
 * - Dashed reference lines for target range (if provided)
 * - Hourly time labels on X-axis (excluding first and last points)
 * - Automatic spacing calculation to fit all data in screen width (no scrolling)
 * - Y-axis centered on target range with proper padding
 *
 * @example
 * ```tsx
 * <GlucoseChart
 *   data={historicalReadings}
 *   targetRange={{ min: 70, max: 140 }}
 *   title="Historial (últimas 8 horas)"
 *   showTargetRangeSubtitle
 * />
 * ```
 */
export const GlucoseChart = ({
  data,
  targetRange,
  title = "Historial de Glucosa",
  height = theme.chartDimensions.defaultHeight,
  width = theme.chartDimensions.defaultWidth,
  showTargetRangeSubtitle = true,
  inline = false,
}: GlucoseChartProps) => {
  // Calculate optimal spacing to fit all data in screen width
  const screenWidth = Dimensions.get("window").width;

  // Adjust padding based on inline mode
  // In inline mode: only parent container padding (contentWrapper)
  // In card mode: parent padding + card padding
  const containerPadding = theme.spacing.lg * 2; // Parent container padding
  const cardPadding = inline ? 0 : theme.spacing.lg * 2; // Card padding (only in card mode)
  const yAxisWidth = 50; // Space for Y-axis labels
  const availableWidth = screenWidth - containerPadding - cardPadding - yAxisWidth;

  // Calculate spacing based on data points to fit exactly in available width
  const dataPointsCount = data.length > 0 ? data.length : 1;
  const endSpacing = 10; // Small margin at the end
  const spacing = Math.max(2, (availableWidth - endSpacing) / dataPointsCount);

  /**
   * Transform glucose data to chart format
   * - Shows data points only for out-of-range values
   * - Red for hypoglycemia (below min), orange for hyperglycemia (above max)
   */
  const getChartData = () => {
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((reading) => {
      if (!targetRange) {
        return {
          value: reading.glucose,
          dataPointRadius: 0,
        };
      }

      const isBelowMin = reading.glucose < targetRange.min;
      const isAboveMax = reading.glucose > targetRange.max;
      const isOutOfRange = isBelowMin || isAboveMax;

      return {
        value: reading.glucose,
        dataPointRadius: isOutOfRange ? 5 : 0,
        dataPointColor: isBelowMin ? theme.colors.error : theme.colors.warning,
      };
    });
  };

  /**
   * Get hourly time labels for the full 8-hour range with vertical reference lines
   * Excludes first and last points (axis intersections)
   */
  const getTimeLabels = () => {
    if (!data || data.length === 0) {
      return [];
    }

    const formatTime = (timestamp: Date) => {
      const hours = timestamp.getHours();
      return `${hours}hs`;
    };

    // Group data by hour to find the first reading of each hour
    const allLabels: Array<{ position: number; time: string }> = [];
    const seenHours = new Set<number>();

    data.forEach((reading, index) => {
      const timestamp = new Date(reading.timestamp);
      const hour = timestamp.getHours();

      if (!seenHours.has(hour)) {
        seenHours.add(hour);

        // Calculate actual pixel position based on chart spacing
        // Position = index * spacing (no initialSpacing since it's 0)
        const pixelPosition = index * spacing;
        // Convert to percentage relative to availableWidth
        const position = pixelPosition / availableWidth;

        allLabels.push({
          position,
          time: formatTime(timestamp),
        });
      }
    });

    // Filter out first and last, keep only intermediate points
    if (allLabels.length <= 2) {
      return []; // Not enough points to show intermediate ones
    }

    return allLabels.slice(1, -1);
  };

  const chartData = getChartData();
  const timeLabels = getTimeLabels();

  /**
   * Calculate Y-axis range to center the target range
   * Ensures the target range is visually centered regardless of actual data values
   *
   * IMPORTANT: Must satisfy the constraint: maxValue = noOfSections * stepValue
   * See: https://www.npmjs.com/package/react-native-gifted-charts#common-issues
   */
  const getYAxisConfig = (): {
    yAxisOffset?: number;
    maxValue?: number;
    noOfSections?: number;
    stepValue?: number;
  } => {
    if (!targetRange) {
      return {}; // Auto-scale if no target range
    }

    // Calculate padding as 50% of the target range size on each side
    // This ensures the target range occupies ~50% of the chart height
    const rangeSize = targetRange.max - targetRange.min;
    const padding = rangeSize * 0.5;

    const desiredMin = Math.max(0, Math.floor(targetRange.min - padding));
    const desiredMax = Math.ceil(targetRange.max + padding);
    const totalRange = desiredMax - desiredMin;

    // Find a nice step value (prefer multiples of 10, 20, 25, 50)
    const niceSteps = [10, 20, 25, 30, 40, 50];
    let bestStepValue = 20;
    let bestSections = 6;

    for (const step of niceSteps) {
      const sections = Math.ceil(totalRange / step);
      if (sections >= 4 && sections <= 8) {
        bestStepValue = step;
        bestSections = sections;
        break;
      }
    }

    // CRITICAL: maxValue MUST equal noOfSections * stepValue (library constraint)
    // This represents the TOTAL RANGE of the Y-axis, not the absolute max value
    const yAxisOffset = desiredMin;
    const maxValue = bestSections * bestStepValue; // ✅ Satisfies constraint

    const config = {
      yAxisOffset: yAxisOffset,
      maxValue: maxValue,
      noOfSections: bestSections,
      stepValue: bestStepValue,
    };

    return config;
  };

  const yAxisConfig = getYAxisConfig();

  // Don't render if no data
  if (chartData.length === 0) {
    return (
      <View style={inline ? styles.inlineContainer : styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No hay datos disponibles</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={inline ? styles.inlineContainer : styles.container}>
      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Target range subtitle */}
      {targetRange && showTargetRangeSubtitle && (
        <View style={styles.rangeInfo}>
          <Text style={styles.targetRangeText}>
            Rango objetivo: {targetRange.min} - {targetRange.max}
          </Text>
          <Text style={styles.yAxisUnit}>(mg/dL)</Text>
        </View>
      )}

      {/* Chart */}
      <View style={styles.chartWrapper}>
        {/* Vertical reference lines - positioned to align with custom labels */}
        <View style={[styles.referenceLinesContainer, { height: height, width: availableWidth }]}>
          {timeLabels.map((label, index) => (
            <View
              key={`line-${index}`}
              style={[styles.verticalReferenceLine, { left: `${label.position * 100}%` }]}
            />
          ))}
        </View>

        <LineChart
          data={chartData}
          height={height}
          width={availableWidth}
          // Y-Axis config - must come first
          yAxisOffset={yAxisConfig.yAxisOffset}
          maxValue={yAxisConfig.maxValue}
          noOfSections={yAxisConfig.noOfSections}
          stepValue={yAxisConfig.stepValue}
          overflowTop={0}
          overflowBottom={0}
          // Spacing - calculated to fit all data in screen width, start at Y-axis
          spacing={spacing}
          initialSpacing={0}
          endSpacing={endSpacing}
          // Appearance
          color={theme.colors.primary}
          thickness={3}
          startFillColor={theme.colors.primary + "40"}
          endFillColor={theme.colors.primary + "10"}
          startOpacity={0.4}
          endOpacity={0.1}
          areaChart
          curved
          // Axes
          yAxisColor={theme.colors.border}
          xAxisColor={theme.colors.border}
          yAxisTextStyle={styles.axisText}
          hideAxesAndRules={false}
          xAxisThickness={1}
          yAxisLabelWidth={40}
          // Data points - only shown for out-of-range values
          hideDataPoints={false}
          // Grid
          rulesColor={theme.colors.border}
          rulesType="solid"
          showVerticalLines={false}
          // Behavior
          adjustToWidth={true}
          disableScroll={true}
          // Reference lines for target range
          showReferenceLine1={!!targetRange}
          referenceLine1Position={targetRange?.max}
          referenceLine1Config={
            targetRange
              ? {
                  color: theme.colors.primary,
                  thickness: 2,
                  type: "dashed",
                  dashWidth: 6,
                  dashGap: 4,
                  labelText: `Máx: ${targetRange.max}`,
                  labelTextStyle: {
                    fontSize: 11,
                    color: theme.colors.primary,
                    fontWeight: "600",
                  },
                }
              : undefined
          }
          showReferenceLine2={!!targetRange}
          referenceLine2Position={targetRange?.min}
          referenceLine2Config={
            targetRange
              ? {
                  color: theme.colors.primary,
                  thickness: 2,
                  type: "dashed",
                  dashWidth: 6,
                  dashGap: 4,
                  labelText: `Mín: ${targetRange.min}`,
                  labelTextStyle: {
                    fontSize: 11,
                    color: theme.colors.primary,
                    fontWeight: "600",
                  },
                }
              : undefined
          }
        />

        {/* Custom X-axis labels */}
        <View style={[styles.customXAxisContainer, { width: availableWidth }]}>
          {timeLabels.map((label, index) => (
            <Text
              key={index}
              style={[styles.customXAxisLabel, { left: `${label.position * 100}%` }]}
            >
              {label.time}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginVertical: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inlineContainer: {
    // No card styling - transparent background, no padding, no shadow
  },
  title: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  chartWrapper: {
    position: "relative",
  },
  referenceLinesContainer: {
    position: "absolute",
    left: 50, // Y-axis width - aligns with chart start
    pointerEvents: "none", // Allow touch events to pass through
  },
  verticalReferenceLine: {
    position: "absolute",
    width: 1,
    height: "100%",
    backgroundColor: theme.colors.border,
    borderStyle: "dashed",
    borderWidth: 1,
    borderColor: theme.colors.textSecondary,
    opacity: 0.1,
  },
  rangeInfo: {
    marginBottom: theme.spacing.md,
  },
  targetRangeText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.primary,
    fontWeight: "500",
    marginBottom: theme.spacing.xs,
  },
  yAxisUnit: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  axisText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
  },
  xAxisText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  customXAxisContainer: {
    position: "relative",
    height: 25,
    marginLeft: 50, // Y-axis width - aligns with chart start
    marginTop: -15, // Closer to the chart
  },
  customXAxisLabel: {
    position: "absolute",
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: "500",
    transform: [{ translateX: -12 }], // Center the label over the line
  },
  emptyState: {
    height: theme.chartDimensions.defaultHeight,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    fontStyle: "italic",
  },
});
