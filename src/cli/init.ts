#!/usr/bin/env node

/**
 * CLI tool for initializing AWS Testing Framework projects
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import inquirer from 'inquirer';

interface InitOptions {
  projectName?: string;
  template?: 'basic' | 'comprehensive' | 'ci' | 'enterprise';
  interactive?: boolean;
  typescript?: boolean;
  aws?: {
    region?: string;
    services?: string[];
  };
  help?: boolean;
}

interface ProjectTemplate {
  name: string;
  description: string;
  files: Record<string, string>;
  directories: string[];
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
}

const templates: Record<string, ProjectTemplate> = {
  basic: {
    name: 'Basic AWS Testing Project',
    description: 'Simple setup for basic AWS testing with S3 and Lambda',
    directories: ['features', 'step-definitions', 'test-data', 'test-reports'],
    files: {
      'features/example.feature': `Feature: Basic AWS Testing
  As a developer
  I want to test my AWS services
  So that I can ensure they work correctly

  Scenario: Test S3 file upload
    Given I have an S3 bucket named "test-bucket"
    When I upload a file "test.txt" with content "Hello World" to the S3 bucket
    Then the file "test.txt" should exist in the S3 bucket
    And the file content should be "Hello World"`,

      'cucumber.js': `module.exports = {
  default: [
    '--require-module ts-node/register',
    '--require node_modules/aws-testing-framework/dist/steps/**/*.js',
    '--format progress',
    '--format json:test-reports/cucumber-report.json',
    'features/**/*.feature'
  ].join(' ')
};`,

      'aws-testing-framework.config.json': `{
  "aws": {
    "region": "eu-west-2"
  },
  "testing": {
    "defaultTimeout": 30000,
    "retryAttempts": 3
  }
}`,

      '.gitignore': `# Dependencies
node_modules/
npm-debug.log*

# Test Reports
test-reports/
coverage/

# AWS
.aws/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db`,

      'README.md': `# AWS Testing Project

This project uses the AWS Testing Framework for end-to-end testing of AWS services.

## Setup

1. Configure AWS credentials:
   \`\`\`bash
   aws configure
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

3. Update \`aws-testing-framework.config.json\` with your AWS region and settings.

## Running Tests

\`\`\`bash
# Run tests
npm test
\`\`\`

## Writing Tests

Add your feature files to the \`features/\` directory using Gherkin syntax.

Example:
\`\`\`gherkin
Feature: My AWS Service
  Scenario: Test my Lambda function
    Given I have a Lambda function named "my-function"
    When I invoke the Lambda function with payload "{\\"test\\": true}"
    Then the Lambda function should execute successfully
\`\`\`

## Configuration

Edit \`aws-testing-framework.config.json\` to customize:
- AWS region and services
- Test timeouts and retries
- Reporting options

For more configuration options, see:
https://github.com/sophiegle/aws-testing-framework/tree/main/examples/config
`,
    },
    dependencies: ['aws-testing-framework'],
    devDependencies: [
      '@cucumber/cucumber',
      'typescript',
      'ts-node',
      '@types/node',
    ],
    scripts: {
      test: 'cucumber-js',
      build: 'tsc --noEmit',
    },
  },

  comprehensive: {
    name: 'Comprehensive AWS Testing Project',
    description: 'Full-featured setup with all AWS services and custom steps',
    directories: [
      'features',
      'features/s3',
      'features/lambda',
      'features/step-functions',
      'features/sqs',
      'step-definitions',
      'test-data',
      'test-reports',
      'lib',
    ],
    files: {
      'features/s3/file-processing.feature': `Feature: S3 File Processing
  Background:
    Given I have an S3 bucket named "processing-bucket"

  Scenario: Upload and process file
    When I upload a file "data.json" with content "{\\"type\\": \\"test\\"}" to the S3 bucket
    Then the file "data.json" should exist in the S3 bucket
    And the file should trigger downstream processing`,

      'features/lambda/function-execution.feature': `Feature: Lambda Function Execution
  Scenario: Process incoming requests
    Given I have a Lambda function named "request-processor"
    When I invoke the Lambda function with payload:
      """
      {
        "userId": "123",
        "action": "process",
        "data": {"value": 42}
      }
      """
    Then the Lambda function should execute successfully
    And the execution should complete within 30 seconds
    And the CloudWatch logs should contain "Processing complete"`,

      'features/step-functions/workflow.feature': `Feature: Step Function Workflow
  Scenario: Execute data processing workflow
    Given I have a Step Function named "data-processing-workflow"
    When I start the Step Function execution with input:
      """
      {
        "bucketName": "processing-bucket",
        "fileName": "data.json"
      }
      """
    Then the Step Function execution should succeed
    And all states should execute successfully
    And the execution should complete within 120 seconds`,

      'step-definitions/custom-steps.ts': `import { Given, When, Then } from '@cucumber/cucumber';
import { AWSTestingFramework } from 'aws-testing-framework';

// Initialize framework
const framework = AWSTestingFramework.createForDevelopment();

// Custom step definitions
Then('the file should trigger downstream processing', async function() {
  // Add custom logic to verify downstream processing
  // This is where you'd add business-specific validations
  console.log('Verifying downstream processing...');
});

Given('I have monitoring enabled for {string}', async function(serviceName: string) {
  // Custom monitoring setup
  console.log(\`Setting up monitoring for \${serviceName}\`);
});`,

      'lib/test-helpers.ts': `import { AWSTestingFramework } from 'aws-testing-framework';

export class TestHelpers {
  private framework: AWSTestingFramework;

  constructor() {
    this.framework = AWSTestingFramework.createForDevelopment();
  }

  async setupTestEnvironment(): Promise<void> {
    // Custom setup logic
    console.log('Setting up test environment...');
  }

  async cleanupTestEnvironment(): Promise<void> {
    // Custom cleanup logic
    console.log('Cleaning up test environment...');
  }

  async waitForProcessingComplete(bucketName: string, fileName: string): Promise<boolean> {
    // Custom business logic
    return true;
  }
}`,

      'aws-testing-framework.config.js': `module.exports = {
  aws: {
    region: process.env.AWS_REGION || 'eu-west-2',
    maxRetries: 5
  },
  testing: {
    defaultTimeout: 60000,
    retryAttempts: 3,
    verbose: true
  },
  reporting: {
    includePerformanceMetrics: true,
    includeStepDetails: true
  }
};`,
    },
    dependencies: ['aws-testing-framework'],
    devDependencies: [
      '@cucumber/cucumber',
      'typescript',
      'ts-node',
      '@types/node',
      '@types/cucumber',
    ],
    scripts: {
      test: 'cucumber-js',
      'test:dev': 'NODE_ENV=development npm test',
      'test:watch': 'npm test -- --watch',
      build: 'tsc',
      clean: 'rm -rf test-reports coverage',
    },
  },

  ci: {
    name: 'CI/CD Optimized Project',
    description: 'Optimized setup for continuous integration pipelines',
    directories: [
      'features',
      'step-definitions',
      'test-data',
      'test-reports',
      '.github/workflows',
    ],
    files: {
      'features/smoke-tests.feature': `Feature: Smoke Tests for CI
  Background:
    Given the AWS environment is properly configured

  Scenario: Basic connectivity test
    Given I have an S3 bucket named "ci-test-bucket"
    When I upload a file "health-check.txt" with content "healthy" to the S3 bucket
    Then the file "health-check.txt" should exist in the S3 bucket
    And I clean up the test file "health-check.txt"`,

      '.github/workflows/test.yml': `name: AWS Testing Framework CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v2
      with:
        aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: eu-west-2
    
    - name: Run tests
      run: npm test
      env:
        NODE_ENV: ci
    
    - name: Upload test reports
      uses: actions/upload-artifact@v3
      with:
        name: test-reports
        path: test-reports/
      if: always()`,

      'aws-testing-framework.config.js': `module.exports = {
  aws: {
    region: process.env.AWS_REGION || 'eu-west-2',
    maxRetries: 5
  },
  testing: {
    defaultTimeout: 45000,
    retryAttempts: 3,
    verbose: false
  },
  ci: {
    environment: 'ci',
    buildId: process.env.GITHUB_RUN_ID,
    branch: process.env.GITHUB_REF_NAME,
    commitHash: process.env.GITHUB_SHA,
    uploadToS3: process.env.S3_REPORTS_BUCKET ? {
      bucket: process.env.S3_REPORTS_BUCKET,
      prefix: 'ci-reports'
    } : undefined
  }
};`,
    },
    dependencies: ['aws-testing-framework'],
    devDependencies: [
      '@cucumber/cucumber',
      'typescript',
      'ts-node',
      '@types/node',
    ],
    scripts: {
      test: 'cucumber-js',
      'test:ci': 'NODE_ENV=ci npm test',
      'test:smoke': 'cucumber-js features/smoke-tests.feature',
      doctor: 'npx awstf doctor',
    },
  },

  enterprise: {
    name: 'Enterprise AWS Testing Project',
    description:
      'Advanced setup with monitoring, notifications, and enterprise features',
    directories: [
      'features',
      'features/integration',
      'features/performance',
      'step-definitions',
      'test-data',
      'test-reports',
      'lib',
      'config',
    ],
    files: {
      'features/integration/end-to-end.feature': `Feature: End-to-End Integration Tests
  Background:
    Given the enterprise AWS environment is configured
    And monitoring is enabled for all services

  Scenario: Complete data processing pipeline
    Given I have an S3 bucket named "enterprise-data-bucket"
    And I have a Lambda function named "data-processor"
    And I have a Step Function named "enterprise-workflow"
    When I upload a file "enterprise-data.json" with content "{\\"type\\": \\"enterprise\\"}" to the S3 bucket
    Then the Lambda function should be invoked within 30 seconds
    And the Step Function should be executed
    And the processing should complete within 120 seconds
    And all performance metrics should be within acceptable ranges`,

      'config/monitoring.js': `module.exports = {
  alerts: {
    enableSlackNotifications: true,
    enableEmailNotifications: true,
    performanceThresholds: {
      lambdaExecutionTime: 30000,
      stepFunctionExecutionTime: 120000,
      errorRate: 0.01
    }
  }
};`,

      'aws-testing-framework.config.js': `const monitoring = require('./config/monitoring');

module.exports = {
  aws: {
    region: process.env.AWS_REGION || 'eu-west-2',
    maxRetries: 10
  },
  testing: {
    defaultTimeout: 120000,
    retryAttempts: 5,
    verbose: process.env.VERBOSE_TESTS === 'true'
  },
  ci: {
    environment: process.env.ENVIRONMENT || 'production',
    uploadToS3: {
      bucket: process.env.ENTERPRISE_REPORTS_BUCKET,
      prefix: 'enterprise-reports'
    },
    notifications: {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#enterprise-alerts',
        onFailure: true,
        onSuccess: process.env.ENVIRONMENT === 'production'
      }
    }
  },
  ...monitoring
};`,
    },
    dependencies: ['aws-testing-framework'],
    devDependencies: [
      '@cucumber/cucumber',
      'typescript',
      'ts-node',
      '@types/node',
      '@types/cucumber',
    ],
    scripts: {
      test: 'cucumber-js',
      'test:integration': 'cucumber-js features/integration/',
      'test:performance': 'cucumber-js features/performance/',
      'test:enterprise': 'npm run test:integration && npm run test:performance',
      doctor: 'npx awstf doctor --verbose',
      monitor: 'node lib/monitoring.js',
    },
  },
};

function parseArgs(): InitOptions {
  const args = process.argv.slice(2);
  const options: InitOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--name':
      case '-n':
        options.projectName = args[++i];
        break;
      case '--template':
      case '-t':
        options.template = args[++i] as InitOptions['template'];
        break;
      case '--typescript':
      case '--ts':
        options.typescript = true;
        break;
      case '--region':
      case '-r':
        if (!options.aws) options.aws = {};
        options.aws.region = args[++i];
        break;
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--help':
      case '-h':
        options.help = true;
        break;
    }
  }

  return options;
}

function showHelp(): void {
  console.log(`
AWS Testing Framework - Project Initializer

Usage: aws-testing-framework init [options]

Options:
  -n, --name <name>       Project name
  -t, --template <type>   Project template (basic|comprehensive|ci|enterprise)
  -r, --region <region>   AWS region (default: eu-west-2)
  --ts, --typescript      Use TypeScript (default: true)
  -i, --interactive       Interactive mode
  -h, --help              Show this help message

Templates:
  basic           Simple setup for basic AWS testing
  comprehensive   Full-featured setup with all services
  ci              CI/CD optimized setup
  enterprise      Advanced setup with monitoring and notifications

Examples:
  # Initialize basic project
  aws-testing-framework init --name my-project --template basic

  # Interactive setup
  aws-testing-framework init --interactive

  # Comprehensive project with specific region
  aws-testing-framework init --template comprehensive --region eu-west-1
`);
}

async function createProject(options: InitOptions): Promise<void> {
  let projectName = options.projectName;
  let templateType = options.template;

  // Interactive mode or missing options
  if (options.interactive || !projectName || !templateType) {
    console.log('🚀 AWS Testing Framework Project Initializer');
    console.log('=============================================\n');

    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectName',
        message: 'Project name:',
        default: projectName || 'aws-testing-project',
        validate: (input) => {
          if (!input.trim()) return 'Project name is required';
          if (existsSync(join(process.cwd(), input))) {
            return `Directory "${input}" already exists`;
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'template',
        message: 'Select project template:',
        choices: [
          {
            name: '🚀 Basic - Simple setup for basic AWS testing',
            value: 'basic',
          },
          {
            name: '🎯 Comprehensive - Full-featured setup with all services',
            value: 'comprehensive',
          },
          {
            name: '🔄 CI - CI/CD optimized setup',
            value: 'ci',
          },
          {
            name: '🏢 Enterprise - Advanced setup with monitoring',
            value: 'enterprise',
          },
        ],
        default: templateType || 'basic',
      },
      {
        type: 'input',
        name: 'awsRegion',
        message: 'AWS Region:',
        default: options.aws?.region || process.env.AWS_REGION || 'eu-west-2',
      },
      {
        type: 'checkbox',
        name: 'awsServices',
        message: 'AWS Services to include:',
        choices: [
          { name: 'S3 (File storage)', value: 's3', checked: true },
          { name: 'Lambda (Functions)', value: 'lambda', checked: true },
          { name: 'SQS (Queues)', value: 'sqs', checked: true },
          {
            name: 'Step Functions (Workflows)',
            value: 'stepfunctions',
            checked: false,
          },
          { name: 'SNS (Notifications)', value: 'sns', checked: false },
        ],
      },
      {
        type: 'confirm',
        name: 'typescript',
        message: 'Use TypeScript?',
        default: options.typescript !== false,
      },
    ]);

    projectName = answers.projectName;
    templateType = answers.template;
    options.aws = {
      region: answers.awsRegion,
      services: answers.awsServices,
    };
    options.typescript = answers.typescript;

    console.log();
  }

  const template = templates[templateType || 'basic'];
  const projectDir = join(process.cwd(), projectName || 'aws-testing-project');

  console.log(`🚀 Creating AWS Testing Framework project: ${projectName}`);
  console.log(`📋 Template: ${template.name}`);
  console.log(`📁 Directory: ${projectDir}`);
  console.log(`☁️  AWS Region: ${options.aws?.region || 'eu-west-2'}`);
  console.log(
    `🛠️  Services: ${options.aws?.services?.join(', ') || 'S3, Lambda, SQS'}\n`
  );

  // Check if directory exists
  if (existsSync(projectDir)) {
    process.exit(1);
  }

  // Create project directory
  mkdirSync(projectDir, { recursive: true });

  // Create subdirectories
  template.directories.forEach((dir) => {
    mkdirSync(join(projectDir, dir), { recursive: true });
    console.log(`📁 Created directory: ${dir}/`);
  });

  // Create files
  Object.entries(template.files).forEach(([filePath, content]) => {
    const fullPath = join(projectDir, filePath);
    writeFileSync(fullPath, content);
    console.log(`📄 Created file: ${filePath}`);
  });

  // Create package.json
  const packageJson = {
    name: projectName,
    version: '1.0.0',
    description: `AWS Testing project using ${template.name}`,
    scripts: template.scripts,
    dependencies: template.dependencies.reduce(
      (acc, dep) => {
        acc[dep] = '^0.3.0';
        return acc;
      },
      {} as Record<string, string>
    ),
    devDependencies: template.devDependencies.reduce(
      (acc, dep) => {
        if (dep === '@cucumber/cucumber') acc[dep] = '^10.0.0';
        else if (dep === 'typescript') acc[dep] = '^5.0.0';
        else if (dep === 'ts-node') acc[dep] = '^10.0.0';
        else if (dep.startsWith('@types/')) acc[dep] = 'latest';
        else acc[dep] = 'latest';
        return acc;
      },
      {} as Record<string, string>
    ),
  };

  writeFileSync(
    join(projectDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  console.log('📄 Created file: package.json');

  console.log(`\n✅ Project ${projectName} created successfully!`);
  console.log('\n📋 Next steps:');
  console.log(`   1. cd ${projectName}`);
  console.log('   2. npm install');
  console.log('   3. Configure AWS credentials: aws configure');
  console.log(
    '   4. Update aws-testing-framework.config.json with your settings'
  );
  console.log('   5. npm test');
  console.log('\n🎉 Happy testing!');
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  try {
    await createProject(options);
  } catch (_error) {
    process.exit(1);
  }
}

// Run CLI if called directly
if (require.main === module) {
  main();
}

export { main as initCLI };
