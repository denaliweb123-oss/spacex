"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateSlowResponse = exports.simulateHttpError = exports.simulateNetworkError = exports.server = void 0;
const msw_1 = require("msw");
const node_1 = require("msw/node");
const handlers_1 = require("./handlers");
exports.server = (0, node_1.setupServer)(...handlers_1.handlers);
function simulateNetworkError(...urlPatterns) {
    exports.server.use(...urlPatterns.flatMap((pattern) => [
        msw_1.http.get(pattern, () => msw_1.HttpResponse.error()),
        msw_1.http.post(pattern, () => msw_1.HttpResponse.error()),
    ]));
}
exports.simulateNetworkError = simulateNetworkError;
function simulateHttpError(status, ...urlPatterns) {
    exports.server.use(...urlPatterns.flatMap((pattern) => [
        msw_1.http.get(pattern, () => msw_1.HttpResponse.json(null, { status })),
        msw_1.http.post(pattern, () => msw_1.HttpResponse.json(null, { status })),
    ]));
}
exports.simulateHttpError = simulateHttpError;
function simulateSlowResponse(delayMs, ...urlPatterns) {
    exports.server.use(...urlPatterns.flatMap((pattern) => [
        msw_1.http.get(pattern, async ({ request }) => {
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            return msw_1.HttpResponse.json(null);
        }),
    ]));
}
exports.simulateSlowResponse = simulateSlowResponse;
//# sourceMappingURL=msw.server.js.map