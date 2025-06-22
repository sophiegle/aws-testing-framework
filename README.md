# AWS Testing Framework

[![npm version](https://badge.fury.io/js/aws-testing-framework.svg)](https://badge.fury.io/js/aws-testing-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/sophiegle/aws-testing-framework/actions/workflows/test.yml/badge.svg)](https://github.com/sophiegle/aws-testing-framework/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/sophiegle/aws-testing-framework/branch/main/graph/badge.svg)](https://codecov.io/gh/sophiegle/aws-testing-framework)

A comprehensive BDD (Behavior-Driven Development) framework for testing AWS serverless architectures and workflows. Built with TypeScript and Cucumber, this framework enables end-to-end testing of complex AWS service interactions including S3, SQS, Lambda, and Step Functions.

## 🚀 Features

- **🔗 End-to-End Testing**: Test complete serverless workflows from S3 uploads to Step Function executions
- **🆔 Correlation Tracking**: Trace data flow through multiple AWS services using correlation IDs
- **📊 Advanced Monitoring**: CloudWatch logs analysis, performance metrics, and SLA verification
- **🔄 Retry Logic**: Built-in retry mechanisms for handling AWS service eventual consistency
- **📈 Comprehensive Reporting**: HTML, JSON, and custom test reports with detailed execution metrics
- **🔧 Extensible**: Easy to extend with custom step definitions and AWS service integrations
- **⚡ Performance Focused**: Optimized for fast test execution with parallel processing support

## 🏗️ Supported AWS Services

- **S3**: File uploads, downloads, and event notifications
- **SQS**: Message sending, receiving, and queue monitoring
- **Lambda**: Function invocation, execution tracking, and log analysis
- **Step Functions**: State machine execution, status monitoring, and history analysis
- **CloudWatch Logs**: Log retrieval, pattern matching, and error detection

## 📦 Installation

```bash
npm install aws-testing-framework
```

## 🚀 Quick Start

### 1. Set Up AWS Credentials

```bash
# Using AWS CLI (recommended)
aws configure

# Or environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_REGION=us-east-1
```

### 2. Create Your First Test

```gherkin
# features/my-pipeline.feature
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

```javascript
// cucumber.js
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
npx cucumber-js
```

## 📚 Documentation

- **[Getting Started](docs/GETTING_STARTED.md)** - Complete setup and usage guide
- **[API Documentation](docs/API.md)** - Detailed API reference
- **[Configuration Guide](docs/CONFIGURATION.md)** - Framework configuration options
- **[Testing Guide](docs/TESTING.md)** - Best practices for writing tests
- **[Advanced Usage](docs/ADVANCED.md)** - Advanced features and techniques
- **[Advanced Verification](docs/ADVANCED_VERIFICATION.md)** - Advanced monitoring and verification

## 🔧 Configuration

### Basic Configuration

```typescript
import { AWSTestingFramework } from 'aws-testing-framework';

const framework = new AWSTestingFramework({
  region: 'us-east-1',
  timeout: 30000,
  retryAttempts: 3,
  correlationIdPrefix: 'test'
});
```

### Environment Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=my-profile

# Framework Configuration
AWS_TESTING_TIMEOUT=30000
AWS_TESTING_RETRY_ATTEMPTS=3
AWS_TESTING_CORRELATION_PREFIX=test
```

## 🧪 Examples

### Basic Pipeline Testing

```gherkin
Scenario: Test S3 to Lambda to Step Function pipeline
  Given I have an S3 bucket named "test-bucket"
  And I have a Lambda function named "test-processor"
  And I have a Step Function named "test-pipeline"
  When I upload a file "data.json" with content '{"key": "value"}' to the S3 bucket
  Then the Lambda function should be invoked
  And the Step Function should be executed
  And I should be able to trace the file "data.json" through the entire pipeline
```

### Advanced Monitoring

```gherkin
Scenario: Monitor pipeline performance and logs
  When I upload a file "test-data.json" to the S3 bucket
  Then the Lambda function logs should contain "Processing file"
  And the Lambda function logs should not contain errors
  And the Lambda function should have acceptable execution metrics
  And the Step Function should have no data loss or corruption
  And the Step Function should meet performance SLAs
```

### Error Handling

```gherkin
Scenario: Handle processing errors gracefully
  When I upload a file "invalid-data.json" with content "invalid-json" to the S3 bucket
  Then the Lambda function logs should contain "Error processing file"
  And the Lambda function should handle the error appropriately
```

## 🔍 Advanced Features

### Correlation Tracking

```typescript
// Generate correlation ID for end-to-end tracking
const correlationId = framework.generateCorrelationId();

// Upload file with tracking
await framework.uploadFileWithTracking('my-bucket', 'test.txt', 'content', correlationId);

// Trace through entire workflow
const traced = await framework.traceFileThroughWorkflow('test.txt', correlationId);
```

### CloudWatch Logs Analysis

```typescript
// Get Lambda logs with pattern matching
const logs = await framework.getLambdaLogs('my-function', startTime, endTime, 'ERROR');

// Verify log patterns
const result = await framework.verifyLambdaLogsContain('my-function', startTime, endTime, ['Processing file']);

// Check for errors
const errorCheck = await framework.checkLambdaLogErrors('my-function', startTime, endTime);
```

### Step Function Monitoring

```typescript
// Get state outputs
const outputs = await framework.getStepFunctionStateOutput(executionArn, 'ProcessData');

// Verify state output
const verification = await framework.verifyStepFunctionStateOutput(executionArn, 'ProcessData', { status: 'success' });

// Analyze data flow
const dataFlow = await framework.getStepFunctionDataFlow(executionArn);

// Verify SLAs
const slaCheck = await framework.verifyStepFunctionSLAs(executionArn, {
  maxTotalExecutionTime: 60000,
  maxStateExecutionTime: 10000
});
```

## 🛠️ Development

### Prerequisites

- Node.js 18+
- AWS CLI configured
- TypeScript knowledge
- Cucumber/BDD experience (helpful)

### Setup

```bash
# Clone the repository
git clone https://github.com/sophiegle/aws-testing-framework.git
cd aws-testing-framework

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Available Scripts

```bash
# Development
npm run build          # Build TypeScript
npm run format         # Format code
npm run lint           # Lint code
npm run check          # Check and fix code quality

# Testing
npm test               # Run integration tests
npm run test:unit      # Run unit tests
npm run test:coverage  # Run tests with coverage
npm run test:mutation  # Run mutation tests

# Documentation
npm run docs:generate  # Generate API documentation
npm run docs:build     # Build documentation
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes
4. Run tests: `npm test`
5. Commit your changes: `git commit -m 'feat: add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/sophiegle/aws-testing-framework/issues)
- **Discussions**: [GitHub Discussions](https://github.com/sophiegle/aws-testing-framework/discussions)
- **Documentation**: [Full Documentation](docs/)

## 🔒 Security

We take security seriously. Please report any security vulnerabilities by creating a private issue or contacting us through GitHub.

See our [Security Policy](SECURITY.md) for more details.

## 📊 Project Status

- **Version**: 0.1.0
- **Status**: Active Development
- **Node.js Support**: 18+
- **AWS Services**: S3, SQS, Lambda, Step Functions, CloudWatch Logs

## 🙏 Acknowledgments

- [Cucumber.js](https://cucumber.io/) for BDD framework
- [AWS SDK v3](https://aws.amazon.com/sdk-for-javascript/) for AWS service integration
- [TypeScript](https://www.typescriptlang.org/) for type safety
- [Jest](https://jestjs.io/) for unit testing
- [Stryker](https://stryker-mutator.io/) for mutation testing

---

**Made with ❤️ for the AWS community**

## Step Definitions Organization

The framework organizes step definitions by functionality:

- **`s3-steps.ts`**: S3 operations (file uploads, bucket verification)
- **`sqs-steps.ts`**: SQS operations (message sending, queue verification)
- **`lambda-steps.ts`**: Lambda operations (function invocation, execution tracking)
- **`step-function-steps.ts`**: Step Function operations (execution, state verification)
- **`correlation-steps.ts`**: Cross-service correlation and data tracing
- **`monitoring-steps.ts`**: CloudWatch logs and advanced monitoring

## Example Usage

### Basic Data Pipeline Test

```gherkin
Feature: End-to-End Data Pipeline
  Scenario: Process uploaded file
    Given I have an S3 bucket named "test-bucket"
    And I have a Lambda function named "test-processor"
    And I have a Step Function named "test-pipeline"
    When I upload a file "test-data.json" with content "test-content" to the S3 bucket
    Then the Lambda function should be invoked
    And the Step Function should be executed
    And I should be able to trace the file "test-data.json" through the entire pipeline
```

### Advanced Monitoring Test

```gherkin
Scenario: Verify comprehensive monitoring
  When I upload a file "test-data.json" to the S3 bucket
  Then the Lambda function logs should contain "Processing file"
  And the Lambda function logs should not contain errors
  And the Lambda function should have acceptable execution metrics
  And the Step Function should have no data loss or corruption
  And the Step Function should meet performance SLAs
```

## Configuration

### AWS Credentials

Configure AWS credentials using one of these methods:

1. **AWS CLI**: `aws configure`
2. **Environment Variables**: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
3. **IAM Roles**: For EC2/ECS instances
4. **AWS Profiles**: `AWS_PROFILE=my-profile`

### Test Configuration

Create a `cucumber.js` file for custom configuration:

```javascript
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['src/steps/*.ts'],
    format: ['progress', 'html:reports/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' }
  }
};
```

## Architecture

The framework provides a layered approach to testing:

1. **Service Layer**: Direct AWS service interactions
2. **Correlation Layer**: Cross-service data tracking
3. **Monitoring Layer**: Advanced observability and validation
4. **Test Layer**: BDD scenarios and step definitions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## AWS Environment Setup for End-to-End Testing

To use this framework for production-ready, end-to-end testing, your AWS environment must be configured as follows:

1. **S3 Bucket Notification**: Your S3 bucket must be configured to send event notifications (e.g., ObjectCreated) to an SQS queue.
2. **SQS Trigger for Lambda**: The SQS queue must be configured to trigger your Lambda function.
3. **Lambda Permissions**: The Lambda function must have permission to start executions of your Step Function state machine.
4. **Step Function**: The Step Function should be configured to process the input as expected from the Lambda.

This framework does not simulate AWS events. It only observes and verifies the real event flow in your AWS environment. Ensure all resources and permissions are set up before running the tests.

## Problems to look at

