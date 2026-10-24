/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@droidos/shared$': '<rootDir>/../../packages/shared/dist/index.js',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        diagnostics: {
          ignoreCodes: [151002, 6059],
        },
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(cookie|light-my-request|@fastify)/)',
  ],
  testMatch: ['**/__tests__/**/*.test.ts'],
  testTimeout: 15000,
};
