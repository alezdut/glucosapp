import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import {
  ChevronDown,
  ChevronUp,
  Coffee,
  Sun,
  Moon,
  Apple,
  Clock,
  Activity,
  Edit3,
  Wine,
  Thermometer,
  Frown,
  Droplets,
  CookingPot,
} from "lucide-react-native";
import { theme } from "../theme";
import type { LogEntry, MealCategory, InsulinType } from "@glucosapp/types";

interface HistoryListItemProps {
  entry: LogEntry;
  isExpanded: boolean;
  onToggle: () => void;
}

/**
 * Get icon component for meal type
 */
const getMealTypeIcon = (mealType?: MealCategory) => {
  const iconProps = { size: 24, color: theme.colors.primary };
  if (!mealType) return <Activity {...iconProps} />;

  const icons: Record<MealCategory, React.ReactElement> = {
    BREAKFAST: <Coffee {...iconProps} />,
    LUNCH: <Sun {...iconProps} />,
    DINNER: <Moon {...iconProps} />,
    SNACK: <Apple {...iconProps} />,
    CORRECTION: <Clock {...iconProps} />,
  };
  return icons[mealType] || <Activity {...iconProps} />;
};

/**
 * Get label for meal type
 */
const getMealTypeLabel = (mealType?: MealCategory): string => {
  if (!mealType) return "Registro";
  const labels: Record<MealCategory, string> = {
    BREAKFAST: "Desayuno",
    LUNCH: "Almuerzo",
    DINNER: "Cena",
    SNACK: "Snack",
    CORRECTION: "Corrección",
  };
  return labels[mealType] || "Registro";
};

/**
 * Get label for insulin type
 */
const getInsulinTypeLabel = (insulinType?: InsulinType): string => {
  if (!insulinType) return "";
  const labels: Record<InsulinType, string> = {
    BOLUS: "Rápida",
    BASAL: "Lenta",
  };
  return labels[insulinType] || "";
};

/**
 * Get glucose level color based on value
 */
const getGlucoseColor = (glucose: number): string => {
  if (glucose < 70) return theme.colors.error; // Low
  if (glucose > 180) return theme.colors.warning; // High
  return theme.colors.success; // Normal
};

/**
 * HistoryListItem component - Expandable card showing log entry details
 */
export const HistoryListItem = ({ entry, isExpanded, onToggle }: HistoryListItemProps) => {
  const glucose = entry.glucoseEntry?.mgdl;
  const insulinDose = entry.insulinDose;
  const mealType = entry.mealType;
  const carbs = entry.carbohydrates;
  const mealTemplate = entry.mealTemplate;

  const recordedDate = new Date(entry.recordedAt);
  const dateStr = recordedDate.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const timeStr = recordedDate.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Check if entry has any context factors
  const hasContext =
    entry.recentExercise ||
    entry.alcohol ||
    entry.illness ||
    entry.stress ||
    entry.menstruation ||
    entry.highFatMeal;

  return (
    <TouchableOpacity style={styles.card} onPress={onToggle} activeOpacity={0.7}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>{getMealTypeIcon(mealType)}</View>
          <View style={styles.headerInfo}>
            <View style={styles.mealTypeRow}>
              <Text style={styles.mealType}>{getMealTypeLabel(mealType)}</Text>
              {/* Show context icons when collapsed */}
              {!isExpanded && hasContext && (
                <View style={styles.contextIconsCollapsed}>
                  {entry.recentExercise && <Activity size={16} color={theme.colors.primary} />}
                  {entry.alcohol && <Wine size={16} color={theme.colors.primary} />}
                  {entry.illness && <Thermometer size={16} color={theme.colors.primary} />}
                  {entry.stress && <Frown size={16} color={theme.colors.primary} />}
                  {entry.menstruation && <Droplets size={16} color={theme.colors.primary} />}
                  {entry.highFatMeal && <CookingPot size={16} color={theme.colors.primary} />}
                </View>
              )}
            </View>
            <Text style={styles.dateTime}>
              {dateStr} - {timeStr}
            </Text>
          </View>
        </View>
        {isExpanded ? (
          <ChevronUp size={20} color={theme.colors.textSecondary} />
        ) : (
          <ChevronDown size={20} color={theme.colors.textSecondary} />
        )}
      </View>

      {/* Collapsed View - Summary */}
      <View style={styles.summary}>
        {/* Glucosa - Siempre en primera posición */}
        {glucose ? (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel} numberOfLines={1}>
              Glucosa
            </Text>
            <Text
              style={[styles.summaryValue, { color: getGlucoseColor(glucose) }]}
              numberOfLines={1}
            >
              {glucose} mg/dL
            </Text>
          </View>
        ) : (
          <View style={styles.summaryItem} />
        )}

        {/* Carbohidratos - Siempre en segunda posición (puede estar vacío) */}
        {carbs !== undefined && carbs > 0 ? (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel} numberOfLines={1}>
              Carbs
            </Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {carbs}g
            </Text>
          </View>
        ) : (
          <View style={styles.summaryItem} />
        )}

        {/* Insulina - Siempre en tercera posición */}
        {insulinDose && insulinDose.units > 0 ? (
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel} numberOfLines={1}>
              Insulina
            </Text>
            <Text style={styles.summaryValue} numberOfLines={1}>
              {insulinDose.units.toFixed(1)} U
            </Text>
          </View>
        ) : (
          <View style={styles.summaryItem} />
        )}
      </View>

      {/* Expanded View - Details */}
      {isExpanded && (
        <View style={styles.details}>
          {/* Divider */}
          <View style={styles.divider} />

          {/* Glucose Details */}
          {glucose && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Glucosa</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Valor medido:</Text>
                <Text style={[styles.detailValue, { color: getGlucoseColor(glucose) }]}>
                  {glucose} mg/dL
                </Text>
              </View>
            </View>
          )}

          {/* Carbohydrates and Meal Details */}
          {((carbs !== undefined && carbs > 0) || mealTemplate) && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Comida</Text>
              {carbs !== undefined && carbs > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Carbohidratos totales:</Text>
                  <Text style={styles.detailValue}>{carbs}g</Text>
                </View>
              )}
              {mealTemplate && (
                <>
                  {mealTemplate.name && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Comida guardada:</Text>
                      <Text style={styles.detailValue}>{mealTemplate.name}</Text>
                    </View>
                  )}
                  {mealTemplate.foodItems && mealTemplate.foodItems.length > 0 && (
                    <View style={styles.foodItemsContainer}>
                      <Text style={styles.detailLabel}>Alimentos:</Text>
                      {mealTemplate.foodItems.map((item) => (
                        <View key={item.id} style={styles.foodItem}>
                          <Text style={styles.foodItemName}>• {item.name}</Text>
                          <Text style={styles.foodItemDetails}>
                            {item.quantity}g ({item.carbs}g carbs)
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </View>
          )}

          {/* Insulin Details */}
          {insulinDose && insulinDose.units > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Insulina</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Tipo:</Text>
                <Text style={styles.detailValue}>{getInsulinTypeLabel(insulinDose.type)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dosis aplicada:</Text>
                <Text style={styles.detailValue}>{insulinDose.units.toFixed(1)} U</Text>
              </View>
              {insulinDose.calculatedUnits !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Dosis calculada:</Text>
                  <Text style={styles.detailValue}>{insulinDose.calculatedUnits.toFixed(1)} U</Text>
                </View>
              )}
              {insulinDose.wasManuallyEdited && (
                <View style={styles.warningBadge}>
                  <Edit3 size={14} color={theme.colors.warning} style={styles.warningIcon} />
                  <Text style={styles.warningText}>Editado manualmente</Text>
                </View>
              )}

              {/* Calculation Breakdown */}
              {(insulinDose.carbInsulin !== undefined ||
                insulinDose.correctionInsulin !== undefined ||
                insulinDose.iobSubtracted !== undefined) && (
                <View style={styles.breakdownContainer}>
                  <Text style={styles.breakdownTitle}>Desglose del cálculo:</Text>
                  {insulinDose.carbInsulin !== undefined && insulinDose.carbInsulin > 0 && (
                    <Text style={styles.breakdownItem}>
                      • Dosis prandial: {insulinDose.carbInsulin.toFixed(1)} U
                    </Text>
                  )}
                  {insulinDose.correctionInsulin !== undefined &&
                    insulinDose.correctionInsulin > 0 && (
                      <Text style={styles.breakdownItem}>
                        • Corrección: {insulinDose.correctionInsulin.toFixed(1)} U
                      </Text>
                    )}
                  {insulinDose.iobSubtracted !== undefined && insulinDose.iobSubtracted > 0 && (
                    <Text style={styles.breakdownItem}>
                      • IOB restado: -{insulinDose.iobSubtracted.toFixed(1)} U
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Context Information */}
          {(entry.recentExercise ||
            entry.alcohol ||
            entry.illness ||
            entry.stress ||
            entry.menstruation ||
            entry.highFatMeal) && (
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionTitle}>Contexto Adicional</Text>
              <View style={styles.contextBadgesContainer}>
                {entry.recentExercise && (
                  <View style={styles.contextBadge}>
                    <Activity
                      size={14}
                      color={theme.colors.primary}
                      style={styles.contextBadgeIcon}
                    />
                    <Text style={styles.contextBadgeText}>Ejercicio Reciente</Text>
                  </View>
                )}
                {entry.alcohol && (
                  <View style={styles.contextBadge}>
                    <Wine size={14} color={theme.colors.primary} style={styles.contextBadgeIcon} />
                    <Text style={styles.contextBadgeText}>Alcohol</Text>
                  </View>
                )}
                {entry.illness && (
                  <View style={styles.contextBadge}>
                    <Thermometer
                      size={14}
                      color={theme.colors.primary}
                      style={styles.contextBadgeIcon}
                    />
                    <Text style={styles.contextBadgeText}>Enfermedad</Text>
                  </View>
                )}
                {entry.stress && (
                  <View style={styles.contextBadge}>
                    <Frown size={14} color={theme.colors.primary} style={styles.contextBadgeIcon} />
                    <Text style={styles.contextBadgeText}>Estrés</Text>
                  </View>
                )}
                {entry.menstruation && (
                  <View style={styles.contextBadge}>
                    <Droplets
                      size={14}
                      color={theme.colors.primary}
                      style={styles.contextBadgeIcon}
                    />
                    <Text style={styles.contextBadgeText}>Periodo Menstrual</Text>
                  </View>
                )}
                {entry.highFatMeal && (
                  <View style={styles.contextBadge}>
                    <CookingPot
                      size={14}
                      color={theme.colors.primary}
                      style={styles.contextBadgeIcon}
                    />
                    <Text style={styles.contextBadgeText}>Comida Alta en Grasa</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    shadowColor: theme.colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: theme.spacing.sm,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
  },
  mealType: {
    fontSize: theme.fontSize.lg,
    fontWeight: "700",
    color: theme.colors.text,
  },
  mealTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.xs,
    flexWrap: "wrap",
  },
  dateTime: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  contextIconsCollapsed: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    paddingLeft: theme.spacing.xs,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  summary: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: theme.spacing.sm,
  },
  summaryItem: {
    flex: 1,
    minWidth: 0,
  },
  summaryLabel: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
    fontWeight: "500",
  },
  summaryValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: "700",
    color: theme.colors.text,
  },
  details: {
    marginTop: theme.spacing.sm,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.md,
  },
  detailSection: {
    marginBottom: theme.spacing.md,
  },
  detailSectionTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: "700",
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing.xs,
  },
  detailLabel: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.textSecondary,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.text,
  },
  foodItemsContainer: {
    marginTop: theme.spacing.sm,
  },
  foodItem: {
    marginTop: theme.spacing.xs,
    paddingLeft: theme.spacing.sm,
  },
  foodItemName: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.text,
    fontWeight: "500",
  },
  foodItemDetails: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  warningBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.warning + "20",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginTop: theme.spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.warning,
    gap: theme.spacing.xs,
  },
  warningIcon: {
    marginRight: 2,
  },
  warningText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.warning,
    fontWeight: "600",
  },
  breakdownContainer: {
    backgroundColor: theme.colors.primary + "10",
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.sm,
  },
  breakdownTitle: {
    fontSize: theme.fontSize.sm,
    fontWeight: "600",
    color: theme.colors.primary,
    marginBottom: theme.spacing.xs,
  },
  breakdownItem: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
    opacity: 0.8,
  },
  contextBadgesContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs,
  },
  contextBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.colors.primary + "15",
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary + "40",
  },
  contextBadgeIcon: {
    marginRight: theme.spacing.xs,
  },
  contextBadgeText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.primary,
    fontWeight: "600",
  },
});
