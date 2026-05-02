"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const api_1 = __importDefault(require("../../src/api"));
const msw_server_1 = require("../mocks/msw.server");
const msw_1 = require("msw");
describe("API", () => {
    let api;
    beforeEach(() => {
        api = new api_1.default();
    });
    it("constructs with the correct base URL", () => {
        expect(api.baseUrl).toBe("https://api.spacexdata.com");
    });
    it("getLaunches calls /v4/launches", async () => {
        const result = await api.getLaunches();
        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);
    });
    it("getLaunch calls /v5/launches/:id", async () => {
        const result = await api.getLaunch("5eb87cd9ffd86e000604b32a");
        expect(result.id).toBe("5eb87cd9ffd86e000604b32a");
        expect(result.name).toBe("FalconSat");
    });
    it("getRocket calls /v4/rockets/:id", async () => {
        msw_server_1.server.use(msw_1.http.get('https://api.spacexdata.com/v4/rockets/falcon9', () => {
            return msw_1.HttpResponse.json({ id: "falcon9" });
        }));
        await api.getRocket("falcon9");
    });
    it("getPastLaunches calls /v5/launches/past", async () => {
        msw_server_1.server.use(msw_1.http.get('https://api.spacexdata.com/v5/launches/past', () => {
            return msw_1.HttpResponse.json([]);
        }));
        await api.getPastLaunches();
    });
    it("getShip calls /v4/ships/:id", async () => {
        msw_server_1.server.use(msw_1.http.get('https://api.spacexdata.com/v4/ships/S1', () => {
            return msw_1.HttpResponse.json({ ship_id: "S1" });
        }));
        await api.getShip("S1");
    });
});
//# sourceMappingURL=api.test.js.map