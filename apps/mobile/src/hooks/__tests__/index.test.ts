import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
jest.mock("../useDebounce", () => ({
  useDebounce: "useDebounceMock",
}));

jest.mock("../useAppointments", () => ({
  useMyAppointments: "useMyAppointmentsMock",
  useConfirmAppointment: "useConfirmAppointmentMock",
  useCancelAppointment: "useCancelAppointmentMock",
}));

jest.mock("../useDebouncedSearch", () => ({
  useDebouncedSearch: "useDebouncedSearchMock",
}));

jest.mock("../useRealTimeDoseCalculation", () => ({
  useRealTimeDoseCalculation: "useRealTimeDoseCalculationMock",
}));

jest.mock("../useRealTimeCorrectionCalculation", () => ({
  useRealTimeCorrectionCalculation: "useRealTimeCorrectionCalculationMock",
}));

jest.mock("../useDebouncedValidation", () => ({
  useDebouncedValidation: "useDebouncedValidationMock",
  useDebouncedValidationWithReset: "useDebouncedValidationWithResetMock",
}));

jest.mock("../useMessages", () => ({
  useConversationWithDoctor: "useConversationWithDoctorMock",
  useConversations: "useConversationsMock",
  useSendMessage: "useSendMessageMock",
  useMarkAsRead: "useMarkAsReadMock",
  useUnreadMessagesCount: "useUnreadMessagesCountMock",
  useUnreadMessagesFromDoctor: "useUnreadMessagesFromDoctorMock",
}));

describe("hooks index exports", () => {
  it("re-exports hook modules", () => {
    const exports = require("../index");

    expect(exports.useDebounce).toBe("useDebounceMock");
    expect(exports.useMyAppointments).toBe("useMyAppointmentsMock");
    expect(exports.useConfirmAppointment).toBe("useConfirmAppointmentMock");
    expect(exports.useCancelAppointment).toBe("useCancelAppointmentMock");
    expect(exports.useDebouncedSearch).toBe("useDebouncedSearchMock");
    expect(exports.useRealTimeDoseCalculation).toBe("useRealTimeDoseCalculationMock");
    expect(exports.useRealTimeCorrectionCalculation).toBe("useRealTimeCorrectionCalculationMock");
    expect(exports.useDebouncedValidation).toBe("useDebouncedValidationMock");
    expect(exports.useDebouncedValidationWithReset).toBe("useDebouncedValidationWithResetMock");
    expect(exports.useConversationWithDoctor).toBe("useConversationWithDoctorMock");
    expect(exports.useConversations).toBe("useConversationsMock");
    expect(exports.useSendMessage).toBe("useSendMessageMock");
    expect(exports.useMarkAsRead).toBe("useMarkAsReadMock");
    expect(exports.useUnreadMessagesCount).toBe("useUnreadMessagesCountMock");
    expect(exports.useUnreadMessagesFromDoctor).toBe("useUnreadMessagesFromDoctorMock");
  });
});
