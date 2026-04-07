export const addEventListener = jest.fn(() => ({ remove: jest.fn() }));
export const getInitialURL = jest.fn().mockResolvedValue(null);
