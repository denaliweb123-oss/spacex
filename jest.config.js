module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  testMatch: ['<rootDir>/tests/**/*.test.[jt]s'],
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
    '!src/**/__tests__/**'
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    },
    './src/resolvers/**/*.ts': {
      statements: 90,
      branches: 90,
      functions: 90,
      lines: 90
    },
    './src/api.ts': {
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100
    }
  }
};