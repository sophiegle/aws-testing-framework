import { Given, Then, When } from '@cucumber/cucumber';
import { AWSTestingFramework, type StepContext } from '../framework/AWSTestingFramework';

const framework = new AWSTestingFramework();

Given('I have an S3 bucket named {string}', async function (this: StepContext, bucketName: string) {
  this.bucketName = bucketName;
  await framework.findBucket(bucketName);
});

When(
  'I upload a file {string} to the S3 bucket',
  async function (this: StepContext, fileName: string) {
    if (!this.bucketName) {
      throw new Error('Bucket name is not set. Make sure to create a bucket first.');
    }
    await framework.uploadFile(this.bucketName, fileName, 'Test content');
  }
);

Then(
  'the S3 bucket should contain the file {string}',
  async function (this: StepContext, fileName: string) {
    if (!this.bucketName) {
      throw new Error('Bucket name is not set. Make sure to create a bucket first.');
    }
    await framework.waitForCondition(async () => {
      if (!this.bucketName) return false;
      const exists = await framework.checkFileExists(this.bucketName, fileName);
      return exists;
    });
  }
);

Given('I have an SQS queue named {string}', async function (this: StepContext, queueName: string) {
  this.queueName = queueName;
  this.queueUrl = await framework.findQueue(queueName);
});

When(
  'I send a message {string} to the SQS queue',
  async function (this: StepContext, message: string) {
    if (!this.queueUrl) {
      throw new Error('Queue URL is not set. Make sure to create a queue first.');
    }
    await framework.sendMessage(this.queueUrl, message);
  }
);

Then('the SQS queue should receive a notification', async function (this: StepContext) {
  if (!this.queueUrl) {
    throw new Error('Queue URL is not set. Make sure to create a queue first.');
  }
  await framework.waitForCondition(async () => {
    if (!this.queueUrl) return false;
    const unreadCount = await framework.getUnreadMessageCount(this.queueUrl);
    return unreadCount > 0;
  }, 30000);
});

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

Given(
  'I have a Step Function named {string}',
  async function (this: StepContext, stateMachineName: string) {
    this.stateMachineName = stateMachineName;
    this.stateMachineArn = await framework.findStateMachine(stateMachineName);
  }
);

When('I start an execution with input {string}', async function (this: StepContext, input: string) {
  if (!this.stateMachineArn) {
    throw new Error('State machine ARN is not set. Make sure to create a Step Function first.');
  }
  this.executionArn = await framework.startExecution(this.stateMachineArn, JSON.parse(input));
});

Then('the Step Function should be triggered', async function (this: StepContext) {
  if (!this.stateMachineName) {
    throw new Error('State machine name is not set. Make sure to create a Step Function first.');
  }
  await framework.waitForCondition(async () => {
    if (!this.stateMachineName) return false;
    const stateMachineTriggered = await framework.checkStateMachineExecution(this.stateMachineName);
    if (stateMachineTriggered && !this.executionArn) {
      // If the state machine was triggered by an S3 event, we need to get the execution ARN
      const executions = await framework.listExecutions(this.stateMachineName);
      if (executions.length > 0) {
        this.executionArn = executions[0].executionArn;
      }
    }
    return stateMachineTriggered;
  });
});

Then('the execution should complete successfully', async function (this: StepContext) {
  if (!this.executionArn) {
    throw new Error('Execution ARN is not set. Make sure to start an execution first.');
  }
  await framework.waitForCondition(async () => {
    if (!this.executionArn) return false;
    const status = await framework.getExecutionStatus(this.executionArn);
    return status === 'SUCCEEDED';
  });
});

// New steps for verifying specific state machine execution
Given(
  'I expect the Lambda function to trigger the Step Function named {string}',
  async function (this: StepContext, expectedStateMachineName: string) {
    this.expectedStateMachineName = expectedStateMachineName;
  }
);

Then(
  'the Lambda function should trigger the expected Step Function',
  async function (this: StepContext) {
    if (!this.functionName) {
      throw new Error('Function name is not set. Make sure to create a Lambda function first.');
    }
    if (!this.expectedStateMachineName) {
      throw new Error('Expected state machine name is not set. Use the step "I expect the Lambda function to trigger the Step Function named {string}" first.');
    }
    
    const triggered = await framework.verifyLambdaTriggeredStateMachine(
      this.functionName,
      this.expectedStateMachineName
    );
    
    if (!triggered) {
      throw new Error(
        `Lambda function ${this.functionName} did not trigger the expected state machine ${this.expectedStateMachineName}`
      );
    }
  }
);

Then(
  'the Step Function {string} should have recent executions',
  async function (this: StepContext, stateMachineName: string) {
    const executions = await framework.getExecutionDetails(stateMachineName);
    const recentExecutions = executions.filter(execution => {
      const executionTime = new Date(execution.startDate).getTime();
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return executionTime > fiveMinutesAgo;
    });
    
    if (recentExecutions.length === 0) {
      throw new Error(`No recent executions found for state machine ${stateMachineName}`);
    }
  }
);
