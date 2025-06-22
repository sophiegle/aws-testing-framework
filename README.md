# AWS Testing Framework

A comprehensive TypeScript-based testing framework for AWS serverless architectures, designed for end-to-end testing of data pipelines involving S3, SQS, Lambda, and Step Functions using BDD with Cucumber.

*NOTE: This project is not run or supported by AWS*

## Features

- **End-to-End Testing**: Test complete data pipelines from S3 uploads through Lambda processing to Step Function orchestration
- **Cross-Service Correlation**: Track data flow across multiple AWS services using correlation IDs
- **Advanced Monitoring**: CloudWatch logs analysis, Step Function state output verification, and performance SLA compliance
- **BDD Approach**: Write tests in natural language using Cucumber feature files
- **Modular Architecture**: Organized step definitions by functionality for easy maintenance and extension
- **Production-Ready**: Real AWS service integration with comprehensive error handling and validation

## Quick Start

### Prerequisites

- Node.js 16+
- AWS CLI configured with appropriate permissions
- AWS resources (S3, SQS, Lambda, Step Functions) deployed

### Installation

```bash
npm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific feature
npx cucumber-js features/end-to-end-workflow.feature

# Run with custom AWS profile
AWS_PROFILE=my-profile npm test
```

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

