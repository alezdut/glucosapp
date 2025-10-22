import type { SupportedLanguage, I18nConfig, MessageKey, MessageParams } from "./types.js";
import { messages } from "./messages.js";

/**
 * Global i18n configuration
 */
let config: I18nConfig = {
  language: "en",
  fallbackLanguage: "en",
};

/**
 * Configure the global language for internationalization
 *
 * @param language - The language to use for translations
 * @param fallbackLanguage - Optional fallback language if translation is missing
 *
 * @example
 * ```typescript
 * import { configure } from 'mdi-insulin-algorithm';
 *
 * // Set Spanish as the language
 * configure('es');
 *
 * // Set Spanish with English fallback
 * configure('es', 'en');
 * ```
 */
export const configure = (
  language: SupportedLanguage,
  fallbackLanguage?: SupportedLanguage,
): void => {
  config = {
    language,
    fallbackLanguage: fallbackLanguage ?? "en",
  };
};

/**
 * Get the currently configured language
 *
 * @returns The current language
 */
export const getLanguage = (): SupportedLanguage => {
  return config.language;
};

/**
 * Translate a message key with optional parameter interpolation
 *
 * @param key - The message key to translate
 * @param params - Optional parameters for template string interpolation
 * @returns The translated message
 *
 * @example
 * ```typescript
 * import { t } from 'mdi-insulin-algorithm';
 *
 * // Simple translation
 * const warning = t('warnings.hypoglycemia');
 *
 * // Translation with parameters
 * const message = t('correction.wait3Hours', { hours: 2.5 });
 * ```
 */
export const t = (key: MessageKey, params?: MessageParams): string => {
  // Try to get translation from current language
  let message = messages[config.language]?.[key];

  // Fallback to fallback language if translation is missing
  if (!message && config.fallbackLanguage && config.fallbackLanguage !== config.language) {
    message = messages[config.fallbackLanguage]?.[key];
  }

  // Final fallback to English if still missing
  if (!message) {
    message = messages.en[key];
  }

  // If still no message found, return the key itself
  if (!message) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }

  // Interpolate parameters if provided
  if (params) {
    return interpolateTemplate(message, params);
  }

  return message;
};

/**
 * Interpolate template string with parameters
 *
 * @param template - The template string with ${variable} placeholders
 * @param params - Parameters to interpolate
 * @returns The interpolated string
 */
const interpolateTemplate = (template: string, params: MessageParams): string => {
  return template.replace(/\$\{([^}]+)\}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
};
