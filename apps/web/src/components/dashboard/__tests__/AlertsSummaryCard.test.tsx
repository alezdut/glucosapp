import { fireEvent, render, screen } from "@testing-library/react";
import { AlertsSummaryCard } from "../AlertsSummaryCard";

describe("AlertsSummaryCard", () => {
  it("renders critical alerts and triggers bulk acknowledge", () => {
    const onAcknowledgeAll = jest.fn();
    render(<AlertsSummaryCard criticalAlerts={3} days={7} onAcknowledgeAll={onAcknowledgeAll} />);

    expect(screen.getByText("3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /descartar todas/i }));
    expect(onAcknowledgeAll).toHaveBeenCalled();
  });

  it("hides the action when there are no critical alerts", () => {
    render(<AlertsSummaryCard criticalAlerts={0} days={7} onAcknowledgeAll={jest.fn()} />);
    expect(screen.queryByRole("button", { name: /descartar todas/i })).not.toBeInTheDocument();
  });
});
