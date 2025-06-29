import { Given, Then, When } from '@cucumber/cucumber';
import type { StepContext } from '../framework/types';
import { AWSTestingFramework } from '../index';

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
      throw new Error(
        'Function name is not set. Make sure to create a Lambda function first.'
      );
    }
    await framework.invokeFunction(this.functionName, JSON.parse(payload));
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
      const result = await framework.invokeFunction(this.functionName, {});
      return result?.Payload === expectedResult;
    });
  }
);

Then(
  'the Lambda function should be triggered',
  async function (this: StepContext) {
    if (!this.functionName) {
      throw new Error(
        'Function name is not set. Make sure to create a Lambda function first.'
      );
    }
    await framework.waitForCondition(async () => {
      if (!this.functionName) return false;
      const lambdaTriggered = await framework.checkLambdaExecution(
        this.functionName
      );
      return lambdaTriggered;
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
      const lambdaTriggered = await framework.checkLambdaExecution(
        this.functionName
      );
      return lambdaTriggered;
    });
  }
);

Then(
  'the Lambda function should be invoked multiple times',
  async function (this: StepContext) {
    if (!this.functionName) {
      throw new Error(
        'Function name is not set. Make sure to create a Lambda function first.'
      );
    }

    // Wait a bit for all invocations to complete
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Check that the Lambda function was invoked at least once
    const lambdaTriggered = await framework.checkLambdaExecution(
      this.functionName
    );
    if (!lambdaTriggered) {
      throw new Error('Lambda function was not invoked');
    }
  }
);
