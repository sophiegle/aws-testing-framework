# Basic Pipeline Example

This example demonstrates testing a simple S3 to Lambda to Step Function pipeline.

## Architecture

```
S3 Upload → SQS Message → Lambda Function → Step Function
```

## Prerequisites

1. Deploy the following AWS resources:
   - S3 bucket with SQS event notification
   - SQS queue
   - Lambda function that processes SQS messages
   - Step Function that gets triggered by Lambda

2. Configure AWS credentials

## Test Scenario

The test verifies that:
1. File upload to S3 triggers SQS message
2. Lambda function processes the SQS message
3. Lambda function triggers Step Function
4. Data flows correctly through the entire pipeline

## Running the Example

```bash
# Install dependencies
npm install

# Run the test
npx cucumber-js features/basic-pipeline.feature
```

## Expected Output

```
Feature: Basic Pipeline
  Scenario: Process uploaded file
    ✓ Given I have an S3 bucket named "my-bucket"
    ✓ And I have a Lambda function named "my-processor"
    ✓ And I have a Step Function named "my-pipeline"
    ✓ When I upload a file "test-data.json" with content "test-content" to the S3 bucket
    ✓ Then the Lambda function should be invoked
    ✓ And the Step Function should be executed
    ✓ And I should be able to trace the file "test-data.json" through the entire pipeline

1 scenario (1 passed)
7 steps (7 passed)
```

## Files

- `features/basic-pipeline.feature` - Test scenario
- `cucumber.js` - Cucumber configuration
- `README.md` - This file 