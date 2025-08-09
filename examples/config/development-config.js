module.exports = {
  dashboard: {
    enabled: true,
    outputDir: './dev-reports',
    themes: ['light'], // Only light theme for faster generation
    autoGenerate: true,
    autoOpen: true, // Auto-open in browser for development
    lightTheme: {
      showPerformanceMetrics: true,
      showStepDetails: true,
      maxFeaturesToShow: 100, // Show more features in dev
      autoRefresh: true, // Enable auto-refresh for development
      refreshInterval: 3000
    }
  },
  
  reporting: {
    baseDir: './dev-reports',
    cucumberJsonPath: './coverage/functional-tests/cucumber-report.json',
    includePerformanceMetrics: true,
    includeStepDetails: true,
    maxFeaturesToShow: 100
  },
  
  testing: {
    defaultTimeout: 60000, // Longer timeout for debugging
    retryAttempts: 1, // Fewer retries to fail fast
    retryDelay: 500,
    verbose: true // Verbose logging for development
  },
  
  aws: {
    region: process.env.AWS_REGION || 'us-west-2',
    maxRetries: 2,
    timeout: 15000
  },
  
  ci: {
    environment: 'development',
    branch: process.env.BRANCH_NAME || 'local'
  }
};
