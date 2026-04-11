"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { SearchProvider, useSearch } from "../search-context";

const SearchConsumer = () => {
  const { searchQuery, setSearchQuery } = useSearch();

  return (
    <div>
      <span>{searchQuery || "empty"}</span>
      <button onClick={() => setSearchQuery("ana paz")}>update search</button>
    </div>
  );
};

describe("search-context", () => {
  it("throws when the hook is used outside the provider", () => {
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});

    expect(() => render(<SearchConsumer />)).toThrow(
      "useSearch must be used within a SearchProvider",
    );

    spy.mockRestore();
  });

  it("stores and updates the search query inside the provider", () => {
    render(
      <SearchProvider>
        <SearchConsumer />
      </SearchProvider>,
    );

    expect(screen.getByText("empty")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /update search/i }));

    expect(screen.getByText("ana paz")).toBeInTheDocument();
  });
});
