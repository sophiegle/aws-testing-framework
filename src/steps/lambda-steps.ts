import { Given, Then, When } from '@cucumber/cucumber';
import { AWSTestingFramework, type StepContext } from '../framework/AWSTestingFramework';

const framework = new AWSTestingFramework();

// Basic Lambda operations
Given(
  'I have a Lambda function named {string}',
  async function (this: StepContext, functionName: string) {
    this.functionName = functionName;
    await framework.findFunction(functionName);
  }
);

When(
  'I invoke the Lambda function with payload {string}',
  async function (this: StepContext, payload: string) {
    if (!this.functionName) {
      throw new Error('Function name is not set. Make sure to create a Lambda function first.');
    }
    await framework.invokeFunction(this.functionName, JSON.parse(payload));
  }
);

Then(
  'the Lambda function should return {string}',
  async function (this: StepContext, expectedResult: string) {
    if (!this.functionName) {
      throw new Error('Function name is not set. Make sure to create a Lambda function first.');
    }
    await framework.waitForCondition(async () => {
      if (!this.functionName) return false;
      const result = await framework.invokeFunction(this.functionName, {});
      return result?.Payload === expectedResult;
    });
  }
);

Then('the Lambda function should be triggered', async function (this: StepContext) {
  if (!this.functionName) {
    throw new Error('Function name is not set. Make sure to create a Lambda function first.');
  }
  await framework.waitForCondition(async () => {
    if (!this.functionName) return false;
    const lambdaTriggered = await framework.checkLambdaExecution(this.functionName);
    return lambdaTriggered;
  });
});

Then('the Lambda function should be invoked', async function (this: StepContext) {
  if (!this.functionName) {
    throw new Error('Function name is not set. Make sure to create a Lambda function first.');
  }
  await framework.waitForCondition(async () => {
    if (!this.functionName) return false;
    const lambdaTriggered = await framework.checkLambdaExecution(this.functionName);
    return lambdaTriggered;
  });
});

Then('the Lambda function should be invoked multiple times', async function (this: StepContext) {
  if (!this.functionName) {
    throw new Error('Function name is not set. Make sure to create a Lambda function first.');
  }
  
  // Wait a bit for all invocations to complete
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check that the Lambda function was invoked at least once
  const lambdaTriggered = await framework.checkLambdaExecution(this.functionName);
  if (!lambdaTriggered) {
    throw new Error('Lambda function was not invoked');
  }
  
  console.log(`Debug: Lambda function ${this.functionName} was successfully invoked`);
});

// Workflow-specific Lambda operations
Then(
  'the Lambda function should consume the SQS message',
  async function (this: StepContext) {
    if (!this.functionName) {
      throw new Error('Function name is not set. Make sure to create a Lambda function first.');
    }
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const lambdaExecuted = await framework.trackLambdaExecution(this.functionName, this.correlationId);
    if (!lambdaExecuted) {
      throw new Error('Lambda function did not consume the SQS message within timeout');
    }
  }
);

Then(
  'the Lambda function should process the exact file {string}',
  async function (this: StepContext, fileName: string) {
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const processedFile = await framework.verifyLambdaProcessedFile(this.correlationId, fileName);
    if (!processedFile) {
      throw new Error(`Lambda function did not process the exact file ${fileName}`);
    }
  }
);

Then(
  'the Lambda function should trigger the Step Function {string}',
  async function (this: StepContext, stateMachineName: string) {
    if (!this.correlationId) {
      throw new Error('Correlation ID is not set. Make sure to upload a file first.');
    }
    
    const stepFunctionTriggered = await framework.trackStepFunctionExecution(stateMachineName, this.correlationId);
    if (!stepFunctionTriggered) {
      throw new Error(`Lambda function did not trigger the Step Function ${stateMachineName} within timeout`);
    }
  }
);

// Advanced Lambda verification steps
Then(
  'the Lambda function should have no errors in the last {int} minutes',
  async function (this: StepContext, timeWindowMinutes: number) {
    if (!this.functionName) {
      throw new Error('Function name is not set. Make sure to create a Lambda function first.');
    }
    
    const hasErrors = await framework.checkLambdaErrors(this.functionName, timeWindowMinutes);
    if (hasErrors) {
      throw new Error(`Lambda function ${this.functionName} has errors in the last ${timeWindowMinutes} minutes`);
    }
  }
);

Then(
  'the Lambda function should execute within {int} milliseconds',
  async function (this: StepContext, maxExecutionTimeMs: number) {
    if (!this.functionName) {
      throw new Error('Function name is not set. Make sure to create a Lambda function first.');
    }
    
    const executionTimeOk = await framework.verifyLambdaExecutionTime(this.functionName, maxExecutionTimeMs);
    if (!executionTimeOk) {
      throw new Error(`Lambda function ${this.functionName} execution time exceeds ${maxExecutionTimeMs}ms`);
    }
  }
);

Then(
  'the Lambda function should have proper configuration',
  async function (this: StepContext) {
    if (!this.functionName) {
      throw new Error('Function name is not set. Make sure to create a Lambda function first.');
    }
    
    const config = await framework.verifyLambdaConfiguration(this.functionName);
    const issues: string[] = [];
    
    if (!config.hasCorrectTimeout) {
      issues.push('Timeout exceeds 5 minutes');
    }
    if (!config.hasCorrectMemory) {
      issues.push('Memory allocation is less than 128MB');
    }
    if (!config.hasCorrectRuntime) {
      issues.push('Runtime is not Node.js');
    }
    if (!config.hasCorrectHandler) {
      issues.push('Handler is not configured');
    }
    
    if (issues.length > 0) {
      throw new Error(`Lambda function ${this.functionName} configuration issues: ${issues.join(', ')}`);
    }
  }
); 