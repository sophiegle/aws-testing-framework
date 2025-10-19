module.exports = {
  reporting: {
    baseDir: './ci-reports',
    cucumberJsonPath: './coverage/functional-tests/cucumber-report.json',
    includePerformanceMetrics: true,
    includeStepDetails: false,
    maxFeaturesToShow: 200,
  },

  testing: {
    defaultTimeout: 45000,
    retryAttempts: 3,
    retryDelay: 2000,
    verbose: false,
  },

  aws: {
    region: process.env.AWS_REGION || 'eu-west-2',
    maxRetries: 5, // More retries in CI for reliability
    timeout: 20000,
  },

  ci: {
    environment: process.env.NODE_ENV || 'ci',
    buildId: process.env.BUILD_ID || process.env.GITHUB_RUN_ID,
    branch: process.env.BRANCH_NAME || process.env.GITHUB_REF_NAME,
    commitHash: process.env.COMMIT_SHA || process.env.GITHUB_SHA,
    pullRequestNumber: process.env.PULL_REQUEST_NUMBER
      ? Number.parseInt(process.env.PULL_REQUEST_NUMBER, 10)
      : undefined,

    // Upload results to S3 for CI environments
    uploadToS3: process.env.S3_REPORTS_BUCKET
      ? {
          bucket: process.env.S3_REPORTS_BUCKET,
          prefix: `test-reports/${process.env.BRANCH_NAME || 'main'}`,
          region: process.env.AWS_REGION || 'eu-west-2',
        }
      : undefined,

    // Slack notifications for failures
    notifications: {
      slack: process.env.SLACK_WEBHOOK_URL
        ? {
            webhookUrl: process.env.SLACK_WEBHOOK_URL,
            channel: '#test-results',
            onFailure: true,
            onSuccess: false, // Only notify on failures in CI
          }
        : undefined,
    },
  },
};
