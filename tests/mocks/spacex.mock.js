"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockSpacexAPI = void 0;
const launches_json_1 = __importDefault(require("../fixtures/launches.json"));
exports.mockSpacexAPI = {
    getLaunches: jest.fn().mockResolvedValue(launches_json_1.default),
    getLaunch: jest.fn().mockImplementation((id) => Promise.resolve(launches_json_1.default.find((l) => l.id === id) ?? null)),
    getShips: jest.fn().mockResolvedValue([]),
    getPayloads: jest.fn().mockResolvedValue([]),
};
//# sourceMappingURL=spacex.mock.js.map