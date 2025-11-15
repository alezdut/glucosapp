import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Calendar, Edit3 } from "lucide-react-native";
import { theme } from "../theme";
import { DateRangeCalendar } from "./DateRangeCalendar";

export type DateRangePreset = "today" | "week" | "month" | "custom";

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onDateRangeChange: (startDate: Date, endDate: Date) => void;
}

/**
 * DateRangePicker component - Select date range with presets
 */
export const DateRangePicker = ({
  startDate,
  endDate,
  onDateRangeChange,
}: DateRangePickerProps) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [activePreset, setActivePreset] = useState<DateRangePreset>("week");

  /**
   * Format date range for display
   */
  const formatDateRange = (): string => {
    const startStr = startDate.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const endStr = endDate.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${startStr} - ${endStr}`;
  };

  /**
   * Handle preset button press
   */
  const handlePresetPress = (preset: DateRangePreset) => {
    setActivePreset(preset);

    if (preset === "custom") {
      // Open calendar for custom selection
      setShowCalendar(true);
      return;
    }

    const now = new Date();
    let start: Date;
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (preset) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        break;
      case "week":
        start = new Date(now);
        start.setDate(now.getDate() - 7);
        start.setHours(0, 0, 0, 0);
        break;
      case "month":
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
        break;
    }

    onDateRangeChange(start, end);
  };

  /**
   * Handle calendar confirm
   */
  const handleCalendarConfirm = (newStartDate: Date, newEndDate: Date) => {
    onDateRangeChange(newStartDate, newEndDate);
    setActivePreset("custom");
    setShowCalendar(false);
  };

  /**
   * Handle calendar cancel
   */
  const handleCalendarCancel = () => {
    setShowCalendar(false);
  };

  return (
    <View style={styles.container}>
      {/* Date Range Display */}
      <TouchableOpacity
        style={styles.dateDisplay}
        onPress={() => setShowCalendar(true)}
        activeOpacity={0.7}
      >
        <Calendar size={20} color={theme.colors.primary} />
        <Text style={styles.dateText}>{formatDateRange()}</Text>
      </TouchableOpacity>

      {/* Preset Buttons */}
      <View style={styles.presetContainer}>
        <TouchableOpacity
          style={[styles.presetButton, activePreset === "today" && styles.presetButtonActive]}
          onPress={() => handlePresetPress("today")}
          activeOpacity={0.7}
        >
          <Text style={[styles.presetText, activePreset === "today" && styles.presetTextActive]}>
            Hoy
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.presetButton, activePreset === "week" && styles.presetButtonActive]}
          onPress={() => handlePresetPress("week")}
          activeOpacity={0.7}
        >
          <Text style={[styles.presetText, activePreset === "week" && styles.presetTextActive]}>
            7 días
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.presetButton, activePreset === "month" && styles.presetButtonActive]}
          onPress={() => handlePresetPress("month")}
          activeOpacity={0.7}
        >
          <Text style={[styles.presetText, activePreset === "month" && styles.presetTextActive]}>
            30 días
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.presetButtonIcon, activePreset === "custom" && styles.presetButtonActive]}
          onPress={() => handlePresetPress("custom")}
          activeOpacity={0.7}
        >
          <Edit3
            size={20}
            color={activePreset === "custom" ? theme.colors.background : theme.colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Full Calendar Modal */}
      <DateRangeCalendar
        visible={showCalendar}
        startDate={startDate}
        endDate={endDate}
        onConfirm={handleCalendarConfirm}
        onCancel={handleCalendarCancel}
        minDate={new Date(2020, 0, 1)}
        maxDate={new Date()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.lg,
  },
  dateDisplay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary + "15",
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + "30",
    marginBottom: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  dateText: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.primary,
    flex: 1,
  },
  presetContainer: {
    flexDirection: "row",
    gap: theme.spacing.sm,
  },
  presetButton: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  presetButtonIcon: {
    width: 48,
    height: 48,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  presetButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  presetText: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.text,
  },
  presetTextActive: {
    color: theme.colors.background,
  },
});
