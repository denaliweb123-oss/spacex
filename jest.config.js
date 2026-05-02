module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'mjs', 'json', 'node'],
  transformIgnorePatterns: [
    '/node_modules/(?!(msw|rettime|until-async|@open-draft/deferred-promise|headers-polyfill)/)'],
  clearMocks: true,
  restoreMocks: true,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
    '^.+\\.(mjs|cjs|js)$': 'babel-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/__generated__/**',
    '!src/**/__tests__/**',
    '!src/index.ts',                      // server entry point — not unit-testable
    '!src/qa/update-readme-metrics.ts',   // CI script — not unit-testable
  ],
  coverageThreshold: {
    global: {
      statements: 55,
      branches: 28,
      functions: 44,
      lines: 55
    }
  }
};