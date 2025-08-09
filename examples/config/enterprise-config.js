// Enterprise configuration with advanced features
module.exports = {
  dashboard: {
    enabled: true,
    outputDir: './enterprise-reports',
    themes: ['light', 'dark'],
    autoGenerate: true,
    autoOpen: false,
    
    lightTheme: {
      showPerformanceMetrics: true,
      showStepDetails: true,
      maxFeaturesToShow: 500, // Large enterprise test suites
      autoRefresh: false
    },
    
    darkTheme: {
      showPerformanceMetrics: true,
      showStepDetails: true,
      maxFeaturesToShow: 500
    }
  },
  
  reporting: {
    baseDir: './enterprise-reports',
    cucumberJsonPath: './test-results/cucumber-report.json',
    includePerformanceMetrics: true,
    includeStepDetails: true,
    maxFeaturesToShow: 500
  },
  
  testing: {
    defaultTimeout: 120000, // 2 minutes for complex enterprise tests
    retryAttempts: 5,
    retryDelay: 3000,
    verbose: process.env.VERBOSE_TESTS === 'true'
  },
  
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    maxRetries: 10, // High retry count for enterprise reliability
    timeout: 30000
  },
  
  ci: {
    environment: process.env.ENVIRONMENT || 'production',
    buildId: process.env.BUILD_ID,
    branch: process.env.BRANCH_NAME,
    commitHash: process.env.COMMIT_SHA,
    pullRequestNumber: process.env.PR_NUMBER ? parseInt(process.env.PR_NUMBER, 10) : undefined,
    
    // Enterprise S3 setup with versioning
    uploadToS3: {
      bucket: process.env.ENTERPRISE_REPORTS_BUCKET || 'enterprise-test-reports',
      prefix: `reports/${process.env.ENVIRONMENT}/${new Date().toISOString().split('T')[0]}`,
      region: process.env.AWS_REGION || 'us-east-1'
    },
    
    // Multi-channel notifications
    notifications: {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_CHANNEL || '#qa-alerts',
        onFailure: true,
        onSuccess: process.env.ENVIRONMENT === 'production' // Notify success only in prod
      },
      
      email: {
        recipients: process.env.QA_TEAM_EMAILS ? process.env.QA_TEAM_EMAILS.split(',') : [],
        onFailure: true,
        onSuccess: false
      }
    }
  }
};
