# API Documentation

This document provides detailed information about the AWS Testing Framework API.

## Core Framework

### `AWSTestingFramework`

The main framework class that provides all AWS service interactions.

```typescript
import { AWSTestingFramework } from 'aws-testing-framework';

const framework = new AWSTestingFramework();
```

#### Constructor Options

```typescript
interface FrameworkOptions {
  region?: string;
  timeout?: number;
  retryAttempts?: number;
  correlationIdPrefix?: string;
}

const framework = new AWSTestingFramework({
  region: 'us-east-1',
  timeout: 30000,
  retryAttempts: 3,
  correlationIdPrefix: 'test'
});
```

## S3 Operations

### `findBucket(bucketName: string): Promise<void>`

Verifies that an S3 bucket exists.

```typescript
await framework.findBucket('my-bucket');
```

### `uploadFile(bucketName: string, fileName: string, content: string): Promise<void>`

Uploads a file to S3.

```typescript
await framework.uploadFile('my-bucket', 'test.txt', 'Hello World');
```

### `uploadFileWithTracking(bucketName: string, fileName: string, content: string, correlationId: string): Promise<void>`

Uploads a file with correlation ID tracking for end-to-end testing.

```typescript
await framework.uploadFileWithTracking('my-bucket', 'test.txt', 'Hello World', 'test-123');
```

### `checkFileExists(bucketName: string, fileName: string): Promise<boolean>`

Checks if a file exists in S3.

```typescript
const exists = await framework.checkFileExists('my-bucket', 'test.txt');
```

## SQS Operations

### `findQueue(queueName: string): Promise<string>`

Finds an SQS queue by name and returns the queue URL.

```typescript
const queueUrl = await framework.findQueue('my-queue');
```

### `sendMessage(queueUrl: string, message: string): Promise<void>`

Sends a message to an SQS queue.

```typescript
await framework.sendMessage(queueUrl, 'Hello from SQS');
```

### `getUnreadMessageCount(queueUrl: string): Promise<number>`

Gets the number of unread messages in a queue.

```typescript
const count = await framework.getUnreadMessageCount(queueUrl);
```

## Lambda Operations

### `findFunction(functionName: string): Promise<void>`

Verifies that a Lambda function exists.

```typescript
await framework.findFunction('my-function');
```

### `invokeFunction(functionName: string, payload: any): Promise<any>`

Invokes a Lambda function with a payload.

```typescript
const result = await framework.invokeFunction('my-function', { key: 'value' });
```

### `checkLambdaExecution(functionName: string): Promise<boolean>`

Checks if a Lambda function has been executed recently.

```typescript
const executed = await framework.checkLambdaExecution('my-function');
```

### `trackLambdaExecution(functionName: string, correlationId: string): Promise<boolean>`

Tracks Lambda execution using correlation ID.

```typescript
const tracked = await framework.trackLambdaExecution('my-function', 'test-123');
```

## Step Function Operations

### `findStateMachine(stateMachineName: string): Promise<string>`

Finds a Step Function state machine by name and returns the ARN.

```typescript
const stateMachineArn = await framework.findStateMachine('my-pipeline');
```

### `startExecution(stateMachineArn: string, input: any): Promise<string>`

Starts a Step Function execution.

```typescript
const executionArn = await framework.startExecution(stateMachineArn, { key: 'value' });
```

### `checkStateMachineExecution(stateMachineName: string): Promise<boolean>`

Checks if a Step Function has been executed recently.

```typescript
const executed = await framework.checkStateMachineExecution('my-pipeline');
```

### `trackStepFunctionExecution(stateMachineName: string, correlationId: string): Promise<boolean>`

Tracks Step Function execution using correlation ID.

```typescript
const tracked = await framework.trackStepFunctionExecution('my-pipeline', 'test-123');
```

### `getExecutionStatus(executionArn: string): Promise<string>`

Gets the status of a Step Function execution.

```typescript
const status = await framework.getExecutionStatus(executionArn);
```

## Correlation and Tracking

### `generateCorrelationId(): string`

Generates a unique correlation ID for tracking data flow.

```typescript
const correlationId = framework.generateCorrelationId();
```

### `getWorkflowTrace(correlationId: string): WorkflowTrace | undefined`

Gets the workflow trace for a correlation ID.

```typescript
const trace = framework.getWorkflowTrace('test-123');
```

### `traceFileThroughWorkflow(fileName: string, correlationId: string): Promise<boolean>`

Traces a file through the entire workflow.

```typescript
const traced = await framework.traceFileThroughWorkflow('test.txt', 'test-123');
```

## Monitoring and Verification

### CloudWatch Logs

#### `getLambdaLogs(functionName: string, startTime: Date, endTime: Date, filterPattern?: string): Promise<LogEvent[]>`

Retrieves Lambda function logs from CloudWatch.

```typescript
const logs = await framework.getLambdaLogs('my-function', startTime, endTime, 'ERROR');
```

#### `verifyLambdaLogsContain(functionName: string, startTime: Date, endTime: Date, patterns: string[]): Promise<LogVerificationResult>`

Verifies that Lambda logs contain specific patterns.

```typescript
const result = await framework.verifyLambdaLogsContain('my-function', startTime, endTime, ['Processing file']);
```

#### `checkLambdaLogErrors(functionName: string, startTime: Date, endTime: Date): Promise<ErrorCheckResult>`

Checks for errors in Lambda logs.

```typescript
const result = await framework.checkLambdaLogErrors('my-function', startTime, endTime);
```

#### `getLambdaExecutionMetrics(functionName: string, startTime: Date, endTime: Date): Promise<ExecutionMetrics>`

Gets Lambda execution metrics from logs.

```typescript
const metrics = await framework.getLambdaExecutionMetrics('my-function', startTime, endTime);
```

### Step Function Monitoring

#### `getStepFunctionStateOutput(executionArn: string, stateName?: string): Promise<StateOutput[]>`

Gets Step Function state outputs.

```typescript
const outputs = await framework.getStepFunctionStateOutput(executionArn, 'ProcessData');
```

#### `verifyStepFunctionStateOutput(executionArn: string, stateName: string, expectedOutput: any): Promise<StateOutputVerification>`

Verifies Step Function state output.

```typescript
const result = await framework.verifyStepFunctionStateOutput(executionArn, 'ProcessData', { status: 'success' });
```

#### `getStepFunctionDataFlow(executionArn: string): Promise<DataFlowResult>`

Analyzes data flow between Step Function states.

```typescript
const dataFlow = await framework.getStepFunctionDataFlow(executionArn);
```

#### `verifyStepFunctionSLAs(executionArn: string, slas: SLADefinition): Promise<SLAVerification>`

Verifies Step Function performance SLAs.

```typescript
const result = await framework.verifyStepFunctionSLAs(executionArn, {
  maxTotalExecutionTime: 60000,
  maxStateExecutionTime: 10000
});
```

## Utility Methods

### `waitForCondition(condition: () => Promise<boolean>, timeout?: number): Promise<void>`

Waits for a condition to be true.

```typescript
await framework.waitForCondition(async () => {
  return await framework.checkFileExists('my-bucket', 'test.txt');
}, 30000);
```

### `checkLambdaErrors(functionName: string, timeWindowMinutes: number): Promise<boolean>`

Checks for Lambda errors in a time window.

```typescript
const hasErrors = await framework.checkLambdaErrors('my-function', 10);
```

### `verifyLambdaExecutionTime(functionName: string, maxExecutionTimeMs: number): Promise<boolean>`

Verifies Lambda execution time.

```typescript
const withinLimit = await framework.verifyLambdaExecutionTime('my-function', 5000);
```

### `verifyLambdaConfiguration(functionName: string): Promise<ConfigurationResult>`

Verifies Lambda function configuration.

```typescript
const config = await framework.verifyLambdaConfiguration('my-function');
```

## Types and Interfaces

### `StepContext`

Context object passed to step definitions.

```typescript
interface StepContext {
  bucketName?: string;
  queueName?: string;
  queueUrl?: string;
  functionName?: string;
  stateMachineName?: string;
  stateMachineArn?: string;
  executionArn?: string;
  correlationId?: string;
  uploadedFileName?: string;
  uploadedFileContent?: string;
  expectedStateMachineName?: string;
}
```

### `WorkflowTrace`

Trace information for a workflow execution.

```typescript
interface WorkflowTrace {
  correlationId: string;
  s3Event?: S3Event;
  sqsMessage?: SQSMessage;
  lambdaExecution?: LambdaExecution;
  stepFunctionExecution?: StepFunctionExecution;
}
```

### `LogEvent`

CloudWatch log event.

```typescript
interface LogEvent {
  timestamp: Date;
  message: string;
  logStreamName: string;
  eventId: string;
}
```

### `ExecutionMetrics`

Lambda execution metrics.

```typescript
interface ExecutionMetrics {
  executionCount: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  coldStarts: number;
  errors: number;
}
```

## Error Handling

The framework throws descriptive errors for common issues:

```typescript
try {
  await framework.findBucket('non-existent-bucket');
} catch (error) {
  console.error('Bucket not found:', error.message);
}
```

## Best Practices

1. **Use correlation IDs** for end-to-end testing
2. **Set appropriate timeouts** for your environment
3. **Handle errors gracefully** in your step definitions
4. **Use environment variables** for configuration
5. **Clean up test data** after tests complete 