import { render, screen } from "@testing-library/react";
import AboutPage from "./page";

describe("release information", () => {
  it("provides versioned source, license and attribution links without requiring login", () => {
    render(<AboutPage />);
    expect(screen.getByRole("link", { name: "Código fuente de esta versión" })).toHaveAttribute(
      "href",
      "https://github.com/alezdut/glucosapp/tree/v0.1.0",
    );
    expect(screen.getByRole("link", { name: "Licencia AGPL-3.0" })).toHaveAttribute(
      "href",
      "https://github.com/alezdut/glucosapp/blob/v0.1.0/LICENSE",
    );
    expect(
      screen.getByRole("link", { name: "Atribuciones y licencias de terceros" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/alezdut/glucosapp/blob/v0.1.0/THIRD_PARTY_NOTICES.md",
    );
  });
});
