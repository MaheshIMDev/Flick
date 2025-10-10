module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/tests'],
    testMatch: ['**/*.test.ts'],
    transform: {
      '^.+\\.ts$': ['ts-jest', {
        tsconfig: {
          esModuleInterop: true,
          allowSyntheticDefaultImports: true,
        }
      }]
    },
    moduleNameMapper: {
      '^@/(.*)$': '<rootDir>/$1',
      '^@routes/(.*)$': '<rootDir>/routes/$1',
      '^@middlewares/(.*)$': '<rootDir>/middlewares/$1',
      '^@utils/(.*)$': '<rootDir>/utils/$1',
      '^@tests/(.*)$': '<rootDir>/tests/$1',
    },
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    collectCoverageFrom: [
      'routes/**/*.ts',
      'middlewares/**/*.ts',
      'utils/**/*.ts',
      '!**/*.d.ts',
      '!**/node_modules/**',
    ],
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'html'],
    setupFilesAfterEnv: ['<rootDir>/tests/setup/setupTests.ts'],
    testTimeout: 30000,
    verbose: true,
    detectOpenHandles: true,
    forceExit: true,
    globals: {
      'ts-jest': {
        isolatedModules: true,
      },
    },
  };
  