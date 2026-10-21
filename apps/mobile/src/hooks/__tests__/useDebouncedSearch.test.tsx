import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import React from "react";
import { act } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { useDebouncedSearch } from "../useDebouncedSearch";
import { renderMobile } from "../../../test/render-mobile";

jest.useFakeTimers();

function SearchProbe({ searchFunction }: { searchFunction: (query: string) => Promise<string[]> }) {
  const { searchQuery, setSearchQuery, searchResults, isSearching, clearSearch, searchNow } =
    useDebouncedSearch(searchFunction, 300);

  return (
    <div>
      <input
        aria-label="search-input"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
      />
      <button type="button" onClick={searchNow}>
        search-now
      </button>
      <button type="button" onClick={clearSearch}>
        clear-search
      </button>
      <span data-testid="is-searching">{String(isSearching)}</span>
      <span data-testid="results">{searchResults?.join(",") ?? ""}</span>
    </div>
  );
}

describe("useDebouncedSearch", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("debounces searches until the user stops typing", async () => {
    const searchFunction = jest.fn().mockResolvedValue(["manzana"]);

    renderMobile(<SearchProbe searchFunction={searchFunction} />);

    fireEvent.change(screen.getByLabelText("search-input"), {
      target: { value: "ma" },
    });

    act(() => {
      jest.advanceTimersByTime(299);
    });

    expect(searchFunction).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(searchFunction).toHaveBeenCalledWith("ma");
    });
  });

  it("keeps only the latest search result when older requests resolve late", async () => {
    let firstResolve: (value: string[]) => void = () => {};
    let secondResolve: (value: string[]) => void = () => {};
    const searchFunction = jest
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<string[]>((resolve) => {
            firstResolve = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<string[]>((resolve) => {
            secondResolve = resolve;
          }),
      );

    renderMobile(<SearchProbe searchFunction={searchFunction} />);

    fireEvent.change(screen.getByLabelText("search-input"), {
      target: { value: "ma" },
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    fireEvent.change(screen.getByLabelText("search-input"), {
      target: { value: "manzana" },
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(searchFunction).toHaveBeenCalledTimes(2);
    });

    await act(async () => {
      secondResolve(["manzana roja"]);
    });
    await act(async () => {
      firstResolve(["ma vieja"]);
    });

    expect(screen.getByTestId("results").textContent).toBe("manzana roja");
  });

  it("searches immediately when searchNow is used", async () => {
    const searchFunction = jest.fn().mockResolvedValue(["banana"]);

    renderMobile(<SearchProbe searchFunction={searchFunction} />);

    fireEvent.change(screen.getByLabelText("search-input"), {
      target: { value: "banana" },
    });
    fireEvent.click(screen.getByRole("button", { name: "search-now" }));

    await waitFor(() => {
      expect(searchFunction).toHaveBeenCalledWith("banana");
    });
  });

  it("clears pending state and results when clearSearch is triggered", async () => {
    const searchFunction = jest.fn().mockResolvedValue(["pera"]);

    renderMobile(<SearchProbe searchFunction={searchFunction} />);

    fireEvent.change(screen.getByLabelText("search-input"), {
      target: { value: "pera" },
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(screen.getByTestId("results").textContent).toBe("pera");
    });

    fireEvent.click(screen.getByRole("button", { name: "clear-search" }));

    expect((screen.getByLabelText("search-input") as HTMLInputElement).value).toBe("");
    expect(screen.getByTestId("results").textContent).toBe("");
    expect(screen.getByTestId("is-searching").textContent).toBe("false");
  });
});
