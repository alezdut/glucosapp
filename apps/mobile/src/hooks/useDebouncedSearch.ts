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

  /**
   * Execute the search
   */
  const executeSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setSearchResults(null);
        return;
      }

      setIsSearching(true);
      try {
        const results = await searchFunction(query);
        setSearchResults(results);
      } catch (error) {
        console.error("Search error:", error);
        setSearchResults(null);
      } finally {
        setIsSearching(false);
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
      setSearchResults(null);
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
    setSearchQuery("");
    setSearchResults(null);
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
