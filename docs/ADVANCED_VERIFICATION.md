# Advanced AWS Service Verification

This document describes the advanced verification capabilities added to the AWS Testing Framework for comprehensive monitoring and validation of serverless workflows.

## CloudWatch Logs Verification

### Lambda Function Log Analysis

The framework now provides comprehensive CloudWatch logs analysis for Lambda functions:

#### Basic Log Retrieval
```typescript
const logs = await framework.getLambdaLogs(
  functionName,
  startTime,
  endTime,
  filterPattern // optional
);
```

#### Pattern Matching in Logs
```gherkin
Then the Lambda function logs should contain "Processing file"
```

This step verifies that specific patterns or messages appear in the Lambda function logs within a time window.

#### Error Detection
```gherkin
Then the Lambda function logs should not contain errors
```

This step checks for common error patterns in Lambda logs:
- ERROR
- Exception
- Error:
- Failed
- Timeout
- OutOfMemory
- Task timed out

#### Execution Metrics Analysis
```gherkin
Then the Lambda function should have acceptable execution metrics
```

This step analyzes Lambda execution metrics from logs:
- Execution count
- Average duration
- Maximum/minimum duration
- Cold start count
- Error count

### CloudWatch Logs Methods

#### `getLambdaLogs(functionName, startTime, endTime, filterPattern?)`
Retrieves Lambda function logs from CloudWatch with optional filtering.

#### `verifyLambdaLogsContain(functionName, startTime, endTime, patterns)`
Checks if Lambda logs contain specific patterns and returns detailed matching information.

#### `checkLambdaLogErrors(functionName, startTime, endTime)`
Analyzes logs for error patterns and returns error statistics.

#### `getLambdaExecutionMetrics(functionName, startTime, endTime)`
Extracts performance metrics from Lambda execution logs.

## Step Function State Output Verification

### State-Specific Output Analysis

The framework provides detailed analysis of Step Function state outputs and data flow:

#### State Output Verification
```gherkin
Then the Step Function state "ProcessData" should have output containing '{"status": "success", "processed": true}'
```

This step verifies that specific states produce expected output data.

#### Data Flow Analysis
```gherkin
Then the Step Function should have no data loss or corruption
```

This step analyzes data flow between states to detect:
- Data loss between state transitions
- Data corruption or unexpected transformations
- Missing or malformed data

#### Performance SLA Verification
```gherkin
Then the Step Function should meet performance SLAs
```

This step verifies that Step Function executions meet defined performance SLAs:
- Maximum total execution time
- Maximum state execution time
- Maximum cold start time

### Step Function Verification Methods

#### `getStepFunctionStateOutput(executionArn, stateName?)`
Retrieves output data for specific states in a Step Function execution.

#### `verifyStepFunctionStateOutput(executionArn, stateName, expectedOutput)`
Verifies that a specific state produces expected output data.

#### `getStepFunctionDataFlow(executionArn)`
Analyzes data flow between states to detect data loss or corruption.

#### `verifyStepFunctionSLAs(executionArn, slas)`
Verifies that Step Function execution meets defined performance SLAs.

#### `verifyStepFunctionDefinition(stateMachineName)`
Validates Step Function state machine definition for correctness.

## Advanced Verification Scenarios

### Comprehensive Workflow Monitoring

```gherkin
Scenario: Verify comprehensive workflow monitoring
  When I upload a file "test-data.json" to the S3 bucket
  Then the Lambda function should be invoked
  And the Lambda function logs should contain "File processed successfully"
  And the Lambda function should have acceptable execution metrics
  And the Step Function should be executed
  And the Step Function state "ValidateData" should have output containing '{"valid": true, "recordCount": 1}'
  And the Step Function should have no data loss or corruption
  And the Step Function should meet performance SLAs
```

### Error Handling Verification

```gherkin
Scenario: Verify error handling and logging
  When I upload a file "invalid-data.json" to the S3 bucket
  Then the Lambda function should be invoked
  And the Lambda function logs should contain "Error processing file"
  And the Step Function should be executed
  And the Step Function state "ErrorHandler" should have output containing '{"error": "Invalid data format", "handled": true}'
  And the Step Function should have no data loss or corruption
```

### Performance Under Load

```gherkin
Scenario: Verify performance under load
  When I upload multiple files to the S3 bucket
  Then the Lambda function should be invoked multiple times
  And the Lambda function should have acceptable execution metrics
  And the Step Function should be executed multiple times
  And the Step Function should meet performance SLAs
  And the Step Function should have no data loss or corruption
```

## Configuration and Customization

### Custom SLA Definitions

You can customize performance SLAs in your step definitions:

```typescript
const slas = {
  maxTotalExecutionTime: 60000, // 1 minute
  maxStateExecutionTime: 10000, // 10 seconds per state
  maxColdStartTime: 5000, // 5 seconds cold start
};
```

### Custom Error Patterns

The framework can be extended to detect custom error patterns by modifying the `checkLambdaLogErrors` method.

### Custom State Output Validation

You can implement custom validation logic for specific state outputs by extending the `verifyStepFunctionStateOutput` method.

## Best Practices

### 1. Time Window Considerations
- Use appropriate time windows for log analysis (typically 1-5 minutes after execution)
- Consider timezone differences and AWS service latency

### 2. Pattern Matching
- Use specific, unique patterns for log verification
- Avoid overly generic patterns that might match unintended log entries

### 3. Performance Testing
- Use realistic SLA thresholds based on your application requirements
- Consider cold start scenarios in performance testing

### 4. Error Handling
- Test both success and error scenarios
- Verify that error handling states produce expected outputs

### 5. Data Integrity
- Verify data flow through complex Step Function workflows
- Check for data loss or corruption in multi-state processes

## Integration with Existing Framework

These advanced verification capabilities integrate seamlessly with the existing framework:

- Use correlation IDs to track workflows across multiple services
- Leverage existing workflow tracing for comprehensive analysis
- Combine with basic verification steps for complete coverage

## Troubleshooting

### Common Issues

1. **Logs Not Found**: Ensure the time window includes the execution time
2. **Pattern Not Matched**: Check for exact pattern matching and case sensitivity
3. **State Output Mismatch**: Verify JSON format and field names in expected output
4. **SLA Violations**: Review actual execution times and adjust thresholds if needed

### Debug Information

The framework provides detailed debug output for all verification steps:

```
Debug: Lambda Metrics - Executions: 1, Avg Duration: 150ms, Cold Starts: 0, Errors: 0
Debug: Step Function Data Flow - States: 3, Data Loss: false, Data Corruption: false
Debug: Step Function SLAs - Total Time: 2500ms, State Time: 800ms, Cold Start: 0ms
```

This advanced verification framework provides enterprise-grade monitoring and validation capabilities for AWS serverless workflows, ensuring comprehensive coverage of functionality, performance, and data integrity. 