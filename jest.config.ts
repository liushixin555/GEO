import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'api',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests/apis'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleNameMapper: {
        '^@apis/(.*)$': '<rootDir>/apis/$1',
        '@scalar/express-api-reference': '<rootDir>/tests/apis/__mocks__/scalar.ts',
      },
    },
    {
      displayName: 'page',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/tests/pages'],
      testPathIgnorePatterns: ['<rootDir>/tests/pages/video-presentation'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            module: 'commonjs',
            esModuleInterop: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            types: ['jest', '@testing-library/jest-dom'],
          },
        }],
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleNameMapper: {
        '^@pages/(.*)$': '<rootDir>/pages/$1',
        '\\.(css|less|scss)$': 'identity-obj-proxy',
      },
      transformIgnorePatterns: [
        '/node_modules/',
      ],
      setupFilesAfterEnv: ['<rootDir>/tests/pages/setup.ts'],
    },
    {
      displayName: 'video-presentation',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/tests/pages/video-presentation'],
      transform: {
        '^.+\\.tsx?$': '<rootDir>/tests/pages/video-presentation/jest.transform.js',
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleNameMapper: {
        '\\.(css|less|scss)$': 'identity-obj-proxy',
      },
      setupFilesAfterEnv: ['<rootDir>/tests/pages/setup.ts'],
    },
  ],
};

export default config;
