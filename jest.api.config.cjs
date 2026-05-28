module.exports = {
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
};
