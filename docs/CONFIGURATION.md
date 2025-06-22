# Configuration Guide

This guide covers all configuration options for the AWS Testing Framework.

## AWS Configuration

### Credentials

The framework uses the AWS SDK's default credential provider chain. Configure credentials using one of these methods:

#### 1. AWS CLI (Recommended)

```bash
aws configure
```

This creates credentials in `~/.aws/credentials` and config in `~/.aws/config`.

#### 2. Environment Variables

```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

#### 3. AWS Profiles

```bash
# Create a profile
aws configure --profile my-profile

# Use the profile
export AWS_PROFILE=my-profile
```

#### 4. IAM Roles (for EC2/ECS)

The framework will automatically use IAM roles when running on AWS infrastructure.

### Required Permissions

Your AWS credentials need the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:GetQueueAttributes",
        "lambda:InvokeFunction",
        "lambda:GetFunction",
        "lambda:ListFunctions",
        "states:StartExecution",
        "states:DescribeExecution",
        "states:ListExecutions",
        "states:GetExecutionHistory",
        "logs:FilterLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "*"
    }
  ]
}
```

## Framework Configuration

### Constructor Options

```typescript
import { AWSTestingFramework } from 'aws-testing-framework';

const framework = new AWSTestingFramework({
  region: 'us-east-1',
  timeout: 30000,
  retryAttempts: 3,
  correlationIdPrefix: 'test'
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `region` | string | 'us-east-1' | AWS region to use |
| `timeout` | number | 30000 | Default timeout in milliseconds |
| `retryAttempts` | number | 3 | Number of retry attempts for operations |
| `correlationIdPrefix` | string | 'test' | Prefix for correlation IDs |

### Environment Variables

You can configure the framework using environment variables:

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=my-profile

# Framework Configuration
AWS_TESTING_TIMEOUT=30000
AWS_TESTING_RETRY_ATTEMPTS=3
AWS_TESTING_CORRELATION_PREFIX=test
```

## Cucumber Configuration

### Basic Configuration

Create `cucumber.js` in your project root:

```javascript
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['node_modules/aws-testing-framework/dist/steps/*.js'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' }
  }
};
```

### Advanced Configuration

```javascript
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'node_modules/aws-testing-framework/dist/steps/*.js',
      'src/steps/*.ts'  // Your custom steps
    ],
    format: [
      'progress',
      'html:reports/cucumber-report.html',
      'json:reports/cucumber-report.json'
    ],
    formatOptions: { 
      snippetInterface: 'async-await',
      colorsEnabled: true
    },
    publishQuiet: true,
    parallel: 2
  },
  ci: {
    format: ['progress', 'junit:reports/junit.xml'],
    publishQuiet: true
  }
};
```

### Configuration Options

| Option | Description |
|--------|-------------|
| `requireModule` | Modules to require before loading step definitions |
| `require` | Paths to step definition files |
| `format` | Output formats for test results |
| `formatOptions` | Options for formatters |
| `publishQuiet` | Suppress publish output |
| `parallel` | Number of parallel test processes |

## Test Configuration

### Timeouts

Configure timeouts for different operations:

```typescript
// In your step definitions
await framework.waitForCondition(async () => {
  return await framework.checkFileExists('my-bucket', 'test.txt');
}, 60000); // 60 second timeout
```

### Retry Logic

The framework includes built-in retry logic for AWS operations:

```typescript
const framework = new AWSTestingFramework({
  retryAttempts: 5,
  timeout: 45000
});
```

### Custom Step Definitions

Extend the framework with your own step definitions:

```typescript
// src/steps/custom-steps.ts
import { Given, Then } from '@cucumber/cucumber';
import { AWSTestingFramework } from 'aws-testing-framework';

const framework = new AWSTestingFramework();

Given('I have a custom resource {string}', async function(resourceName: string) {
  // Your custom setup logic
});

Then('the custom resource should be configured correctly', async function() {
  // Your custom verification logic
});
```

## Reporting Configuration

### HTML Reports

```javascript
// cucumber.js
module.exports = {
  default: {
    format: ['progress', 'html:reports/cucumber-report.html']
  }
};
```

### JSON Reports

```javascript
// cucumber.js
module.exports = {
  default: {
    format: ['progress', 'json:reports/cucumber-report.json']
  }
};
```

### Custom Reports

```typescript
// src/reporting/custom-reporter.ts
import { TestReporter } from 'aws-testing-framework';

const reporter = new TestReporter({
  outputDir: 'reports',
  includeScreenshots: true,
  includeLogs: true
});
```

## CI/CD Configuration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
```

### Jenkins

```groovy
// Jenkinsfile
pipeline {
    agent any
    environment {
        AWS_REGION = 'us-east-1'
    }
    stages {
        stage('Test') {
            steps {
                sh 'npm install'
                sh 'npm test'
            }
        }
    }
}
```

## Debug Configuration

### Enable Debug Logging

```bash
DEBUG=aws-testing-framework:* npx cucumber-js
```

### Verbose Output

```bash
npx cucumber-js --verbose
```

### Dry Run

```bash
npx cucumber-js --dry-run
```

## Best Practices

1. **Use AWS Profiles** for different environments
2. **Set Appropriate Timeouts** for your environment
3. **Use Environment Variables** for configuration
4. **Implement Proper Error Handling** in custom steps
5. **Clean Up Test Data** after tests complete
6. **Use Correlation IDs** for end-to-end testing
7. **Configure Retry Logic** for flaky operations 