import { Given, Then, When } from '@cucumber/cucumber';
import { BaseStepDefinition } from '../container/StepDefinitionFactory';
import type { StepContext } from '../types';

/**
 * SQS step definitions with proper dependency injection
 */
export class SQSSteps extends BaseStepDefinition {
  /**
   * Register all SQS step definitions
   */
  registerSteps(): void {
    const container = this.container;

    // Basic SQS operations
    Given(
      'I have an SQS queue named {string}',
      async function (this: StepContext, queueName: string) {
        this.queueName = queueName;
        const queueUrl = await container.sqsService.findQueue(queueName);
        if (!queueUrl) {
          throw new Error(`SQS queue ${queueName} not found`);
        }
        this.queueUrl = queueUrl;
      }
    );

    When(
      'I send a message {string} to the SQS queue',
      async function (this: StepContext, message: string) {
        if (!this.queueUrl) {
          throw new Error(
            'Queue URL is not set. Make sure to create an SQS queue first.'
          );
        }
        await container.sqsService.sendMessage(this.queueUrl, message);
      }
    );

    Then(
      'the SQS queue should receive a notification',
      async function (this: StepContext) {
        if (!this.queueUrl) {
          throw new Error(
            'Queue URL is not set. Make sure to create an SQS queue first.'
          );
        }

        // Wait for message to be received with retry logic
        const maxRetries = 5;
        const retryDelay = 1000;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const message = await container.sqsService.receiveMessage(
            this.queueUrl
          );

          if (message) {
            return; // Message received, test passes
          }

          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }

        throw new Error(`No message received in SQS queue ${this.queueName}`);
      }
    );
  }
}
