import resolvers from "../../../src/resolvers";
import RAW_LAUNCHES from "../../../src/__tests__/launches.json";

describe("Unit: Resolvers - Launch", () => {
  const mockService = {
    getLaunches: jest.fn(),
    getLaunch: jest.fn(),
  };

  const context = { spacexService: mockService };

  describe("Query.launches", () => {
    it("delegates to spacexService.getLaunches and returns results", async () => {
      mockService.getLaunches.mockResolvedValue(RAW_LAUNCHES);
      
      // Direct call to resolver function to test logic in isolation
      const result = await (resolvers.Query.launches as any)(null, {}, context);
      
      expect(mockService.getLaunches).toHaveBeenCalled();
      expect(result).toEqual(RAW_LAUNCHES);
    });

    it("implements limit and offset pagination logic", async () => {
      const data = [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }];
      mockService.getLaunches.mockResolvedValue(data);

      const result = await (resolvers.Query.launches as any)(null, { limit: 2, offset: 1 }, context);
      
      expect(mockService.getLaunches).toHaveBeenCalledWith(2, 1);
    });

    it("returns null when service returns no data", async () => {
      mockService.getLaunches.mockResolvedValue(null);
      const result = await (resolvers.Query.launches as any)(null, {}, context);
      expect(result).toBeNull();
    });
  });

  describe("Launch Field Resolvers (Transformations)", () => {
    const sampleLaunch = RAW_LAUNCHES[0];

    it("correctly transforms 'name' into 'mission_name'", () => {
      const result = (resolvers.Launch.mission_name as any)(sampleLaunch);
      expect(result).toBe("FalconSat");
    });

    it("correctly derives 'launch_year' from date_local property", () => {
      const result = (resolvers.Launch.launch_year as any)(sampleLaunch);
      expect(result).toBe("2006");
    });

    it("gracefully handles null links", () => {
      const result = (resolvers.Launch.links as any)({ ...sampleLaunch, links: null });
      expect(result).toBeNull();
    });

    it("maps 'date_unix' to 'launch_date_unix'", () => {
      const result = (resolvers.Launch.launch_date_unix as any)(sampleLaunch);
      expect(result).toBe(1143239400);
    });
  });
});