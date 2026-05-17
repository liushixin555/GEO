import type { Config } from 'jest';

const config: Config = {
  projects: [
    {
      displayName: 'api',
      testEnvironment: 'node',
      roots: ['<rootDir>/tests/apis'],
      transform: {
        '^.+\\.tsx?$': 'ts-jest',
      },
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
      moduleNameMapper: {
        '^@apis/(.*)$': '<rootDir>/apis/$1',
      },
    },
    {
      displayName: 'page',
      testEnvironment: 'jsdom',
      roots: ['<rootDir>/tests/pages'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            module: 'commonjs',
            esModuleInterop: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
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
  ],
};

export default config;
