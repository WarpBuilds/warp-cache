/** @type {import('jest').Config} */
export default {
  clearMocks: true,
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['js', 'ts'],
  transform: {
    '^.+\\.(ts|js)$': [
      'ts-jest',
      {
        tsconfig: {
          allowJs: true,
          esModuleInterop: true,
          module: 'commonjs',
          moduleResolution: 'node',
          useUnknownInCatchVariables: false
        }
      }
    ]
  },
  moduleNameMapper: {
    '^@actions/core$': '<rootDir>/node_modules/@actions/core/lib/core.js',
    '^@actions/exec$': '<rootDir>/node_modules/@actions/exec/lib/exec.js',
    '^@actions/io$': '<rootDir>/node_modules/@actions/io/lib/io.js',
    '^@actions/io/lib/io-util$':
      '<rootDir>/node_modules/@actions/io/lib/io-util.js',
    '^@actions/glob$': '<rootDir>/node_modules/@actions/glob/lib/glob.js',
    '^@actions/github$':
      '<rootDir>/node_modules/@actions/github/lib/github.js',
    '^@actions/http-client$':
      '<rootDir>/node_modules/@actions/http-client/lib/index.js',
    '^@actions/http-client/lib/auth$':
      '<rootDir>/node_modules/@actions/http-client/lib/auth.js',
    '^@actions/http-client/lib/interfaces$':
      '<rootDir>/node_modules/@actions/http-client/lib/interfaces.js',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@actions|@octokit|universal-user-agent|before-after-hook)/)'
  ],
  verbose: true
}
