"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const msw_server_1 = require("./mocks/msw.server");
beforeAll(() => msw_server_1.server.listen({ onUnhandledRequest: 'warn' }));
beforeEach(() => {
    globals_1.jest.clearAllMocks();
});
afterEach(() => msw_server_1.server.resetHandlers());
afterAll(() => msw_server_1.server.close());
//# sourceMappingURL=setup.js.map