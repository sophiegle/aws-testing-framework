module.exports = {
  reporting: {
    baseDir: './dev-reports',
    cucumberJsonPath: './coverage/functional-tests/cucumber-report.json',
    includePerformanceMetrics: true,
    includeStepDetails: true,
    maxFeaturesToShow: 100,
  },

  testing: {
    defaultTimeout: 60000, // Longer timeout for debugging
    retryAttempts: 1, // Fewer retries to fail fast
    retryDelay: 500,
    verbose: true, // Verbose logging for development
  },

  aws: {
    region: process.env.AWS_REGION || 'us-west-2',
    maxRetries: 2,
    timeout: 15000,
  },

  lambda: {
    timeout: 600000, // 10 minutes for debugging
  },

  ci: {
    environment: 'development',
    branch: process.env.BRANCH_NAME || 'local',
  },
};
