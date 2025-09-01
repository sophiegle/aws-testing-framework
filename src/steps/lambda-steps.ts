import { Given, Then, When } from '@cucumber/cucumber';
import type { StepContext } from '../framework/types';
import { AWSTestingFramework } from '../index';

const framework = new AWSTestingFramework();
const lambdaService = framework.lambdaService;

// Basic Lambda operations
Given(
  'I have a Lambda function named {string}',
  async function (this: StepContext, functionName: string) {
    this.functionName = functionName;
    await lambdaService.findFunction(functionName);
  }
);

When(
  'I invoke the Lambda function with payload {string}',
  async function (this: StepContext, payload: string) {
    if (!this.functionName) {
      throw new Error(
        'Function name is not set. Make sure to create a Lambda function first.'
      );
    }
    await lambdaService.invokeFunction(this.functionName, JSON.parse(payload));
  }
);

When(
  'I invoke the Lambda function with payload {string} and timeout {int} seconds',
  async function (this: StepContext, payload: string, timeoutSeconds: number) {
    if (!this.functionName) {
      throw new Error(
        'Function name is not set. Make sure to create a Lambda function first.'
      );
    }
    const timeoutMs = timeoutSeconds * 1000;
    await lambdaService.invokeFunction(this.functionName, JSON.parse(payload), {
      timeout: timeoutMs,
    });
  }
);

When(
  'I invoke the Lambda function with payload {string} and timeout {int} minutes',
  async function (this: StepContext, payload: string, timeoutMinutes: number) {
    if (!this.functionName) {
      throw new Error(
        'Function name is not set. Make sure to create a Lambda function first.'
      );
    }
    const timeoutMs = timeoutMinutes * 60 * 1000;
    await lambdaService.invokeFunction(this.functionName, JSON.parse(payload), {
      timeout: timeoutMs,
    });
  }
);

Then(
  'the Lambda function should return {string}',
  async function (this: StepContext, expectedResult: string) {
    if (!this.functionName) {
      throw new Error(
        'Function name is not set. Make sure to create a Lambda function first.'
      );
    }
    await framework.waitForCondition(async () => {
      if (!this.functionName) return false;
      const result = await lambdaService.invokeFunction(this.functionName, {});
      return result?.Payload === expectedResult;
    });
  }
);

Then(
  'the Lambda function should be invoked',
  async function (this: StepContext) {
    if (!this.functionName) {
      throw new Error(
        'Function name is not set. Make sure to create a Lambda function first.'
      );
    }

    await framework.waitForCondition(async () => {
      if (!this.functionName) return false;
      const lambdaTriggered = await lambdaService.checkLambdaExecution(
        this.functionName
      );
      return lambdaTriggered;
    });
  }
);

Then(
  'the Lambda function should be invoked {int} times within {int} minutes',
  async function (this: StepContext, expectedCount: number, minutes: number) {
    if (!this.functionName) {
      throw new Error(
        'Function name is not set. Make sure to create a Lambda function first.'
      );
    }

    await framework.waitForCondition(async () => {
      if (!this.functionName) return false;
      const actualCount = await framework.countLambdaExecutionsInLastMinutes(
        this.functionName,
        minutes
      );
      return actualCount >= expectedCount;
    }, 60000); // Wait up to 1 minute for the condition to be met
  }
);

// Additional step for triggering multiple concurrent operations
When(
  'I trigger multiple concurrent operations',
  async function (this: StepContext) {
    if (!this.bucketName) {
      throw new Error(
        'Bucket name is not set. Make sure to create an S3 bucket first.'
      );
    }

    // Upload multiple files concurrently to trigger Lambda executions
    const files = [
      { name: 'concurrent1.txt', content: 'test data 1' },
      { name: 'concurrent2.txt', content: 'test data 2' },
      { name: 'concurrent3.txt', content: 'test data 3' },
      { name: 'concurrent4.txt', content: 'test data 4' },
      { name: 'concurrent5.txt', content: 'test data 5' },
    ];

    for (const file of files) {
      await framework.s3Service.uploadFile(
        this.bucketName,
        file.name,
        file.content
      );
      // Small delay between uploads
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
);

Then(
  'the Lambda function logs should not contain errors',
  async function (this: StepContext) {
    if (!this.functionName) {
      throw new Error(
        'Function name is not set. Make sure to create a Lambda function first.'
      );
    }

    const startTime = new Date(Date.now() - 60000);
    const endTime = new Date();

    const logs = await framework.getLambdaLogs(
      this.functionName,
      startTime,
      endTime
    );

    const errorIndicators = ['ERROR', 'Exception', 'Error:', 'FAILED'];
    const hasErrors = logs.some((log) =>
      errorIndicators.some((indicator) => log.includes(indicator))
    );

    if (hasErrors) {
      throw new Error('Lambda logs contain error indicators');
    }

    console.log('Lambda logs checked and no errors found');
  }
);
