module.exports = {
  mutate: ['src/**/*.ts', '!src/**/*.d.ts', '!src/**/__tests__/**/*.ts'],
  testRunner: 'jest',
  jest: {
    projectType: 'custom',
    configFile: 'jest.config.js',
  },
  reporters: ['html', 'clear-text', 'progress'],
  coverageAnalysis: 'off',
};
