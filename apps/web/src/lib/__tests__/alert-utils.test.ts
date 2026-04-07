import { QueryClient } from "@tanstack/react-query";
import { invalidateAlertQueries } from "@/lib/alert-utils";

describe("invalidateAlertQueries", () => {
  it("invalidates and refetches all related alert queries", async () => {
    const queryClient = new QueryClient();
    const invalidateQueries = jest
      .spyOn(queryClient, "invalidateQueries")
      .mockResolvedValue(undefined as never);
    const refetchQueries = jest
      .spyOn(queryClient, "refetchQueries")
      .mockResolvedValue(undefined as never);

    await invalidateAlertQueries(queryClient);

    expect(invalidateQueries.mock.calls).toEqual([
      [{ queryKey: ["alerts", "unacknowledged"] }],
      [{ queryKey: ["alerts"] }],
      [{ queryKey: ["dashboard", "recent-alerts"] }],
      [{ queryKey: ["dashboard", "summary"] }],
    ]);
    expect(refetchQueries.mock.calls).toEqual([
      [{ queryKey: ["alerts", "unacknowledged"], type: "active" }],
      [{ queryKey: ["alerts"], type: "active" }],
      [{ queryKey: ["dashboard", "recent-alerts"], type: "active" }],
      [{ queryKey: ["dashboard", "summary"], type: "active" }],
    ]);
  });
});
