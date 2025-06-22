# Getting Started with AWS Testing Framework

This guide will help you get up and running with the AWS Testing Framework for testing your serverless architectures.

## Prerequisites

- **Node.js 16+** and npm
- **AWS CLI** configured with appropriate permissions
- **AWS resources** (S3, SQS, Lambda, Step Functions) deployed in your account

## Installation

### Option 1: Install as a Package (Recommended)

```bash
npm install aws-testing-framework
```

### Option 2: Clone and Use Locally

```bash
git clone https://github.com/sophiegle/aws-testing-framework.git
cd aws-testing-framework
npm install
```

## Quick Start

### 1. Set Up AWS Credentials

Configure your AWS credentials using one of these methods:

```bash
# Method 1: AWS CLI
aws configure

# Method 2: Environment Variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1

# Method 3: AWS Profile
export AWS_PROFILE=my-profile
```

### 2. Create Your First Test

Create a feature file `features/my-pipeline.feature`:

```gherkin
Feature: My Data Pipeline
  As a developer
  I want to test my S3 to Lambda to Step Function pipeline
  So that I can ensure data flows correctly

  Scenario: Process uploaded file
    Given I have an S3 bucket named "my-bucket"
    And I have a Lambda function named "my-processor"
    And I have a Step Function named "my-pipeline"
    When I upload a file "test-data.json" with content "test-content" to the S3 bucket
    Then the Lambda function should be invoked
    And the Step Function should be executed
    And I should be able to trace the file "test-data.json" through the entire pipeline
```

### 3. Configure Cucumber

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

### 4. Run Your Tests

```bash
# Run all tests
npx cucumber-js

# Run specific feature
npx cucumber-js features/my-pipeline.feature

# Run with custom AWS profile
AWS_PROFILE=my-profile npx cucumber-js
```

## Common Use Cases

### Testing S3 to Lambda Integration

```gherkin
Scenario: File upload triggers Lambda
  Given I have an S3 bucket named "my-bucket"
  And I have a Lambda function named "my-processor"
  When I upload a file "test.txt" to the S3 bucket
  Then the Lambda function should be invoked
  And the Lambda function should process the exact file "test.txt"
```

### Testing Lambda to Step Function Integration

```gherkin
Scenario: Lambda triggers Step Function
  Given I have a Lambda function named "my-processor"
  And I have a Step Function named "my-pipeline"
  When I invoke the Lambda function with payload '{"key": "value"}'
  Then the Lambda function should trigger the Step Function "my-pipeline"
  And the Step Function execution should complete successfully
```

### Advanced Monitoring

```gherkin
Scenario: Monitor pipeline performance
  When I upload a file "test-data.json" to the S3 bucket
  Then the Lambda function logs should contain "Processing file"
  And the Lambda function logs should not contain errors
  And the Lambda function should have acceptable execution metrics
  And the Step Function should have no data loss or corruption
  And the Step Function should meet performance SLAs
```

## Configuration Options

### Environment Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=my-profile

# Test Configuration
CUCUMBER_TIMEOUT=30000
CUCUMBER_RETRY_ATTEMPTS=3
```

### Custom Step Definitions

You can extend the framework with your own step definitions:

```typescript
// my-steps.ts
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

## Troubleshooting

### Common Issues

1. **Permission Denied**: Ensure your AWS credentials have the necessary permissions
2. **Resource Not Found**: Verify your AWS resources exist and are in the correct region
3. **Timeout Errors**: Increase timeout values for slower environments
4. **Correlation ID Issues**: Ensure your Lambda functions include correlation IDs in their processing

### Debug Mode

Enable debug logging:

```bash
DEBUG=aws-testing-framework:* npx cucumber-js
```

### Getting Help

- Check the [API Documentation](API.md)
- Review [Advanced Usage](ADVANCED.md)
- Open an issue on GitHub
- Check existing issues for solutions

## Example Project

For a complete, working example with multiple usage patterns, check out the **[aws-testing-framework-test](https://github.com/sophiegle/aws-testing-framework-test)** repository.

This example project demonstrates:

- **Built-in Methods** - Using framework's built-in step definitions
- **Custom Steps** - Creating your own step definitions with business logic
- **Extend Steps** - Overriding and extending built-in steps
- **Feature-only** - Using built-in steps directly in feature files

```bash
# Clone and try the example project
git clone https://github.com/sophiegle/aws-testing-framework-test.git
cd aws-testing-framework-test
npm install
# Follow the setup instructions to configure your AWS resources
npm run test:all
```

## Next Steps

- Read the [API Documentation](API.md) for detailed method descriptions
- Explore [Advanced Usage](ADVANCED.md) for complex scenarios
- Check out the [Example Project](https://github.com/sophiegle/aws-testing-framework-test) for real-world use cases 