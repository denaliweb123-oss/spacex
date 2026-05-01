import launches from '../fixtures/launches.json';

export const mockSpacexAPI = {
  getLaunches: jest.fn().mockResolvedValue(launches as any),
  getLaunch: jest.fn().mockImplementation((id: string) =>
    Promise.resolve(launches.find((l: { id: string }) => l.id === id) ?? null)
  ),
  getShips: jest.fn().mockResolvedValue([] as any),
  getPayloads: jest.fn().mockResolvedValue([] as any),
};
