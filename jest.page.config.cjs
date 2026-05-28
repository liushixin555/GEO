module.exports = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests/pages'],
  testPathIgnorePatterns: ['<rootDir>/tests/pages/video-presentation'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      diagnostics: false,
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
  setupFilesAfterEnv: ['<rootDir>/tests/pages/setup.ts'],
};
