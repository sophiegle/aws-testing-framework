import { Given, Then, When } from '@cucumber/cucumber';
import type { StepContext } from '../framework/types';
import { AWSTestingFramework } from '../index';

const framework = new AWSTestingFramework();

// Basic SQS operations
Given(
  'I have an SQS queue named {string}',
  async function (this: StepContext, queueName: string) {
    this.queueName = queueName;
    this.queueUrl = await framework.findQueue(queueName);
  }
);

When(
  'I send a message {string} to the SQS queue',
  async function (this: StepContext, message: string) {
    if (!this.queueUrl) {
      throw new Error(
        'Queue URL is not set. Make sure to create a queue first.'
      );
    }
    await framework.sendMessage(this.queueUrl, message);
  }
);

Then(
  'the SQS queue should receive a notification',
  async function (this: StepContext) {
    if (!this.queueUrl) {
      throw new Error(
        'Queue URL is not set. Make sure to create a queue first.'
      );
    }
    await framework.waitForCondition(async () => {
      if (!this.queueUrl) return false;
      const unreadCount = await framework.getUnreadMessageCount(this.queueUrl);
      return unreadCount > 0;
    }, 30000);
  }
);
