"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runner_1 = require("../../src/qa/runner");
const coverage_agent_1 = require("../../src/qa/agents/coverage-agent");
jest.mock("../../src/api", () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            getCapsules: () => Promise.resolve([]),
            getCapsule: () => Promise.resolve(null),
            company: () => Promise.resolve(null),
            getCores: () => Promise.resolve([]),
            getCore: () => Promise.resolve(null),
            getDragons: () => Promise.resolve([]),
            getDragon: () => Promise.resolve(null),
            getHistoryEvents: () => Promise.resolve([]),
            getHistoryEvent: () => Promise.resolve(null),
            queryHistoryEvent: () => Promise.resolve([]),
            getLandpads: () => Promise.resolve([]),
            getLandpad: () => Promise.resolve(null),
            getLaunches: () => Promise.resolve([]),
            getPastLaunches: () => Promise.resolve([]),
            getLaunch: () => Promise.resolve(null),
            getLatestLaunch: () => Promise.resolve(null),
            getUpcomingLaunchs: () => Promise.resolve([]),
            getNextLaunch: () => Promise.resolve(null),
            queryNextLaunch: () => Promise.resolve([]),
            getRockets: () => Promise.resolve([]),
            getRocket: () => Promise.resolve(null),
            queryRocket: () => Promise.resolve(null),
            getShips: () => Promise.resolve([]),
            getShip: () => Promise.resolve(null),
            queryShips: () => Promise.resolve(null),
            getLaunchPads: () => Promise.resolve([]),
            getLaunchPad: () => Promise.resolve(null),
            getPayloads: () => Promise.resolve([]),
            getPayload: () => Promise.resolve(null),
            queryPayloads: () => Promise.resolve([]),
            getRoadster: () => Promise.resolve(null),
        })),
    };
});
describe("🤖 Autonomous GraphQL QA System", () => {
    it("runs full AI QA cycle", async () => {
        const metrics = await (0, runner_1.runAutonomousQA)({ writeMetrics: false });
        expect(metrics.highSeverityAnomalies).toBe(0);
        expect(metrics.anomalies.filter((anomaly) => anomaly.severity === "HIGH")).toEqual([]);
    }, 30000);
});
describe("Autonomous failure memory replay", () => {
    const persistedFailures = (0, coverage_agent_1.readFailureMemory)().failingQueries;
    if (persistedFailures.length === 0) {
        it("has no persisted high severity failures to replay", () => {
            expect(persistedFailures).toEqual([]);
        });
    }
    else {
        it.each(persistedFailures)("replays and clears recovered failure %#", async (failure) => {
            const anomaly = await (0, runner_1.replayFailure)(failure);
            expect(anomaly).toBeNull();
            (0, coverage_agent_1.forgetFailure)(failure);
        }, 30000);
    }
});
//# sourceMappingURL=autonomous.ai.qa.test.js.map