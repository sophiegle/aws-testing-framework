# AWS Testing Framework

A Behavior-Driven Development (BDD) framework built with TypeScript and Cucumber for testing AWS services and their integrations. This framework provides a structured way to write and execute tests for AWS services like S3, SQS, Lambda, and Step Functions.

*NOTE: This project is not run or supported by AWS*

## Features

- **BDD Testing**: Write tests in Gherkin syntax using Cucumber
- **TypeScript Support**: Full TypeScript support with type safety
- **Pre-defined Steps**: Reusable step definitions for common AWS operations
- **AWS Service Integration**: Built-in support for:
  - Amazon S3
  - Amazon SQS
  - AWS Lambda
  - AWS Step Functions
- **Test Reporting**: Generate detailed HTML and JSON reports
- **Code Quality**: Enforced by Biome for consistent code style and quality

## Prerequisites

- Node.js 22.16.0 or later
- npm 10.x or later

## Installation

```bash
npm install aws-testing-framework
```

## Quick Start

1. Create a feature file (e.g., `features/s3-to-lambda.feature`):

```gherkin
Feature: S3 to Lambda Integration via SQS
  As a developer
  I want to test my S3 to Lambda integration
  So that I can ensure my file processing pipeline works correctly

  Scenario: Upload file triggers Lambda via SQS
    Given I have an S3 bucket named "my-bucket"
    And I have an SQS queue named "my-queue"
    And I have a Lambda function named "my-function"
    When I upload a file "test.txt" to the S3 bucket
    Then the Lambda function should be triggered
```

2. Create step definitions (e.g., `features/step_definitions/steps.ts`):

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { AWSTestingFramework } from 'aws-testing-framework';

const framework = new AWSTestingFramework();

Given('I have an S3 bucket named {string}', async function(bucketName: string) {
  await framework.createBucket(bucketName);
});

When('I upload a file {string} to the S3 bucket', async function(fileName: string) {
  await framework.uploadFile(fileName);
});

Then('the Lambda function should be triggered', async function() {
  await framework.verifyLambdaInvocation();
});
```

3. Configure Cucumber (cucumber.js):

```javascript
module.exports = {
  default: [
    '--require-module ts-node/register',
    '--require features/step_definitions/**/*.ts',
    '--format json:test-reports/cucumber-report.json',
    'features/**/*.feature',
  ].join(' '),
};
```

4. Run the tests:

```bash
npm test
```

## Configuration

### AWS Credentials

The framework uses the AWS SDK's default credential provider chain. You can configure credentials using:

1. Environment variables:
```bash
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=your_region
```

2. AWS credentials file (~/.aws/credentials):
```ini
[default]
aws_access_key_id = your_access_key
aws_secret_access_key = your_secret_key
```

### Framework Configuration

```typescript
const framework = new AWSTestingFramework({
  region: 'us-east-1',
  timeout: 30000,
  retryAttempts: 3
});
```

## Available Steps

### S3 Steps
- `Given I have an S3 bucket named {string}`
- `When I upload a file {string} to the S3 bucket`
- `Then the file {string} should exist in the bucket`

### SQS Steps
- `Given I have an SQS queue named {string}`
- `When I send a message {string} to the queue`
- `Then I should receive the message from the queue`

### Lambda Steps
- `Given I have a Lambda function named {string}`
- `When I invoke the function with payload {string}`
- `Then the function should return {string}`

### Step Functions Steps
- `Given I have a state machine named {string}`
- `When I start an execution with input {string}`
- `Then the execution should complete with status {string}`

## Test Reporting

The framework generates both JSON and HTML reports for test results.

### JSON Report
Located at `test-reports/cucumber-report.json`, this report contains detailed test execution data including:
- Feature and scenario information
- Step results and durations
- Error messages and stack traces

### HTML Report
Generate an HTML report from the JSON report:

```bash
npm run generate-report
```

The HTML report includes:
- Summary statistics (total, passed, failed scenarios)
- Feature and scenario details
- Step-by-step results with status and duration
- Error messages for failed steps
- Color-coded status indicators

## Code Quality

The framework uses Biome for code quality enforcement. Available commands:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Check code (format + lint)
npm run check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and ensure code quality
5. Submit a pull request

## License

MIT License - see LICENSE file for details 

## AWS Environment Setup for End-to-End Testing

To use this framework for production-ready, end-to-end testing, your AWS environment must be configured as follows:

1. **S3 Bucket Notification**: Your S3 bucket must be configured to send event notifications (e.g., ObjectCreated) to an SQS queue.
2. **SQS Trigger for Lambda**: The SQS queue must be configured to trigger your Lambda function.
3. **Lambda Permissions**: The Lambda function must have permission to start executions of your Step Function state machine.
4. **Step Function**: The Step Function should be configured to process the input as expected from the Lambda.

This framework does not simulate AWS events. It only observes and verifies the real event flow in your AWS environment. Ensure all resources and permissions are set up before running the tests.

## Problems to look at

