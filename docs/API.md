# AWS Testing Framework API Documentation

## Core Classes

### AWSTestingFramework

The main class for interacting with AWS services and managing test execution.

```typescript
import { AWSTestingFramework } from 'aws-testing-framework';

const framework = new AWSTestingFramework({
  region: 'us-east-1',
  timeout: 30000,
  retryAttempts: 3
});
```

#### Constructor Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| region | string | 'us-east-1' | AWS region to use |
| timeout | number | 30000 | Default timeout in milliseconds |
| retryAttempts | number | 3 | Number of retry attempts for operations |

#### Methods

##### S3 Operations

```typescript
// Create an S3 bucket
await framework.createBucket(bucketName: string): Promise<void>

// Upload a file to S3
await framework.uploadFile(fileName: string, content?: string): Promise<void>

// Check if a file exists in S3
await framework.checkFileExists(fileName: string): Promise<boolean>

// Delete a file from S3
await framework.deleteFile(fileName: string): Promise<void>
```

##### SQS Operations

```typescript
// Create an SQS queue
await framework.createQueue(queueName: string): Promise<string>

// Send a message to SQS
await framework.sendMessage(queueUrl: string, message: string): Promise<void>

// Receive messages from SQS
await framework.receiveMessages(queueUrl: string): Promise<Message[]>

// Delete a message from SQS
await framework.deleteMessage(queueUrl: string, receiptHandle: string): Promise<void>
```

##### Lambda Operations

```typescript
// Create a Lambda function
await framework.createFunction(
  functionName: string,
  handler: string,
  code: Buffer
): Promise<void>

// Invoke a Lambda function
await framework.invokeFunction(
  functionName: string,
  payload: any
): Promise<any>

// Verify Lambda invocation
await framework.verifyLambdaInvocation(
  functionName: string,
  timeout?: number
): Promise<boolean>
```

##### Step Functions Operations

```typescript
// Create a state machine
await framework.createStateMachine(
  name: string,
  definition: string
): Promise<string>

// Start an execution
await framework.startExecution(
  stateMachineArn: string,
  input: any
): Promise<string>

// Get execution status
await framework.getExecutionStatus(
  executionArn: string
): Promise<string>
```

### TestReporter

Class for generating test reports.

```typescript
import { TestReporter } from 'aws-testing-framework';

const reporter = new TestReporter({
  outputDir: 'test-reports'
});
```

#### Methods

```typescript
// Start tracking a feature
reporter.startFeature(feature: Feature): void

// Start tracking a scenario
reporter.startScenario(scenario: Scenario): void

// Record a step result
reporter.recordStep(step: Step, result: StepResult): void

// Generate reports
reporter.generateReports(): Promise<void>
```

## Step Definitions

### Base Steps

The framework provides pre-defined step definitions for common AWS operations.

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { AWSTestingFramework } from 'aws-testing-framework';

const framework = new AWSTestingFramework();

// S3 Steps
Given('I have an S3 bucket named {string}', async function(bucketName: string) {
  await framework.createBucket(bucketName);
});

// SQS Steps
Given('I have an SQS queue named {string}', async function(queueName: string) {
  await framework.createQueue(queueName);
});

// Lambda Steps
Given('I have a Lambda function named {string}', async function(functionName: string) {
  await framework.createFunction(functionName, 'index.handler', code);
});

// Step Functions Steps
Given('I have a state machine named {string}', async function(name: string) {
  await framework.createStateMachine(name, definition);
});
```

## Custom Formatter

The framework includes a custom Cucumber formatter for generating test reports.

```typescript
import { CustomFormatter } from 'aws-testing-framework';

const formatter = new CustomFormatter({
  outputDir: 'test-reports'
});
```

## Types

### StepContext

Interface for step definition context.

```typescript
interface StepContext {
  framework: AWSTestingFramework;
  bucketName?: string;
  queueUrl?: string;
  functionName?: string;
  stateMachineArn?: string;
  executionArn?: string;
}
```

### TestResult

Interface for test execution results.

```typescript
interface TestResult {
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: Error;
}
```

## Error Handling

The framework provides custom error classes for different types of failures:

```typescript
class AWSTestingFrameworkError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
  }
}

class ResourceNotFoundError extends AWSTestingFrameworkError {
  constructor(resourceType: string, resourceName: string) {
    super(
      `${resourceType} '${resourceName}' not found`,
      'RESOURCE_NOT_FOUND'
    );
  }
}

class TimeoutError extends AWSTestingFrameworkError {
  constructor(operation: string, timeout: number) {
    super(
      `Operation '${operation}' timed out after ${timeout}ms`,
      'TIMEOUT'
    );
  }
}
```

## Best Practices

1. Always use the provided step definitions when possible
2. Handle AWS service errors appropriately
3. Clean up resources after tests
4. Use appropriate timeouts for long-running operations
5. Implement proper error handling in custom steps
6. Follow the BDD pattern for test organization
7. Use the test reporter for consistent reporting 