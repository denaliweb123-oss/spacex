"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlers = void 0;
const msw_1 = require("msw");
const launches_json_1 = __importDefault(require("../fixtures/launches.json"));
const BASE = 'https://api.spacexdata.com';
const v5LaunchHandlers = [
    msw_1.http.get(`${BASE}/v5/launches/past`, () => msw_1.HttpResponse.json(launches_json_1.default)),
    msw_1.http.get(`${BASE}/v5/launches/latest`, () => msw_1.HttpResponse.json(launches_json_1.default[0])),
    msw_1.http.get(`${BASE}/v5/launches/upcoming`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v5/launches/next`, () => msw_1.HttpResponse.json(launches_json_1.default[0])),
    msw_1.http.get(`${BASE}/v5/launches/:id`, ({ params }) => {
        const launch = launches_json_1.default.find((l) => l.id === params['id']);
        return launch
            ? msw_1.HttpResponse.json(launch)
            : msw_1.HttpResponse.json(null, { status: 404 });
    }),
    msw_1.http.post(`${BASE}/v5/launches/query`, () => msw_1.HttpResponse.json(launches_json_1.default)),
];
const v4Handlers = [
    msw_1.http.get(`${BASE}/v4/launches`, () => msw_1.HttpResponse.json(launches_json_1.default)),
    msw_1.http.get(`${BASE}/v4/rockets`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/rockets/:id`, () => new msw_1.HttpResponse(null, { status: 404 })),
    msw_1.http.post(`${BASE}/v4/rockets/query`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/capsules`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/capsules/:id`, () => new msw_1.HttpResponse(null, { status: 404 })),
    msw_1.http.get(`${BASE}/v4/company`, () => msw_1.HttpResponse.json({})),
    msw_1.http.get(`${BASE}/v4/cores`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/cores/:id`, () => new msw_1.HttpResponse(null, { status: 404 })),
    msw_1.http.get(`${BASE}/v4/dragons`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/dragons/:id`, () => new msw_1.HttpResponse(null, { status: 404 })),
    msw_1.http.get(`${BASE}/v4/history`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/history/:id`, () => new msw_1.HttpResponse(null, { status: 404 })),
    msw_1.http.post(`${BASE}/v4/history/query`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/landpads`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/landpads/:id`, () => new msw_1.HttpResponse(null, { status: 404 })),
    msw_1.http.get(`${BASE}/v4/launchpads`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/launchpads/:id`, () => new msw_1.HttpResponse(null, { status: 404 })),
    msw_1.http.get(`${BASE}/v4/payloads`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/payloads/:id`, () => new msw_1.HttpResponse(null, { status: 404 })),
    msw_1.http.post(`${BASE}/v4/payloads/query`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/ships`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/ships/:id`, () => new msw_1.HttpResponse(null, { status: 404 })),
    msw_1.http.post(`${BASE}/v4/ships/query`, () => msw_1.HttpResponse.json([])),
    msw_1.http.get(`${BASE}/v4/roadster`, () => msw_1.HttpResponse.json({})),
];
exports.handlers = [...v5LaunchHandlers, ...v4Handlers];
//# sourceMappingURL=handlers.js.map