# AWS Testing Framework

[![npm version](https://badge.fury.io/js/aws-testing-framework.svg)](https://badge.fury.io/js/aws-testing-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/sophiegle/aws-testing-framework/actions/workflows/test.yml/badge.svg)](https://github.com/sophiegle/aws-testing-framework/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/sophiegle/aws-testing-framework/branch/main/graph/badge.svg)](https://codecov.io/gh/sophiegle/aws-testing-framework/branch/main/graph/badge.svg)

A comprehensive BDD (Behavior-Driven Development) framework for testing AWS serverless architectures and workflows. Built with TypeScript and Cucumber, this framework enables end-to-end testing of complex AWS service interactions including S3, SQS, Lambda, and Step Functions.

**Note: This project is in its early stages and as such is not as stable or functionally comprehensive as I'd like! Feel free to raise issues and contribute in order to improve the package**

## 🚀 Features

- **🔗 End-to-End Testing**: Test complete serverless workflows from S3 uploads to Step Function executions
- **📊 Advanced Monitoring**: CloudWatch logs analysis, performance metrics, and SLA verification
- **🔄 Retry Logic**: Built-in retry mechanisms for handling AWS service eventual consistency
- **📈 Comprehensive Reporting**: HTML, JSON, and custom test reports with detailed execution metrics
- **🔧 Extensible**: Easy to extend with custom step definitions and AWS service integrations
- **⚡ Performance Focused**: Optimized for fast test execution with parallel processing support
- **🏗️ Modular Architecture**: Clean separation of concerns with dedicated service classes

## 🏗️ Supported AWS Services

- **S3**: File uploads, downloads, and existence checks
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

## 📖 Example Project

Looking for a complete, real-world example? Check out the **[aws-testing-framework-test](https://github.com/sophiegle/aws-testing-framework-test)** repository!

This comprehensive example project demonstrates four different usage patterns:

- **🔧 Built-in Methods** - Use framework's built-in step definitions directly
- **🎯 Custom Steps** - Create your own step definitions with business logic  
- **🔌 Extend Steps** - Override and extend built-in steps with custom validation
- **📝 Feature-only** - Use built-in steps directly in feature files

> ⭐ **Clone it, try it, and adapt it for your own AWS serverless projects!**

```bash
git clone https://github.com/sophiegle/aws-testing-framework-test.git
cd aws-testing-framework-test
npm install
# Follow the setup instructions to configure your AWS resources
npm run test:all
```

## 📚 Documentation

- **[GitHub Repository](https://github.com/sophiegle/aws-testing-framework)** - Source code and issues
- **[Example Project](https://github.com/sophiegle/aws-testing-framework-test)** - Complete usage examples

## 🔧 Configuration

### Basic Configuration

```typescript
import { AWSTestingFramework } from 'aws-testing-framework';

// Development environment
const framework = AWSTestingFramework.createForDevelopment('us-east-1');

// Production environment
const framework = AWSTestingFramework.createForProduction('us-west-2');

// Custom configuration
const framework = AWSTestingFramework.create({
  aws: { region: 'eu-west-1' },
  defaultTimeout: 60000,
  retryAttempts: 3,
  enableLogging: true,
  logLevel: 'info'
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
```

## 🧪 Examples

### Basic Pipeline Testing

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

### Advanced Monitoring

```gherkin
Scenario: Verify comprehensive monitoring
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

### Performance Monitoring

```typescript
// Start performance monitoring
framework.startTestRun();

// Perform operations
await framework.uploadFile('my-bucket', 'test.txt', 'content');
await framework.sendMessage('queue-url', 'message');

// Get comprehensive metrics
const metrics = framework.getTestMetrics();
console.log(framework.generatePerformanceReport());
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

### Health Monitoring

```typescript
// Validate AWS setup
const setup = await framework.validateAWSSetup();
if (!setup.isValid) {
  console.error('AWS setup issues:', setup.errors);
}

// Get framework health
const health = await framework.getHealthStatus();
console.log('Framework healthy:', health.isHealthy);
```

## 🏗️ Architecture

The framework uses a modular architecture with dedicated service classes:

### Core Framework
- **`AWSTestingFramework`**: Main framework class that orchestrates all services
- **`types.ts`**: TypeScript interfaces and type definitions

### Service Classes
- **`S3Service`**: S3 bucket and file operations
- **`SQSService`**: SQS queue and message operations
- **`LambdaService`**: Lambda function operations
- **`StepFunctionService`**: Step Function state machine operations
- **`PerformanceMonitor`**: Performance metrics and reporting
- **`StepContextManager`**: Test step context management
- **`HealthValidator`**: AWS service health validation

### Step Definitions
- **`s3-steps.ts`**: S3 operations (file uploads, bucket verification)
- **`sqs-steps.ts`**: SQS operations (message sending, queue verification)
- **`lambda-steps.ts`**: Lambda operations (function invocation, execution tracking)
- **`step-function-steps.ts`**: Step Function operations (execution, state verification)
- **`monitoring-steps.ts`**: CloudWatch logs and advanced monitoring
- **`correlation-steps.ts`**: Cross-service correlation and data tracing

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
- **Documentation**: [API Documentation](https://github.com/sophiegle/aws-testing-framework#readme)

## 🔒 Security

We take security seriously. Please report any security vulnerabilities by creating a private issue or contacting us through GitHub.

See our [Security Policy](SECURITY.md) for more details.

## 📊 Project Status

- **Version**: 0.1.8
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

## AWS Environment Setup for End-to-End Testing

To use this framework for production-ready, end-to-end testing, your AWS environment must be configured as follows:

1. **S3 Bucket Notification**: Your S3 bucket must be configured to send event notifications (e.g., ObjectCreated) to an SQS queue.
2. **SQS Trigger for Lambda**: The SQS queue must be configured to trigger your Lambda function.
3. **Lambda Permissions**: The Lambda function must have permission to start executions of your Step Function state machine.
4. **Step Function**: The Step Function should be configured to process the input as expected from the Lambda.

This framework does not simulate AWS events. It only observes and verifies the real event flow in your AWS environment. Ensure all resources and permissions are set up before running the tests.
