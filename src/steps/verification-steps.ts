import { Given, Then, When } from '@cucumber/cucumber';
import { AWSTestingFramework, type StepContext } from '../framework/AWSTestingFramework';

const framework = new AWSTestingFramework();

// CloudWatch Logs verification steps

Then(
  'the Lambda function logs should contain {string}',
  async function (this: StepContext, expectedPattern: string) {
    if (!this.functionName) {
      throw new Error('Function name is not set. Make sure to create a Lambda function first.');
    }
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const trace = framework.getWorkflowTrace(this.correlationId);
    if (!trace?.lambdaExecution) {
      throw new Error('Lambda execution not found in workflow trace');
    }
    
    const startTime = trace.lambdaExecution.timestamp;
    const endTime = new Date(startTime.getTime() + 60000); // Check 1 minute after execution
    
    const result = await framework.verifyLambdaLogsContain(
      this.functionName,
      startTime,
      endTime,
      [expectedPattern]
    );
    
    if (!result.found) {
      throw new Error(`Lambda logs do not contain pattern: ${expectedPattern}. Missing patterns: ${result.missingPatterns.join(', ')}`);
    }
  }
);

Then(
  'the Lambda function logs should not contain errors',
  async function (this: StepContext) {
    if (!this.functionName) {
      throw new Error('Function name is not set. Make sure to create a Lambda function first.');
    }
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const trace = framework.getWorkflowTrace(this.correlationId);
    if (!trace?.lambdaExecution) {
      throw new Error('Lambda execution not found in workflow trace');
    }
    
    const startTime = trace.lambdaExecution.timestamp;
    const endTime = new Date(startTime.getTime() + 60000); // Check 1 minute after execution
    
    const result = await framework.checkLambdaLogErrors(
      this.functionName,
      startTime,
      endTime
    );
    
    if (result.hasErrors) {
      const errorMessages = result.errorLogs.map(log => `${log.timestamp}: ${log.message}`).join('\n');
      throw new Error(`Lambda function has ${result.errorCount} errors in logs:\n${errorMessages}`);
    }
  }
);

Then(
  'the Lambda function should have acceptable execution metrics',
  async function (this: StepContext) {
    if (!this.functionName) {
      throw new Error('Function name is not set. Make sure to create a Lambda function first.');
    }
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const trace = framework.getWorkflowTrace(this.correlationId);
    if (!trace?.lambdaExecution) {
      throw new Error('Lambda execution not found in workflow trace');
    }
    
    const startTime = trace.lambdaExecution.timestamp;
    const endTime = new Date(startTime.getTime() + 60000); // Check 1 minute after execution
    
    const metrics = await framework.getLambdaExecutionMetrics(
      this.functionName,
      startTime,
      endTime
    );
    
    console.log(`Debug: Lambda Metrics - Executions: ${metrics.executionCount}, Avg Duration: ${metrics.averageDuration}ms, Cold Starts: ${metrics.coldStarts}, Errors: ${metrics.errors}`);
    
    // Basic metric checks
    if (metrics.errors > 0) {
      throw new Error(`Lambda function has ${metrics.errors} errors in execution metrics`);
    }
    
    if (metrics.averageDuration > 5000) { // 5 seconds
      throw new Error(`Lambda function average duration ${metrics.averageDuration}ms is too slow`);
    }
  }
);

// Step Function state output verification steps

Then(
  'the Step Function state {string} should have output containing {string}',
  async function (this: StepContext, stateName: string, expectedOutput: string) {
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const trace = framework.getWorkflowTrace(this.correlationId);
    if (!trace?.stepFunctionExecution) {
      throw new Error('Step Function execution not found in workflow trace');
    }
    
    const expectedData = JSON.parse(expectedOutput);
    const result = await framework.verifyStepFunctionStateOutput(
      trace.stepFunctionExecution.executionArn,
      stateName,
      expectedData
    );
    
    if (!result.matches) {
      throw new Error(`Step Function state ${stateName} output does not match expected data. Missing fields: ${result.missingFields.join(', ')}. Actual output: ${JSON.stringify(result.actualOutput)}`);
    }
  }
);

Then(
  'the Step Function should have no data loss or corruption',
  async function (this: StepContext) {
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const trace = framework.getWorkflowTrace(this.correlationId);
    if (!trace?.stepFunctionExecution) {
      throw new Error('Step Function execution not found in workflow trace');
    }
    
    const dataFlow = await framework.getStepFunctionDataFlow(
      trace.stepFunctionExecution.executionArn
    );
    
    if (dataFlow.dataLoss) {
      throw new Error('Step Function execution has data loss between states');
    }
    
    if (dataFlow.dataCorruption) {
      throw new Error('Step Function execution has data corruption between states');
    }
    
    console.log(`Debug: Step Function Data Flow - States: ${dataFlow.dataFlow.length}, Data Loss: ${dataFlow.dataLoss}, Data Corruption: ${dataFlow.dataCorruption}`);
  }
);

Then(
  'the Step Function should meet performance SLAs',
  async function (this: StepContext) {
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const trace = framework.getWorkflowTrace(this.correlationId);
    if (!trace?.stepFunctionExecution) {
      throw new Error('Step Function execution not found in workflow trace');
    }
    
    const slas = {
      maxTotalExecutionTime: 60000, // 1 minute
      maxStateExecutionTime: 10000, // 10 seconds per state
      maxColdStartTime: 5000, // 5 seconds cold start
    };
    
    const result = await framework.verifyStepFunctionSLAs(
      trace.stepFunctionExecution.executionArn,
      slas
    );
    
    if (!result.meetsSLAs) {
      throw new Error(`Step Function execution does not meet SLAs: ${result.violations.join(', ')}`);
    }
    
    console.log(`Debug: Step Function SLAs - Total Time: ${result.metrics.totalExecutionTime}ms, State Time: ${result.metrics.maxStateExecutionTime}ms, Cold Start: ${result.metrics.coldStartTime}ms`);
  }
); 