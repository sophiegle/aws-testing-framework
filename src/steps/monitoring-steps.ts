import { Then } from '@cucumber/cucumber';
import type { StepContext } from '../framework/types';
import { AWSTestingFramework } from '../index';

const framework = new AWSTestingFramework();

// Basic monitoring steps that don't rely on workflow traces

Then(
  'the Lambda function {string} should be accessible',
  async function (this: StepContext, functionName: string) {
    try {
      await framework.findFunction(functionName);
    } catch (error) {
      throw new Error(
        `Lambda function ${functionName} is not accessible: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

Then(
  'the Step Function {string} should be accessible',
  async function (this: StepContext, stateMachineName: string) {
    try {
      const stateMachineArn =
        await framework.findStateMachine(stateMachineName);
      if (!stateMachineArn) {
        throw new Error(`State machine ${stateMachineName} not found`);
      }
    } catch (error) {
      throw new Error(
        `Step Function ${stateMachineName} is not accessible: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

Then(
  'the S3 bucket {string} should be accessible',
  async function (this: StepContext, bucketName: string) {
    try {
      await framework.findBucket(bucketName);
    } catch (error) {
      throw new Error(
        `S3 bucket ${bucketName} is not accessible: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

Then(
  'the SQS queue {string} should be accessible',
  async function (this: StepContext, queueName: string) {
    try {
      const queueUrl = await framework.findQueue(queueName);
      if (!queueUrl) {
        throw new Error(`Queue ${queueName} not found`);
      }
    } catch (error) {
      throw new Error(
        `SQS queue ${queueName} is not accessible: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
);

Then('the AWS setup should be valid', async function (this: StepContext) {
  const healthStatus = await framework.getHealthStatus();
  if (!healthStatus.isHealthy) {
    const errors = healthStatus.awsSetup.errors.join(', ');
    throw new Error(`AWS setup is not valid: ${errors}`);
  }
});

Then(
  'the framework should have good performance metrics',
  async function (this: StepContext) {
    const metrics = framework.getTestMetrics();
    if (metrics.errorRate > 10) {
      throw new Error(
        `Error rate is too high: ${metrics.errorRate.toFixed(2)}%`
      );
    }
    if (metrics.averageExecutionTime > 10000) {
      throw new Error(
        `Average execution time is too slow: ${metrics.averageExecutionTime.toFixed(2)}ms`
      );
    }
  }
);
