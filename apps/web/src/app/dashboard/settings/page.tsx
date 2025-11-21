"use client";

import { useState, useEffect, useRef } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { useAuth } from "@/contexts/auth-context";
import { updateProfile } from "@/lib/profile-api";
import { FeedbackSnackbar } from "@/components/FeedbackSnackbar";
import { AlertConfigCard } from "@/components/dashboard/AlertConfigCard";
import { IndividualAlertConfig } from "@/components/dashboard/IndividualAlertConfig";
import { NotificationPreferences } from "@/components/dashboard/NotificationPreferences";
import { SeverityBadge } from "@/components/dashboard/SeverityBadge";
import {
  TextField,
  Button,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Checkbox,
  MenuItem,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { Droplet, Scale, Globe, Download, User, TrendingUp, Bell } from "lucide-react";
import { colors } from "@glucosapp/theme";
import {
  GlucoseUnit,
  Language,
  GLUCOSE_UNIT_OPTIONS,
  LANGUAGE_OPTIONS,
  WEIGHT_UNIT_OPTIONS,
  type WeightUnit,
  NotificationFrequency,
  NOTIFICATION_FREQUENCY_OPTIONS,
  ALERT_THRESHOLD_RANGES,
  type AlertSettings,
  type UpdateAlertSettingsPayload,
} from "@glucosapp/types";
import { useAlertSettings, useUpdateAlertSettings } from "@/hooks/useAlertSettings";

/**
 * Settings page for application configuration and report generation
 */
export default function SettingsPage() {
  const { refreshUser } = useAuth();

  // General Settings State
  const [glucoseUnit, setGlucoseUnit] = useState<GlucoseUnit>(GlucoseUnit.MG_DL);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(WEIGHT_UNIT_OPTIONS[0].value);
  const [defaultLanguage, setDefaultLanguage] = useState<Language>(Language.ES);
  const [isSavingGeneral, setIsSavingGeneral] = useState(false);
  const [generalFeedback, setGeneralFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Alert Settings - applies to all doctor's patients
  const {
    data: alertSettings,
    isLoading: isLoadingAlertSettings,
    isError: isAlertSettingsError,
    error: alertSettingsError,
  } = useAlertSettings();
  const updateAlertSettingsMutation = useUpdateAlertSettings();
  const [alertFeedback, setAlertFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Local state for alert settings (initialized from API)
  const [localAlertSettings, setLocalAlertSettings] = useState<Partial<AlertSettings>>({});
  const previousAlertSettingsRef = useRef<string | null>(null);

  // State for validation errors (debounced)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize local state from API data only if it actually changed
  useEffect(() => {
    if (alertSettings) {
      // Serialize current settings to compare
      const currentSettingsString = JSON.stringify(alertSettings);

      // Only update if settings actually changed
      if (previousAlertSettingsRef.current !== currentSettingsString) {
        setLocalAlertSettings(alertSettings);
        previousAlertSettingsRef.current = currentSettingsString;
      }
    }
  }, [alertSettings]);

  // Debounced validation - runs 500ms after user stops typing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const errors: Record<string, string> = {};
      const settings = localAlertSettings;

      // Hypoglycemia threshold range validation
      if (settings.hypoglycemiaThreshold !== undefined && settings.hypoglycemiaThreshold > 0) {
        const min = ALERT_THRESHOLD_RANGES.HYPOGLYCEMIA.min;
        const max = ALERT_THRESHOLD_RANGES.HYPOGLYCEMIA.max;
        if (settings.hypoglycemiaThreshold < min || settings.hypoglycemiaThreshold > max) {
          errors.hypoglycemiaThreshold = `El valor debe estar entre ${min} y ${max} mg/dL`;
        }
      }

      // Hypoglycemia validation (cross-field with severe)
      if (settings.severeHypoglycemiaThreshold && settings.hypoglycemiaThreshold) {
        if (settings.severeHypoglycemiaThreshold >= settings.hypoglycemiaThreshold) {
          errors.severeHypoglycemiaThreshold =
            "El umbral de hipoglucemia severa debe ser menor que el umbral de hipoglucemia";
        }
      }

      // Hyperglycemia threshold range validation
      if (settings.hyperglycemiaThreshold !== undefined && settings.hyperglycemiaThreshold > 0) {
        const min = ALERT_THRESHOLD_RANGES.HYPERGLYCEMIA.min;
        const max = ALERT_THRESHOLD_RANGES.HYPERGLYCEMIA.max;
        if (settings.hyperglycemiaThreshold < min || settings.hyperglycemiaThreshold > max) {
          errors.hyperglycemiaThreshold = `El valor debe estar entre ${min} y ${max} mg/dL`;
        }
      }

      // Hyperglycemia validation (cross-field with hypoglycemia)
      if (settings.hyperglycemiaThreshold && settings.hypoglycemiaThreshold) {
        if (settings.hyperglycemiaThreshold <= settings.hypoglycemiaThreshold) {
          errors.hyperglycemiaThreshold =
            "El umbral de hiperglucemia debe ser mayor que el umbral de hipoglucemia";
        }
      }

      // Persistent hyperglycemia threshold range validation
      if (
        settings.persistentHyperglycemiaThreshold !== undefined &&
        settings.persistentHyperglycemiaThreshold > 0
      ) {
        const min = ALERT_THRESHOLD_RANGES.PERSISTENT_HYPERGLYCEMIA.min;
        const max = ALERT_THRESHOLD_RANGES.PERSISTENT_HYPERGLYCEMIA.max;
        if (
          settings.persistentHyperglycemiaThreshold < min ||
          settings.persistentHyperglycemiaThreshold > max
        ) {
          errors.persistentHyperglycemiaThreshold = `El valor debe estar entre ${min} y ${max} mg/dL`;
        }
      }

      // Persistent hyperglycemia validation (cross-field with hypoglycemia)
      if (settings.persistentHyperglycemiaThreshold && settings.hypoglycemiaThreshold) {
        if (settings.persistentHyperglycemiaThreshold <= settings.hypoglycemiaThreshold) {
          errors.persistentHyperglycemiaThreshold =
            "El umbral de hiperglucemia persistente debe ser mayor que el umbral de hipoglucemia";
        }
      }

      setValidationErrors(errors);
    }, 500); // 500ms delay

    // Cleanup timeout on unmount or when settings change
    return () => clearTimeout(timeoutId);
  }, [localAlertSettings]);

  // Helper function to get setting value with fallback to alertSettings
  const getSetting = <K extends keyof AlertSettings>(
    key: K,
    defaultValue?: AlertSettings[K],
  ): AlertSettings[K] | undefined => {
    if (localAlertSettings && key in localAlertSettings && localAlertSettings[key] !== undefined) {
      return localAlertSettings[key] as AlertSettings[K];
    }
    if (alertSettings && key in alertSettings) {
      return alertSettings[key];
    }
    return defaultValue;
  };

  // Individual Patient Report State
  const [selectedPatient, setSelectedPatient] = useState("");
  const [individualStartDate, setIndividualStartDate] = useState("2023-01-01");
  const [individualEndDate, setIndividualEndDate] = useState("2023-12-31");
  const [reportTypes, setReportTypes] = useState({
    glucosa: true,
    insulina: false,
    comidas: true,
    actividad: false,
  });

  // Group Patient Report State
  const [filterCriteria, setFilterCriteria] = useState("Diabetes Tipo 2, Rango de Edad...");
  const [groupStartDate, setGroupStartDate] = useState("2023-01-01");
  const [groupEndDate, setGroupEndDate] = useState("2023-12-31");
  const [groupReportTypes, setGroupReportTypes] = useState({
    glucosa: true,
    insulina: false,
    comidas: true,
    actividad: false,
  });

  const handleSaveGeneralSettings = async () => {
    const accessToken = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
    if (!accessToken) {
      setGeneralFeedback({
        type: "error",
        message: "No hay una sesión activa para guardar los cambios.",
      });
      return;
    }

    try {
      setIsSavingGeneral(true);
      setGeneralFeedback(null);
      await updateProfile(accessToken, {
        glucoseUnit,
        language: defaultLanguage,
      });
      await refreshUser();
      setGeneralFeedback({
        type: "success",
        message: "Preferencias guardadas correctamente.",
      });
    } catch (error) {
      setGeneralFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudieron guardar las preferencias. Intenta nuevamente.",
      });
    } finally {
      setIsSavingGeneral(false);
    }
  };

  const handleUpdateAlertSettings = async () => {
    if (Object.keys(validationErrors).length > 0) {
      setAlertFeedback({
        type: "error",
        message: "Por favor corrige los errores de validación antes de guardar.",
      });
      return;
    }

    try {
      setAlertFeedback(null);
      const channels = getSetting("notificationChannels") as
        | AlertSettings["notificationChannels"]
        | undefined;
      const frequency =
        getSetting("notificationFrequency", NotificationFrequency.IMMEDIATE) ??
        NotificationFrequency.IMMEDIATE;
      const payload: UpdateAlertSettingsPayload = {
        alertsEnabled: getSetting("alertsEnabled"),
        hypoglycemiaEnabled: getSetting("hypoglycemiaEnabled"),
        hypoglycemiaThreshold: getSetting("hypoglycemiaThreshold"),
        severeHypoglycemiaEnabled: getSetting("severeHypoglycemiaEnabled"),
        severeHypoglycemiaThreshold: getSetting("severeHypoglycemiaThreshold"),
        hyperglycemiaEnabled: getSetting("hyperglycemiaEnabled"),
        hyperglycemiaThreshold: getSetting("hyperglycemiaThreshold"),
        persistentHyperglycemiaEnabled: getSetting("persistentHyperglycemiaEnabled"),
        persistentHyperglycemiaThreshold: getSetting("persistentHyperglycemiaThreshold"),
        persistentHyperglycemiaWindowHours: getSetting("persistentHyperglycemiaWindowHours"),
        persistentHyperglycemiaMinReadings: getSetting("persistentHyperglycemiaMinReadings"),
        notificationChannels: channels
          ? { ...channels, push: false } // push always false for doctors (no mobile app access)
          : undefined,
        dailySummaryEnabled:
          frequency === NotificationFrequency.DAILY || frequency === NotificationFrequency.WEEKLY,
        dailySummaryTime: getSetting("dailySummaryTime"),
        quietHoursEnabled: getSetting("quietHoursEnabled"),
        quietHoursStart: getSetting("quietHoursStart"),
        quietHoursEnd: getSetting("quietHoursEnd"),
        criticalAlertsIgnoreQuietHours: getSetting("criticalAlertsIgnoreQuietHours"),
        notificationFrequency: frequency,
      };

      await updateAlertSettingsMutation.mutateAsync(payload);
      setAlertFeedback({
        type: "success",
        message: "Configuración de alertas guardada correctamente.",
      });
    } catch (error) {
      setAlertFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo guardar la configuración de alertas. Intenta nuevamente.",
      });
    }
  };

  const handleRestoreDefaults = () => {
    if (alertSettings) {
      setLocalAlertSettings({
        ...alertSettings,
        alertsEnabled: true,
        hypoglycemiaEnabled: true,
        hypoglycemiaThreshold: ALERT_THRESHOLD_RANGES.HYPOGLYCEMIA.default,
        severeHypoglycemiaEnabled: true,
        severeHypoglycemiaThreshold: ALERT_THRESHOLD_RANGES.SEVERE_HYPOGLYCEMIA.default,
        hyperglycemiaEnabled: true,
        hyperglycemiaThreshold: ALERT_THRESHOLD_RANGES.HYPERGLYCEMIA.default,
        persistentHyperglycemiaEnabled: true,
        persistentHyperglycemiaThreshold: ALERT_THRESHOLD_RANGES.PERSISTENT_HYPERGLYCEMIA.default,
        persistentHyperglycemiaWindowHours: 4,
        persistentHyperglycemiaMinReadings: 2,
        notificationChannels: { dashboard: true, email: false, push: false }, // push always false for doctors
        dailySummaryEnabled: true,
        dailySummaryTime: "08:00",
        quietHoursEnabled: false,
        quietHoursStart: undefined,
        quietHoursEnd: undefined,
        criticalAlertsIgnoreQuietHours: false,
        notificationFrequency: NotificationFrequency.IMMEDIATE,
      });
    }
  };

  const handleGenerateIndividualPDF = () => {
    // TODO: Implement PDF generation
    console.log("Generating individual PDF");
  };

  const handleGenerateIndividualCSV = () => {
    // TODO: Implement CSV generation
    console.log("Generating individual CSV");
  };

  const handleGenerateGroupPDF = () => {
    // TODO: Implement PDF generation
    console.log("Generating group PDF");
  };

  const handleGenerateGroupCSV = () => {
    // TODO: Implement CSV generation
    console.log("Generating group CSV");
  };

  const handleReportTypeChange = (type: keyof typeof reportTypes) => {
    setReportTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleGroupReportTypeChange = (type: keyof typeof groupReportTypes) => {
    setGroupReportTypes((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <Header />

        <main className="ml-64 mt-16 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Configuración de la Aplicación
            </h1>
          </div>

          {/* Application Configuration Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Configuración de la Aplicación
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* General Settings Column */}
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 3,
                }}
              >
                <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 600 }}>
                  General
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Establece las preferencias de idioma y unidades.
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  {/* Glucose Units */}
                  <TextField
                    select
                    label="Unidades de Glucosa"
                    value={glucoseUnit}
                    onChange={(e) => setGlucoseUnit(e.target.value as GlucoseUnit)}
                    fullWidth
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Droplet className="w-5 h-5 text-gray-500" />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {GLUCOSE_UNIT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Weight Units */}
                  <TextField
                    select
                    label="Unidades de Peso"
                    value={weightUnit}
                    onChange={(e) => setWeightUnit(e.target.value as WeightUnit)}
                    fullWidth
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Scale className="w-5 h-5 text-gray-500" />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {WEIGHT_UNIT_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Default Language */}
                  <TextField
                    select
                    label="Idioma Predeterminado"
                    value={defaultLanguage}
                    onChange={(e) => setDefaultLanguage(e.target.value as Language)}
                    fullWidth
                    variant="outlined"
                    SelectProps={{
                      native: false,
                    }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Globe className="w-5 h-5 text-gray-500" />
                        </InputAdornment>
                      ),
                    }}
                  >
                    {LANGUAGE_OPTIONS.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* Save Button */}
                  <Button
                    variant="contained"
                    onClick={handleSaveGeneralSettings}
                    disabled={isSavingGeneral}
                    sx={{
                      mt: 2,
                      bgcolor: colors.primary,
                      "&:hover": {
                        bgcolor: colors.primaryDark,
                      },
                    }}
                  >
                    {isSavingGeneral ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </Box>
              </Box>

              {/* Alert Settings Column */}
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 3,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Box>
                    <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 600 }}>
                      Configuración de Alertas
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Administra las alertas y notificaciones del sistema.
                    </Typography>
                  </Box>
                  {!isLoadingAlertSettings && alertSettings && (
                    <Switch
                      checked={getSetting("alertsEnabled", true) ?? true}
                      onChange={(e) =>
                        setLocalAlertSettings((prev) => ({
                          ...prev,
                          alertsEnabled: e.target.checked,
                        }))
                      }
                      color="primary"
                      inputProps={{ "aria-label": "Activar todas las alertas" }}
                    />
                  )}
                </Box>

                {isLoadingAlertSettings && !alertSettings && !localAlertSettings ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <Typography variant="body2" color="text.secondary">
                      Cargando configuración...
                    </Typography>
                  </Box>
                ) : isAlertSettingsError ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                    <Typography variant="body2" color="error">
                      Error al cargar la configuración:{" "}
                      {alertSettingsError instanceof Error
                        ? alertSettingsError.message
                        : "Error desconocido"}
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {/* Hypoglycemia Alerts Card */}
                    <AlertConfigCard
                      title="Alertas de Hipoglucemia"
                      icon={<Droplet className="w-5 h-5 text-blue-500" />}
                      enabled={
                        (getSetting("hypoglycemiaEnabled", true) ?? true) ||
                        (getSetting("severeHypoglycemiaEnabled", true) ?? true)
                      }
                      onToggle={(enabled) => {
                        if (enabled) {
                          // Al activar el toggle principal, activar ambos si ambos están desactivados
                          const currentHypo = getSetting("hypoglycemiaEnabled", true) ?? true;
                          const currentSevere =
                            getSetting("severeHypoglycemiaEnabled", true) ?? true;
                          setLocalAlertSettings((prev) => ({
                            ...prev,
                            hypoglycemiaEnabled: currentHypo || true, // Activar si estaba desactivado
                            severeHypoglycemiaEnabled: currentSevere || true, // Activar si estaba desactivado
                          }));
                        } else {
                          // Al desactivar el toggle principal, desactivar ambos
                          setLocalAlertSettings((prev) => ({
                            ...prev,
                            hypoglycemiaEnabled: false,
                            severeHypoglycemiaEnabled: false,
                          }));
                        }
                      }}
                      description="Configura las alertas para niveles bajos de glucosa"
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <IndividualAlertConfig
                          enabled={getSetting("hypoglycemiaEnabled", true) ?? true}
                          onEnabledChange={(enabled) =>
                            setLocalAlertSettings((prev) => ({
                              ...prev,
                              hypoglycemiaEnabled: enabled,
                            }))
                          }
                          threshold={getSetting("hypoglycemiaThreshold", 70) ?? 70}
                          onThresholdChange={(threshold) =>
                            setLocalAlertSettings((prev) => ({
                              ...prev,
                              hypoglycemiaThreshold: threshold,
                            }))
                          }
                          severity="high"
                          frequency={
                            getSetting("notificationFrequency", NotificationFrequency.IMMEDIATE) ??
                            NotificationFrequency.IMMEDIATE
                          }
                          onFrequencyChange={(frequency) =>
                            setLocalAlertSettings((prev) => ({
                              ...prev,
                              notificationFrequency: frequency,
                            }))
                          }
                          thresholdLabel="Hipoglucemia"
                          thresholdMin={ALERT_THRESHOLD_RANGES.HYPOGLYCEMIA.min}
                          thresholdMax={ALERT_THRESHOLD_RANGES.HYPOGLYCEMIA.max}
                          thresholdError={validationErrors.hypoglycemiaThreshold}
                        />
                        <IndividualAlertConfig
                          enabled={getSetting("severeHypoglycemiaEnabled", true) ?? true}
                          onEnabledChange={(enabled) =>
                            setLocalAlertSettings((prev) => ({
                              ...prev,
                              severeHypoglycemiaEnabled: enabled,
                            }))
                          }
                          threshold={getSetting("severeHypoglycemiaThreshold", 54) ?? 54}
                          onThresholdChange={(threshold) =>
                            setLocalAlertSettings((prev) => ({
                              ...prev,
                              severeHypoglycemiaThreshold: threshold,
                            }))
                          }
                          severity="critical"
                          frequency={
                            getSetting("notificationFrequency", NotificationFrequency.IMMEDIATE) ??
                            NotificationFrequency.IMMEDIATE
                          }
                          onFrequencyChange={(frequency) =>
                            setLocalAlertSettings((prev) => ({
                              ...prev,
                              notificationFrequency: frequency,
                            }))
                          }
                          thresholdLabel="Hipoglucemia Severa"
                          thresholdMin={ALERT_THRESHOLD_RANGES.SEVERE_HYPOGLYCEMIA.min}
                          thresholdMax={ALERT_THRESHOLD_RANGES.SEVERE_HYPOGLYCEMIA.max}
                          thresholdError={validationErrors.severeHypoglycemiaThreshold}
                        />
                      </Box>
                    </AlertConfigCard>

                    {/* Hyperglycemia Alerts Card */}
                    <AlertConfigCard
                      title="Alertas de Hiperglucemia"
                      icon={<TrendingUp className="w-5 h-5 text-orange-500" />}
                      enabled={
                        (getSetting("hyperglycemiaEnabled", true) ?? true) ||
                        (getSetting("persistentHyperglycemiaEnabled", true) ?? true)
                      }
                      onToggle={(enabled) => {
                        if (enabled) {
                          // Al activar el toggle principal, activar ambos si ambos están desactivados
                          const currentHyper = getSetting("hyperglycemiaEnabled", true) ?? true;
                          const currentPersistent =
                            getSetting("persistentHyperglycemiaEnabled", true) ?? true;
                          setLocalAlertSettings((prev) => ({
                            ...prev,
                            hyperglycemiaEnabled: currentHyper || true, // Activar si estaba desactivado
                            persistentHyperglycemiaEnabled: currentPersistent || true, // Activar si estaba desactivado
                          }));
                        } else {
                          // Al desactivar el toggle principal, desactivar ambos
                          setLocalAlertSettings((prev) => ({
                            ...prev,
                            hyperglycemiaEnabled: false,
                            persistentHyperglycemiaEnabled: false,
                          }));
                        }
                      }}
                      description="Configura las alertas para niveles altos de glucosa"
                    >
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        <IndividualAlertConfig
                          enabled={getSetting("hyperglycemiaEnabled", true) ?? true}
                          onEnabledChange={(enabled) =>
                            setLocalAlertSettings((prev) => ({
                              ...prev,
                              hyperglycemiaEnabled: enabled,
                            }))
                          }
                          threshold={getSetting("hyperglycemiaThreshold", 250) ?? 250}
                          onThresholdChange={(threshold) =>
                            setLocalAlertSettings((prev) => ({
                              ...prev,
                              hyperglycemiaThreshold: threshold,
                            }))
                          }
                          severity="medium"
                          frequency={
                            getSetting("notificationFrequency", NotificationFrequency.IMMEDIATE) ??
                            NotificationFrequency.IMMEDIATE
                          }
                          onFrequencyChange={(frequency) =>
                            setLocalAlertSettings((prev) => ({
                              ...prev,
                              notificationFrequency: frequency,
                            }))
                          }
                          thresholdLabel="Hiperglucemia"
                          thresholdMin={ALERT_THRESHOLD_RANGES.HYPERGLYCEMIA.min}
                          thresholdMax={ALERT_THRESHOLD_RANGES.HYPERGLYCEMIA.max}
                          thresholdError={validationErrors.hyperglycemiaThreshold}
                        />
                        <Box
                          sx={{
                            p: 2,
                            bgcolor: "background.default",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              mb: 2,
                            }}
                          >
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={
                                    getSetting("persistentHyperglycemiaEnabled", true) ?? true
                                  }
                                  onChange={(e) =>
                                    setLocalAlertSettings((prev) => ({
                                      ...prev,
                                      persistentHyperglycemiaEnabled: e.target.checked,
                                    }))
                                  }
                                  color="primary"
                                />
                              }
                              label="Hiperglucemia Persistente"
                            />
                            <SeverityBadge severity="high" />
                          </Box>
                          {(getSetting("persistentHyperglycemiaEnabled", true) ?? true) && (
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              <TextField
                                label="Umbral"
                                type="text"
                                value={
                                  (getSetting("persistentHyperglycemiaThreshold", 250) ?? 250) > 0
                                    ? (getSetting("persistentHyperglycemiaThreshold", 250) ?? 250)
                                    : ""
                                }
                                onChange={(e) => {
                                  const value = e.target.value;
                                  // Only allow numbers (including empty string for deletion)
                                  if (value === "" || /^\d+$/.test(value)) {
                                    if (value === "") {
                                      // Set to 0 when empty (represents empty field, validation will ignore it)
                                      setLocalAlertSettings((prev) => ({
                                        ...prev,
                                        persistentHyperglycemiaThreshold: 0,
                                      }));
                                    } else {
                                      const numValue = parseInt(value, 10);
                                      if (!isNaN(numValue)) {
                                        setLocalAlertSettings((prev) => ({
                                          ...prev,
                                          persistentHyperglycemiaThreshold: numValue,
                                        }));
                                      }
                                    }
                                  }
                                }}
                                fullWidth
                                size="small"
                                variant="outlined"
                                error={!!validationErrors.persistentHyperglycemiaThreshold}
                                helperText={validationErrors.persistentHyperglycemiaThreshold}
                                InputProps={{
                                  endAdornment: (
                                    <InputAdornment position="end">mg/dL</InputAdornment>
                                  ),
                                }}
                              />
                              <Box sx={{ display: "flex", gap: 2 }}>
                                <TextField
                                  label="Ventana de Tiempo"
                                  type="number"
                                  value={getSetting("persistentHyperglycemiaWindowHours", 4) ?? 4}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value, 10);
                                    if (!isNaN(value)) {
                                      setLocalAlertSettings((prev) => ({
                                        ...prev,
                                        persistentHyperglycemiaWindowHours: value,
                                      }));
                                    }
                                  }}
                                  fullWidth
                                  size="small"
                                  variant="outlined"
                                  inputProps={{ min: 2, max: 24 }}
                                  InputProps={{
                                    endAdornment: (
                                      <InputAdornment position="end">horas</InputAdornment>
                                    ),
                                  }}
                                />
                                <TextField
                                  label="Mín. Lecturas"
                                  type="number"
                                  value={getSetting("persistentHyperglycemiaMinReadings", 2) ?? 2}
                                  onChange={(e) => {
                                    const value = parseInt(e.target.value, 10);
                                    if (!isNaN(value)) {
                                      setLocalAlertSettings((prev) => ({
                                        ...prev,
                                        persistentHyperglycemiaMinReadings: value,
                                      }));
                                    }
                                  }}
                                  fullWidth
                                  size="small"
                                  variant="outlined"
                                  inputProps={{ min: 2, max: 10 }}
                                />
                              </Box>
                              <FormControl fullWidth size="small">
                                <InputLabel>Frecuencia de Notificación</InputLabel>
                                <Select
                                  label="Frecuencia de Notificación"
                                  value={
                                    localAlertSettings.notificationFrequency ??
                                    NotificationFrequency.IMMEDIATE
                                  }
                                  onChange={(e) =>
                                    setLocalAlertSettings((prev) => ({
                                      ...prev,
                                      notificationFrequency: e.target.value,
                                    }))
                                  }
                                >
                                  {NOTIFICATION_FREQUENCY_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>
                                      {option.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </AlertConfigCard>

                    {/* Notification Preferences Card */}
                    <AlertConfigCard
                      title="Preferencias de Notificación"
                      icon={<Bell className="w-5 h-5 text-gray-500" />}
                      enabled={true}
                      onToggle={() => {}}
                      showToggle={false}
                      description="Configura cómo y cuándo recibir notificaciones"
                    >
                      <NotificationPreferences
                        channels={
                          (getSetting(
                            "notificationChannels",
                          ) as AlertSettings["notificationChannels"]) ?? {
                            dashboard: true,
                            email: false,
                            push: false,
                          }
                        }
                        onChannelsChange={(channels) =>
                          setLocalAlertSettings((prev) => ({
                            ...prev,
                            notificationChannels: channels,
                          }))
                        }
                        notificationFrequency={
                          getSetting("notificationFrequency", NotificationFrequency.IMMEDIATE) ??
                          NotificationFrequency.IMMEDIATE
                        }
                        dailySummaryTime={getSetting("dailySummaryTime", "08:00") ?? "08:00"}
                        onDailySummaryTimeChange={(time) =>
                          setLocalAlertSettings((prev) => ({ ...prev, dailySummaryTime: time }))
                        }
                        quietHoursEnabled={getSetting("quietHoursEnabled", false) ?? false}
                        onQuietHoursChange={(enabled) =>
                          setLocalAlertSettings((prev) => ({ ...prev, quietHoursEnabled: enabled }))
                        }
                        quietHoursStart={getSetting("quietHoursStart", "22:00") ?? "22:00"}
                        onQuietHoursStartChange={(time) =>
                          setLocalAlertSettings((prev) => ({ ...prev, quietHoursStart: time }))
                        }
                        quietHoursEnd={getSetting("quietHoursEnd", "07:00") ?? "07:00"}
                        onQuietHoursEndChange={(time) =>
                          setLocalAlertSettings((prev) => ({ ...prev, quietHoursEnd: time }))
                        }
                        criticalAlertsIgnoreQuietHours={
                          getSetting("criticalAlertsIgnoreQuietHours", false) ?? false
                        }
                        onCriticalAlertsIgnoreQuietHoursChange={(enabled) =>
                          setLocalAlertSettings((prev) => ({
                            ...prev,
                            criticalAlertsIgnoreQuietHours: enabled,
                          }))
                        }
                      />
                    </AlertConfigCard>

                    {/* Action Buttons */}
                    <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
                      <Button
                        variant="contained"
                        onClick={handleUpdateAlertSettings}
                        disabled={
                          updateAlertSettingsMutation.isPending ||
                          Object.keys(validationErrors).length > 0
                        }
                        sx={{
                          flex: 1,
                          bgcolor: colors.primary,
                          "&:hover": {
                            bgcolor: colors.primaryDark,
                          },
                          "&:disabled": {
                            bgcolor: "action.disabledBackground",
                            color: "action.disabled",
                          },
                        }}
                      >
                        {updateAlertSettingsMutation.isPending
                          ? "Guardando..."
                          : "Guardar Configuración"}
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={handleRestoreDefaults}
                        disabled={updateAlertSettingsMutation.isPending}
                        sx={{
                          borderColor: colors.border,
                          color: colors.text,
                          "&:hover": {
                            borderColor: colors.borderDark,
                            bgcolor: "background.default",
                          },
                        }}
                      >
                        Restaurar Valores por Defecto
                      </Button>
                    </Box>
                  </Box>
                )}
              </Box>
            </div>
          </div>

          {/* Report Generation Section */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Generación de Informes</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Individual Patient Report Column */}
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 3,
                }}
              >
                <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 600 }}>
                  Informe de Paciente Individual
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Genera un informe detallado para un paciente específico.
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  {/* Patient Search */}
                  <TextField
                    label="Seleccionar Paciente"
                    placeholder="Buscar paciente..."
                    value={selectedPatient}
                    onChange={(e) => setSelectedPatient(e.target.value)}
                    fullWidth
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <User className="w-5 h-5 text-gray-500" />
                        </InputAdornment>
                      ),
                    }}
                  />

                  {/* Date Range */}
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      label="Fecha Inicio"
                      type="date"
                      value={individualStartDate}
                      onChange={(e) => setIndividualStartDate(e.target.value)}
                      fullWidth
                      variant="outlined"
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                    <TextField
                      label="Fecha Fin"
                      type="date"
                      value={individualEndDate}
                      onChange={(e) => setIndividualEndDate(e.target.value)}
                      fullWidth
                      variant="outlined"
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Box>

                  {/* Report Type Checkboxes */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                      Tipo de Informe
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={reportTypes.glucosa}
                            onChange={() => handleReportTypeChange("glucosa")}
                            color="primary"
                          />
                        }
                        label="Glucosa"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={reportTypes.insulina}
                            onChange={() => handleReportTypeChange("insulina")}
                            color="primary"
                          />
                        }
                        label="Insulina"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={reportTypes.comidas}
                            onChange={() => handleReportTypeChange("comidas")}
                            color="primary"
                          />
                        }
                        label="Comidas"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={reportTypes.actividad}
                            onChange={() => handleReportTypeChange("actividad")}
                            color="primary"
                          />
                        }
                        label="Actividad"
                      />
                    </Box>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleGenerateIndividualPDF}
                      startIcon={<Download className="w-4 h-4" />}
                      sx={{
                        flex: 1,
                        bgcolor: colors.success,
                        "&:hover": {
                          bgcolor: colors.successDark,
                        },
                      }}
                    >
                      Generar PDF
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleGenerateIndividualCSV}
                      startIcon={<Download className="w-4 h-4" />}
                      sx={{
                        flex: 1,
                        borderColor: colors.border,
                        color: colors.text,
                        "&:hover": {
                          borderColor: colors.borderDark,
                          bgcolor: "background.default",
                        },
                      }}
                    >
                      Generar CSV
                    </Button>
                  </Box>
                </Box>
              </Box>

              {/* Group Patient Report Column */}
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: 2,
                  border: "1px solid",
                  borderColor: "divider",
                  p: 3,
                }}
              >
                <Typography variant="h6" component="h3" sx={{ mb: 1, fontWeight: 600 }}>
                  Informe de Grupo de Pacientes
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Genera informes basados en criterios para grupos de pacientes.
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                  {/* Filter Criteria */}
                  <TextField
                    label="Criterios de Filtrado"
                    value={filterCriteria}
                    onChange={(e) => setFilterCriteria(e.target.value)}
                    fullWidth
                    variant="outlined"
                    placeholder="Diabetes Tipo 2, Rango de Edad..."
                  />

                  {/* Date Range */}
                  <Box sx={{ display: "flex", gap: 2 }}>
                    <TextField
                      label="Fecha Inicio"
                      type="date"
                      value={groupStartDate}
                      onChange={(e) => setGroupStartDate(e.target.value)}
                      fullWidth
                      variant="outlined"
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                    <TextField
                      label="Fecha Fin"
                      type="date"
                      value={groupEndDate}
                      onChange={(e) => setGroupEndDate(e.target.value)}
                      fullWidth
                      variant="outlined"
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Box>

                  {/* Report Type Checkboxes */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                      Tipo de Informe
                    </Typography>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={groupReportTypes.glucosa}
                            onChange={() => handleGroupReportTypeChange("glucosa")}
                            color="primary"
                          />
                        }
                        label="Glucosa"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={groupReportTypes.insulina}
                            onChange={() => handleGroupReportTypeChange("insulina")}
                            color="primary"
                          />
                        }
                        label="Insulina"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={groupReportTypes.comidas}
                            onChange={() => handleGroupReportTypeChange("comidas")}
                            color="primary"
                          />
                        }
                        label="Comidas"
                      />
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={groupReportTypes.actividad}
                            onChange={() => handleGroupReportTypeChange("actividad")}
                            color="primary"
                          />
                        }
                        label="Actividad"
                      />
                    </Box>
                  </Box>

                  {/* Action Buttons */}
                  <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
                    <Button
                      variant="contained"
                      onClick={handleGenerateGroupPDF}
                      startIcon={<Download className="w-4 h-4" />}
                      sx={{
                        flex: 1,
                        bgcolor: colors.success,
                        "&:hover": {
                          bgcolor: colors.successDark,
                        },
                      }}
                    >
                      Generar PDF
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={handleGenerateGroupCSV}
                      startIcon={<Download className="w-4 h-4" />}
                      sx={{
                        flex: 1,
                        borderColor: colors.border,
                        color: colors.text,
                        "&:hover": {
                          borderColor: colors.borderDark,
                          bgcolor: "background.default",
                        },
                      }}
                    >
                      Generar CSV
                    </Button>
                  </Box>
                </Box>
              </Box>
            </div>
          </div>
        </main>

        {generalFeedback && (
          <FeedbackSnackbar
            open
            message={generalFeedback.message}
            severity={generalFeedback.type}
            onClose={() => setGeneralFeedback(null)}
          />
        )}

        {alertFeedback && (
          <FeedbackSnackbar
            open
            message={alertFeedback.message}
            severity={alertFeedback.type}
            onClose={() => setAlertFeedback(null)}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
