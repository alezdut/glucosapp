import React, { useState } from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import type { MarkedDates } from "react-native-calendars/src/types";
import { Calendar, DateData } from "react-native-calendars";
import { X, Check } from "lucide-react-native";
import { theme } from "../theme";
import { formatLocalDateAsYYYYMMDD } from "../utils/dateUtils";

interface DateRangeCalendarProps {
  visible: boolean;
  startDate: Date;
  endDate: Date;
  onConfirm: (startDate: Date, endDate: Date) => void;
  onCancel: () => void;
  minDate?: Date;
  maxDate?: Date;
}

/**
 * DateRangeCalendar component - Full calendar for selecting date ranges
 */
export const DateRangeCalendar: React.FC<DateRangeCalendarProps> = ({
  visible,
  startDate,
  endDate,
  onConfirm,
  onCancel,
  minDate,
  maxDate,
}) => {
  const [selectedStart, setSelectedStart] = useState<Date>(startDate);
  const [selectedEnd, setSelectedEnd] = useState<Date>(endDate);
  const [isSelectingEnd, setIsSelectingEnd] = useState(false);

  /**
   * Format date to YYYY-MM-DD for calendar library
   * Uses shared utility to avoid timezone shifts
   */
  const formatDateString = (date: Date): string => {
    return formatLocalDateAsYYYYMMDD(date);
  };

  /**
   * Handle day press
   */
  const handleDayPress = (day: DateData) => {
    // Create date from dateString to avoid timezone issues
    const [year, month, dayNum] = day.dateString.split("-").map(Number);
    const selectedDate = new Date(year, month - 1, dayNum, 0, 0, 0, 0);

    if (!isSelectingEnd) {
      // First selection - set start date
      setSelectedStart(selectedDate);
      setSelectedEnd(selectedDate);
      setIsSelectingEnd(true);
    } else {
      // Second selection - set end date
      if (selectedDate >= selectedStart) {
        setSelectedEnd(selectedDate);
      } else {
        // If selected date is before start, swap them
        setSelectedEnd(selectedStart);
        setSelectedStart(selectedDate);
      }
      setIsSelectingEnd(false);
    }
  };

  /**
   * Get marked dates for calendar
   */
  const getMarkedDates = (): MarkedDates => {
    const marked: MarkedDates = {};
    const start = formatDateString(selectedStart);
    const end = formatDateString(selectedEnd);

    // Mark all dates in range
    const current = new Date(selectedStart);
    const endDate = new Date(selectedEnd);

    while (current <= endDate) {
      const dateString = formatDateString(current);
      const isStart = dateString === start;
      const isEnd = dateString === end;
      const isMiddle = dateString !== start && dateString !== end;

      marked[dateString] = {
        selected: true,
        color: theme.colors.primary,
        textColor: theme.colors.background,
        startingDay: isStart,
        endingDay: isEnd,
        ...(isMiddle && { color: theme.colors.primary + "40" }),
      };

      current.setDate(current.getDate() + 1);
    }

    return marked;
  };

  /**
   * Handle confirm
   */
  const handleConfirm = () => {
    // Set times appropriately
    const start = new Date(selectedStart);
    start.setHours(0, 0, 0, 0);

    const end = new Date(selectedEnd);
    end.setHours(23, 59, 59, 999);

    onConfirm(start, end);
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    // Reset to original dates
    setSelectedStart(startDate);
    setSelectedEnd(endDate);
    setIsSelectingEnd(false);
    onCancel();
  };

  /**
   * Format date range display
   */
  const formatDateRangeDisplay = (): string => {
    const startStr = selectedStart.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    const endStr = selectedEnd.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    if (formatDateString(selectedStart) === formatDateString(selectedEnd)) {
      return endStr;
    }

    return `${startStr} - ${endStr}`;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
              <X size={24} color={theme.colors.text} />
            </TouchableOpacity>
            <Text style={styles.title}>Seleccionar Rango</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Selected Range Display */}
          <View style={styles.selectedRangeContainer}>
            <Text style={styles.selectedRangeLabel}>Rango seleccionado:</Text>
            <Text style={styles.selectedRangeText}>{formatDateRangeDisplay()}</Text>
          </View>

          {/* Instruction */}
          <Text style={styles.instruction}>
            {isSelectingEnd ? "Toca la fecha final del rango" : "Toca la fecha inicial del rango"}
          </Text>

          {/* Calendar */}
          <Calendar
            current={formatDateString(selectedStart)}
            minDate={minDate ? formatDateString(minDate) : undefined}
            maxDate={maxDate ? formatDateString(maxDate) : undefined}
            onDayPress={handleDayPress}
            markingType="period"
            markedDates={getMarkedDates()}
            theme={{
              backgroundColor: theme.colors.background,
              calendarBackground: theme.colors.background,
              textSectionTitleColor: theme.colors.textSecondary,
              selectedDayBackgroundColor: theme.colors.primary,
              selectedDayTextColor: theme.colors.background,
              todayTextColor: theme.colors.primary,
              dayTextColor: theme.colors.text,
              textDisabledColor: theme.colors.textSecondary + "60",
              monthTextColor: theme.colors.text,
              textMonthFontWeight: "bold",
              textDayFontSize: 16,
              textMonthFontSize: 18,
              textDayHeaderFontSize: 14,
              arrowColor: theme.colors.primary,
            }}
            style={styles.calendar}
          />

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Check size={20} color={theme.colors.background} />
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.xl,
    borderTopRightRadius: theme.borderRadius.xl,
    paddingBottom: theme.spacing.xl,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  placeholder: {
    width: 40,
  },
  selectedRangeContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.primary + "15",
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  selectedRangeLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  selectedRangeText: {
    fontSize: theme.fontSize.lg,
    fontWeight: "700",
    color: theme.colors.primary,
  },
  instruction: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    textAlign: "center",
    paddingVertical: theme.spacing.md,
    fontStyle: "italic",
  },
  calendar: {
    paddingHorizontal: theme.spacing.md,
  },
  actionButtons: {
    flexDirection: "row",
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  cancelButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.text,
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
    gap: theme.spacing.sm,
  },
  confirmButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.background,
  },
});
