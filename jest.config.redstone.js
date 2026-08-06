/** Jest — module LMS RedStone uniquement (unit / integration / e2e). */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/server/modules/redstone/tests'],
  testMatch: ['**/*.test.js', '**/*.e2e.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  collectCoverageFrom: [
    'server/modules/redstone/domain/**/*.js',
    'server/modules/redstone/services/**/*.js',
    'server/modules/redstone/api/middleware/**/*.js',
    '!**/*.test.js'
  ],
  coverageDirectory: 'coverage/redstone',
  verbose: false
}
