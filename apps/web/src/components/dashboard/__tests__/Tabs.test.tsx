"use client";

import { fireEvent, render, screen } from "@testing-library/react";
import { Tabs } from "../Tabs";

describe("Tabs", () => {
  it("renders tabs and switches the active tab", () => {
    const onTabChange = jest.fn();

    render(
      <Tabs
        tabs={[
          { id: "glucose", label: "Glucosa" },
          { id: "notes", label: "Notas" },
        ]}
        activeTab="glucose"
        onTabChange={onTabChange}
      />,
    );

    expect(screen.getByRole("navigation", { name: "Tabs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Glucosa" }).className).toContain("border-blue-500");

    fireEvent.click(screen.getByRole("button", { name: "Notas" }));
    expect(onTabChange).toHaveBeenCalledWith("notes");
  });
});
