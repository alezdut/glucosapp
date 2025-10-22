import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";
import { theme } from "../theme";

export interface DateTimePickerProps {
  value: Date | null;
  onDateChange: (date: Date | null) => void;
  placeholder?: string;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  disabled?: boolean;
  showIcon?: boolean;
  mode?: "date" | "time" | "datetime";
  showButton?: boolean;
  visible?: boolean;
}

export const CustomDateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onDateChange,
  placeholder = "Seleccionar fecha",
  label,
  minimumDate = new Date(1900, 0, 1),
  maximumDate = new Date(2015, 11, 31),
  disabled = false,
  showIcon = true,
  mode = "date",
  showButton = true,
  visible = false,
}) => {
  const [showDatePicker, setShowDatePicker] = React.useState(visible);
  const [tempValue, setTempValue] = React.useState<Date | null>(value);

  // Update showDatePicker when visible prop changes
  React.useEffect(() => {
    setShowDatePicker(visible);
  }, [visible]);

  // Update tempValue when value prop changes
  React.useEffect(() => {
    setTempValue(value);
  }, [value]);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    // En Android, el picker se cierra automáticamente
    // En iOS, solo actualizamos el valor pero no cerramos el picker
    if (Platform.OS === "android") {
      setShowDatePicker(false);
      if (selectedDate) {
        onDateChange(selectedDate);
      }
    } else {
      // En iOS, solo actualizamos el valor temporalmente
      // El picker se cierra solo cuando el usuario presiona "Listo"
      if (selectedDate) {
        setTempValue(selectedDate);
      }
    }
  };

  const handleCloseDatePicker = () => {
    // En iOS, confirmamos el valor temporal cuando se presiona "Listo"
    if (Platform.OS === "ios" && tempValue) {
      onDateChange(tempValue);
    }
    setShowDatePicker(false);
  };

  const handleNowButton = () => {
    const now = new Date();
    setTempValue(now);
    onDateChange(now);
    setShowDatePicker(false);
  };

  const handleOpenDatePicker = () => {
    if (!disabled) {
      setShowDatePicker(true);
    }
  };

  const formatDate = (date: Date) => {
    if (mode === "time") {
      return date.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (mode === "datetime") {
      return date.toLocaleString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } else {
      return date.toLocaleDateString("es-ES", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  return (
    <View style={styles.container}>
      {showButton && (
        <>
          {label && <Text style={styles.label}>{label}</Text>}
          <TouchableOpacity
            style={[styles.datePickerButton, disabled && styles.datePickerButtonDisabled]}
            onPress={handleOpenDatePicker}
            disabled={disabled}
          >
            <Text style={[styles.datePickerText, disabled && styles.datePickerTextDisabled]}>
              {value ? formatDate(value) : placeholder}
            </Text>
            {showIcon && (
              <Calendar
                size={16}
                color={disabled ? theme.colors.textTertiary : theme.colors.primary}
              />
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Date Picker Modal for iOS */}
      {Platform.OS === "ios" && showDatePicker && (
        <Modal transparent animationType="fade" visible={showDatePicker}>
          <TouchableWithoutFeedback onPress={handleCloseDatePicker}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <View style={styles.datePickerContainer}>
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity onPress={handleNowButton}>
                      <Text style={styles.datePickerNowButton}>Ahora</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleCloseDatePicker}>
                      <Text style={styles.datePickerDoneButton}>Listo</Text>
                    </TouchableOpacity>
                  </View>
                  <DateTimePicker
                    value={tempValue || value || new Date(2000, 0, 1)}
                    mode={mode}
                    display="spinner"
                    onChange={handleDateChange}
                    maximumDate={maximumDate}
                    minimumDate={minimumDate}
                    style={styles.datePickerIOS}
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}

      {/* Date Picker for Android */}
      {Platform.OS === "android" && showDatePicker && (
        <DateTimePicker
          value={tempValue || value || new Date(2000, 0, 1)}
          mode={mode}
          display="default"
          onChange={handleDateChange}
          maximumDate={maximumDate}
          minimumDate={minimumDate}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  datePickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  datePickerButtonDisabled: {
    backgroundColor: theme.colors.backgroundGray,
    borderColor: theme.colors.border,
  },
  datePickerText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.text,
    fontWeight: "500",
  },
  datePickerTextDisabled: {
    color: theme.colors.textTertiary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  datePickerContainer: {
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: theme.borderRadius.lg,
    borderTopRightRadius: theme.borderRadius.lg,
    paddingBottom: theme.spacing.xl,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  datePickerNowButton: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.warning,
    fontWeight: "600",
  },
  datePickerDoneButton: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  datePickerIOS: {
    height: 200,
    backgroundColor: theme.colors.background,
  },
});
