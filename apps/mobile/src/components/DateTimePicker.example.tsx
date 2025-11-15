import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { CustomDateTimePicker } from "./DateTimePicker";
import { theme } from "../theme";

/**
 * Ejemplo de uso del CustomDateTimePicker
 * Este archivo muestra diferentes formas de usar el componente
 */
export const DateTimePickerExample: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [appointmentDate, setAppointmentDate] = useState<Date | null>(null);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ejemplos de DateTimePicker</Text>

      {/* Ejemplo básico */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ejemplo Básico</Text>
        <CustomDateTimePicker
          value={selectedDate}
          onDateChange={setSelectedDate}
          label="Selecciona una fecha"
          placeholder="Elige una fecha"
        />
      </View>

      {/* Ejemplo con restricciones de fecha */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ejemplo con Restricciones</Text>
        <CustomDateTimePicker
          value={appointmentDate}
          onDateChange={setAppointmentDate}
          label="Fecha de Cita Médica"
          placeholder="Selecciona fecha de cita"
          minimumDate={new Date()} // Solo fechas futuras
          maximumDate={new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)} // Máximo 1 año
        />
      </View>

      {/* Ejemplo con modo datetime */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ejemplo con Fecha y Hora</Text>
        <CustomDateTimePicker
          value={selectedDate}
          onDateChange={setSelectedDate}
          label="Fecha y Hora del Evento"
          placeholder="Selecciona fecha y hora"
          mode="datetime"
          minimumDate={new Date(2020, 0, 1)}
          maximumDate={new Date()}
        />
      </View>

      {/* Ejemplo deshabilitado */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ejemplo Deshabilitado</Text>
        <CustomDateTimePicker
          value={new Date(1990, 5, 15)}
          onDateChange={() => {}}
          label="Fecha de Nacimiento (Solo lectura)"
          placeholder="Fecha no editable"
          disabled={true}
          showIcon={false}
        />
      </View>

      {/* Ejemplo modal (sin botón) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ejemplo Modal</Text>
        <Text style={styles.description}>
          Este ejemplo muestra cómo usar el DateTimePicker como modal sin botón. Útil para mostrar
          el picker programáticamente.
        </Text>
        <CustomDateTimePicker
          value={selectedDate}
          onDateChange={setSelectedDate}
          mode="datetime"
          showButton={false}
          visible={false}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  description: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
    fontStyle: "italic",
  },
});
