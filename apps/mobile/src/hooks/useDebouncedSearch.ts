import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Custom hook for debounced search with automatic execution
 * @param searchFunction - The async function to execute the search
 * @param delay - Delay in milliseconds (default: 500)
 * @returns Object with search query state and handlers
 */
export const useDebouncedSearch = <T>(
  searchFunction: (query: string) => Promise<T>,
  delay: number = 500,
) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<T | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchIdRef = useRef(0);

  /**
   * Execute the search
   */
  const executeSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults(null);
        return;
      }

      // Increment search ID to track this specific search
      const currentSearchId = ++searchIdRef.current;

      setIsSearching(true);
      try {
        const results = await searchFunction(query);

        // Only update results if this is still the most recent search
        if (currentSearchId === searchIdRef.current) {
          setSearchResults(results);
        }
      } catch (error) {
        console.error("Search error:", error);
        // Only clear results if this is still the most recent search
        if (currentSearchId === searchIdRef.current) {
          setSearchResults(null);
        }
      } finally {
        // Only update loading state if this is still the most recent search
        if (currentSearchId === searchIdRef.current) {
          setIsSearching(false);
        }
      }
    },
    [searchFunction],
  );

  /**
   * Effect to implement debounced search
   * Automatically searches after user stops typing
   */
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query is empty
    if (!searchQuery.trim()) {
      // Increment search ID to cancel any in-flight fetches
      searchIdRef.current++;
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      executeSearch(searchQuery);
    }, delay);

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, delay, executeSearch]);

  /**
   * Clear search results and query
   */
  const clearSearch = useCallback(() => {
    // Increment search ID to cancel any pending searches
    searchIdRef.current++;
    setSearchQuery("");
    setSearchResults(null);
    setIsSearching(false);
  }, []);

  /**
   * Trigger immediate search (bypass debounce)
   */
  const searchNow = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    executeSearch(searchQuery);
  }, [searchQuery, executeSearch]);

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    clearSearch,
    searchNow,
  };
};
