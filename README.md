# AWS Testing Framework

[![npm version](https://badge.fury.io/js/aws-testing-framework.svg)](https://badge.fury.io/js/aws-testing-framework)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js CI](https://github.com/sophiegle/aws-testing-framework/actions/workflows/test.yml/badge.svg)](https://github.com/sophiegle/aws-testing-framework/actions/workflows/test.yml)
[![codecov](https://codecov.io/gh/sophiegle/aws-testing-framework/branch/main/graph/badge.svg)](https://codecov.io/gh/sophiegle/aws-testing-framework/branch/main/graph/badge.svg)

A comprehensive BDD (Behavior-Driven Development) framework for testing AWS serverless architectures and workflows. Built with TypeScript and Cucumber, this framework enables end-to-end testing of complex AWS service interactions including S3, SQS, Lambda, and Step Functions with real CloudWatch log verification.

**Note: This project is in its early stages and as such is not as stable or functionally comprehensive as I'd like! Feel free to raise issues and contribute in order to improve the package**

## 🚀 Features

- **🔗 End-to-End Testing**: Test complete serverless workflows from S3 uploads to Step Function executions
- **📊 Real CloudWatch Verification**: Actual Lambda execution verification using CloudWatch logs (not just function existence)
- **🔢 Lambda Execution Counting**: Verify specific execution counts within time periods (e.g., "5 times within 5 minutes")
- **📈 Advanced Monitoring**: CloudWatch logs analysis, performance metrics, and SLA verification
- **🔄 Retry Logic**: Built-in retry mechanisms for handling AWS service eventual consistency
- **📈 Comprehensive Reporting**: HTML, JSON, and custom test reports with detailed execution metrics
- **🔧 Extensible**: Easy to extend with custom step definitions and AWS service integrations
- **⚡ Performance Focused**: Optimized for fast test execution with parallel processing support
- **🏗️ Modular Architecture**: Clean separation of concerns with dedicated service classes

## 🏗️ Supported AWS Services

- **S3**: File uploads, downloads, and existence checks
- **SQS**: Message sending, receiving, and queue monitoring
- **Lambda**: Function invocation, execution tracking, CloudWatch log analysis, and execution counting
- **Step Functions**: State machine execution, status monitoring, and history analysis
- **CloudWatch Logs**: Log retrieval, pattern matching, error detection, and execution verification

## 📦 Installation

```bash
npm install aws-testing-framework
```

## 🚀 Quick Start

### 5-Minute Setup

```bash
# 1. Install
npm install aws-testing-framework

# 2. Initialize project (interactive)
npx aws-testing-framework init --interactive

# 3. Configure AWS credentials
aws configure

# 4. Verify environment
npx aws-testing-framework doctor

# 5. Run example tests
npx cucumber-js
```

### First Test Example

```gherkin
Feature: My First Test

  Scenario: Verify Lambda exists
    Given I have a Lambda function named "my-existing-function"
    When I invoke the Lambda function with payload "{"test":"data"}"
    Then the Lambda function should be invoked
```

**📖 [Complete Setup Guide](GETTING_STARTED.md)** - Comprehensive walkthrough with CloudFormation templates, troubleshooting, and learning path.

### Discover Available Steps

```bash
# See all available step definitions
npx aws-testing-framework steps

# Search for specific functionality
npx aws-testing-framework steps --search "lambda"
npx aws-testing-framework steps --search "upload"
```

## 🔍 Step Discovery

Don't know what steps are available? Use our built-in step discovery tools:

### CLI Commands

```bash
# List all available steps organized by service
npx aws-testing-framework steps

# Search for specific functionality
npx aws-testing-framework steps --search "upload"
npx aws-testing-framework steps --search "lambda"

# Filter by AWS service
npx aws-testing-framework steps --service s3
npx aws-testing-framework steps --service lambda

# Get detailed information about a specific step
npx aws-testing-framework steps --detail "I have an S3 bucket"

# Export steps documentation
npx aws-testing-framework steps --export steps.md
```

### Available Step Categories

- **🔧 S3 Steps**: File uploads, downloads, and bucket operations
- **📨 SQS Steps**: Message sending, receiving, and queue management
- **⚡ Lambda Steps**: Function invocation, execution tracking, and timeout configuration
- **🔄 Step Function Steps**: Workflow execution, state verification, and SLA compliance

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

- **[Getting Started Guide](GETTING_STARTED.md)** - Complete setup walkthrough (START HERE!)
- **[GitHub Repository](https://github.com/sophiegle/aws-testing-framework)** - Source code and issues
- **[Example Project](https://github.com/sophiegle/aws-testing-framework-test)** - Complete usage examples
- **[CHANGELOG](CHANGELOG.md)** - Version history and release notes
- **[Lambda CloudWatch Verification](docs/LAMBDA_CLOUDWATCH_VERIFICATION.md)** - Detailed guide for Lambda execution verification

## 🔧 Configuration

### Basic Configuration

```typescript
import { AWSTestingFramework } from 'aws-testing-framework';

// Development environment
const framework = AWSTestingFramework.createForDevelopment('eu-west-2');

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
AWS_REGION=eu-west-2
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
    Then the S3 bucket should contain the file "test-data.json"
    And the Lambda function should be invoked
    And the Step Function should be executed
```

### Lambda Execution Counting

```gherkin
Feature: Lambda Execution Verification
  Scenario: Verify Lambda execution count
    Given I have an S3 bucket named "test-bucket"
    And I have a Lambda function named "test-processor"
    When I upload multiple files to the S3 bucket
    Then the Lambda function should be invoked 3 times within 5 minutes

  Scenario: Load testing Lambda function
    Given I have an S3 bucket named "test-bucket"
    And I have a Lambda function named "test-processor"
    When I upload many files to the S3 bucket
    Then the Lambda function should be invoked 10 times within 10 minutes
```

### Lambda Execution Tracking

```gherkin
Scenario: Verify Lambda execution and logs
  Given I have a Lambda function named "test-processor"
  When I invoke the Lambda function with payload "{"test":"data"}"
  Then the Lambda function should be invoked
  And the Lambda function logs should not contain errors
```

### Step Function Execution

```gherkin
Scenario: Verify Step Function execution
  Given I have a Step Function named "test-workflow"
  When I start the Step Function execution with input "{"test":"data"}"
  Then the Step Function execution should succeed
```

## 🔍 Key Differentiators

### Real Lambda Execution Verification

Unlike other frameworks that only check if Lambda functions exist, this framework verifies **actual execution** using CloudWatch logs. This unique capability ensures your Lambdas are truly being invoked by your event sources, not just deployed.

### Comprehensive Step Definitions

All step definitions are strongly typed and fully tested:
- **S3Steps**: 100% test coverage - File operations with retry logic
- **SQSSteps**: 100% test coverage - Message operations with verification
- **LambdaSteps**: 92.85% test coverage - Execution tracking and log analysis
- **StepFunctionSteps**: 100% test coverage - Workflow execution and status verification

### Production-Ready Services

Battle-tested service layer with comprehensive coverage:
- **S3Service**: 91.66% coverage - Bucket and file operations
- **SQSService**: 100% coverage - Queue and message management
- **LambdaService**: 89.13% coverage - Function invocation and CloudWatch integration
- **StepFunctionService**: 59.42% coverage - State machine operations
- **HealthValidator**: 97.91% coverage - AWS setup validation

## ⚙️ Configuration Management

The framework supports configuration through environment-specific config files:

```javascript
// development-config.js
module.exports = {
  testing: {
    verbose: true,
    defaultTimeout: 60000
  }
};

// ci-config.js  
module.exports = {
  ci: {
    uploadToS3: {
      bucket: process.env.S3_REPORTS_BUCKET,
      prefix: `reports/${process.env.BRANCH_NAME}`
    },
    notifications: {
      slack: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: '#test-results',
        onFailure: true
      }
    }
  }
};
```

### Supported Configuration Files

The framework automatically searches for configuration files:

- `aws-testing-framework.config.js`
- `aws-testing-framework.config.json` 
- `awstf.config.js` / `awstf.config.json`
- `.awstf.json`
- `package.json` (`awsTestingFramework` section)

### Auto-detected Environment Variables

- `AWS_REGION`, `NODE_ENV`, `BUILD_ID`, `BRANCH_NAME`
- `SLACK_WEBHOOK_URL`, `S3_REPORTS_BUCKET`
- `GITHUB_RUN_ID`, `GITHUB_REF_NAME`, `GITHUB_SHA`

See [`examples/config/`](examples/config/) for complete configuration examples and [`examples/config/README.md`](examples/config/README.md) for detailed documentation.

## 🏗️ Architecture

The framework uses a modular architecture with dedicated service classes:

### Core Framework
- **`AWSTestingFramework`**: Main framework class that orchestrates all services
- **`types.ts`**: TypeScript interfaces and type definitions

### Service Classes
- **`S3Service`**: S3 bucket and file operations
- **`SQSService`**: SQS queue and message operations
- **`LambdaService`**: Lambda function operations with CloudWatch log verification
- **`StepFunctionService`**: Step Function state machine operations
- **`StepContextManager`**: Test step context management
- **`HealthValidator`**: AWS service health validation

### Step Definitions
- **`S3Steps.ts`**: S3 operations (file uploads, bucket verification)
- **`SQSSteps.ts`**: SQS operations (message sending, queue verification)
- **`LambdaSteps.ts`**: Lambda operations (function invocation, execution tracking, execution counting)
- **`StepFunctionSteps.ts`**: Step Function operations (execution, state verification, SLA compliance)

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
npm run test:unit              # Run unit tests (360 tests, 48% coverage)
npm run test:unit:coverage     # Run unit tests with coverage report
npm test                       # Run Cucumber integration tests (requires AWS setup)
npm run test:mutation          # Run mutation tests

# Documentation
npm run docs:generate  # Generate API documentation
npm run docs:build     # Build documentation
```

**Note**: Integration tests (`npm test`) require a configured AWS environment with deployed resources. For development and CI/CD, use `npm run test:unit` which runs against mocks and requires no AWS setup.

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

- **Version**: 0.6.0
- **Status**: Active Development
- **Node.js Support**: 18+
- **AWS Services**: S3, SQS, Lambda, Step Functions, CloudWatch Logs
- **Test Coverage**: 48% overall, 71% services layer, 84% steps layer
- **Total Tests**: 360 comprehensive tests with full type safety

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
5. **CloudWatch Logs**: Lambda functions must have CloudWatch logging enabled for execution verification.

This framework does not simulate AWS events. It only observes and verifies the real event flow in your AWS environment. Ensure all resources and permissions are set up before running the tests.
