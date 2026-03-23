module.exports = {
  testEnvironment: 'node',
  globalSetup: './tests/setup.js',
  globalTeardown: './tests/teardown.js',
  setupFilesAfterEnv: ['./tests/jest.setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/server.js'],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 30000,
  maxWorkers: 1,
};
