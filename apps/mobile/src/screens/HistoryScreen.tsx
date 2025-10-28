import React, { useState, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { Download, Share2, FileText } from "lucide-react-native";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { theme } from "../theme";
import { createApiClient } from "../lib/api";
import type { LogEntry } from "@glucosapp/types";
import { ScreenHeader, DateRangePicker, HistoryListItem } from "../components";
import { convertLogEntriesToCsv, generateCsvFilename } from "../utils/csvExport";

/**
 * Get default date range (last 7 days)
 */
const getDefaultDateRange = () => {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  return { start: sevenDaysAgo, end: endOfToday };
};

/**
 * HistoryScreen component - Display log entries with filtering and export
 */
export default function HistoryScreen() {
  // Initialize date range to last 7 days
  const defaultRange = getDefaultDateRange();
  const [startDate, setStartDate] = useState<Date>(defaultRange.start);
  const [endDate, setEndDate] = useState<Date>(defaultRange.end);
  const [isExporting, setIsExporting] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  /**
   * Fetch log entries with date range filter
   */
  const {
    data: logEntries,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<LogEntry[]>({
    queryKey: ["logEntries", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      const client = createApiClient();

      // Build query string with date filters
      const queryParams = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      console.log("Fetching log entries with filters:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        url: `/log-entries?${queryParams.toString()}`,
      });

      const response = await client.GET(`/log-entries?${queryParams.toString()}`, {});

      if (response.error) {
        throw new Error("Failed to fetch log entries");
      }

      const entries = (response.data as LogEntry[]) || [];
      console.log(`Received ${entries.length} log entries`);

      return entries;
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't keep unused data in cache
  });

  /**
   * Reset filters when screen gains focus
   */
  useFocusEffect(
    useCallback(() => {
      const defaultRange = getDefaultDateRange();
      setStartDate(defaultRange.start);
      setEndDate(defaultRange.end);
      setResetKey((prev) => prev + 1); // Force DateRangePicker to reset
      setExpandedEntryId(null); // Collapse all entries
    }, []),
  );

  /**
   * Handle date range change
   */
  const handleDateRangeChange = (newStartDate: Date, newEndDate: Date) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
    setExpandedEntryId(null); // Collapse all entries when filter changes
  };

  /**
   * Export CSV to device
   */
  const handleExport = async () => {
    if (!logEntries || logEntries.length === 0) {
      Alert.alert("Sin datos", "No hay registros para exportar", [{ text: "OK" }]);
      return;
    }

    try {
      setIsExporting(true);

      // Convert entries to CSV
      const csvContent = convertLogEntriesToCsv(logEntries);
      const filename = generateCsvFilename(startDate, endDate);
      const fileUri = `${FileSystem.documentDirectory}${filename}`;

      // Write CSV file
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      Alert.alert("Éxito", `Archivo exportado exitosamente:\n${filename}`, [{ text: "OK" }]);
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Error", "No se pudo exportar el archivo", [{ text: "OK" }]);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Share CSV file
   */
  const handleShare = async () => {
    if (!logEntries || logEntries.length === 0) {
      Alert.alert("Sin datos", "No hay registros para compartir", [{ text: "OK" }]);
      return;
    }

    try {
      setIsExporting(true);

      // Check if sharing is available
      const isSharingAvailable = await Sharing.isAvailableAsync();
      if (!isSharingAvailable) {
        Alert.alert(
          "No disponible",
          "La función de compartir no está disponible en este dispositivo",
          [{ text: "OK" }],
        );
        return;
      }

      // Convert entries to CSV
      const csvContent = convertLogEntriesToCsv(logEntries);
      const filename = generateCsvFilename(startDate, endDate);
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      // Write CSV file to cache
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Compartir historial de GlucosApp",
        UTI: "public.comma-separated-values-text",
      });
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "No se pudo compartir el archivo", [{ text: "OK" }]);
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Handle toggle expand/collapse for entry
   */
  const handleToggleEntry = useCallback(
    (entryId: string) => {
      setExpandedEntryId((prevId) => {
        const newId = prevId === entryId ? null : entryId;

        // If expanding an entry, scroll to it after a short delay to allow re-render
        if (newId !== null && logEntries) {
          const index = logEntries.findIndex((entry) => entry.id === newId);
          if (index !== -1) {
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index,
                animated: true,
                viewPosition: 0.1, // Position item at 10% from top of visible area
              });
            }, 100);
          }
        }

        return newId;
      });
    },
    [logEntries],
  );

  /**
   * Render individual list item
   */
  const renderItem = ({ item }: { item: LogEntry }) => {
    return (
      <HistoryListItem
        entry={item}
        isExpanded={expandedEntryId === item.id}
        onToggle={() => handleToggleEntry(item.id)}
      />
    );
  };

  /**
   * Render empty state
   */
  const renderEmptyState = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyStateIconContainer}>
          <FileText size={64} color={theme.colors.textSecondary} />
        </View>
        <Text style={styles.emptyStateTitle}>No hay registros</Text>
        <Text style={styles.emptyStateText}>
          No se encontraron registros en el período seleccionado.
        </Text>
      </View>
    );
  };

  /**
   * Render error state
   */
  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.contentWrapper}>
          <ScreenHeader title="Mi Historial" />
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error al cargar el historial</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.contentWrapper}>
        <ScreenHeader title="Mi Historial" />

        <View style={styles.content}>
          {/* Date Range Picker */}
          <DateRangePicker
            key={resetKey}
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
          />

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleExport}
              disabled={isExporting || isLoading}
              activeOpacity={0.7}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Download size={18} color={theme.colors.primary} />
                  <Text style={styles.actionButtonText}>Exportar</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
              disabled={isExporting || isLoading}
              activeOpacity={0.7}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <>
                  <Share2 size={18} color={theme.colors.primary} />
                  <Text style={styles.actionButtonText}>Compartir</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Cargando historial...</Text>
            </View>
          )}

          {/* History List */}
          {!isLoading && (
            <FlatList
              ref={flatListRef}
              data={logEntries}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={renderEmptyState}
              onScrollToIndexFailed={(info) => {
                // Wait for layout, then retry
                setTimeout(() => {
                  flatListRef.current?.scrollToIndex({
                    index: info.index,
                    animated: true,
                    viewPosition: 0.1,
                  });
                }, 500);
              }}
              refreshControl={
                <RefreshControl
                  refreshing={isRefetching}
                  onRefresh={refetch}
                  tintColor={theme.colors.primary}
                />
              }
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
  },
  content: {
    flex: 1,
  },
  actionButtonsContainer: {
    flexDirection: "row",
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.background,
    borderWidth: 2,
    borderColor: theme.colors.primary,
    gap: theme.spacing.sm,
  },
  actionButtonText: {
    fontSize: theme.fontSize.md,
    fontWeight: "600",
    color: theme.colors.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xxxl,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: theme.spacing.xxxl,
    paddingHorizontal: theme.spacing.xl,
  },
  emptyStateIconContainer: {
    width: 100,
    height: 100,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: theme.colors.textSecondary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing.lg,
  },
  emptyStateTitle: {
    fontSize: theme.fontSize.xxl,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing.xl,
  },
  errorText: {
    fontSize: theme.fontSize.lg,
    color: theme.colors.error,
    marginBottom: theme.spacing.lg,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.background,
    fontSize: theme.fontSize.md,
    fontWeight: "600",
  },
});
