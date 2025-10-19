import { Given, Then, When } from '@cucumber/cucumber';
import { BaseStepDefinition } from '../container/BaseStepDefinition';
import type { StepContext } from '../types';

/**
 * Lambda step definitions with proper dependency injection
 */
export class LambdaSteps extends BaseStepDefinition {
  /**
   * Register all Lambda step definitions
   */
  registerSteps(): void {
    const container = this.container;

    // Basic Lambda operations
    Given(
      'I have a Lambda function named {string}',
      async function (this: StepContext, functionName: string) {
        this.functionName = functionName;
        await container.lambdaService.findFunction(functionName);
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

        // Validate JSON payload
        let parsedPayload: Record<string, unknown>;
        try {
          parsedPayload = JSON.parse(payload);
        } catch (error) {
          throw new Error(
            `Invalid JSON payload: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        await container.lambdaService.invokeFunction(
          this.functionName,
          parsedPayload
        );
      }
    );

    When(
      'I invoke the Lambda function with payload {string} and timeout {int} seconds',
      async function (
        this: StepContext,
        payload: string,
        timeoutSeconds: number
      ) {
        if (!this.functionName) {
          throw new Error(
            'Function name is not set. Make sure to create a Lambda function first.'
          );
        }

        // Validate timeout
        if (timeoutSeconds <= 0 || timeoutSeconds > 900) {
          throw new Error('Timeout must be between 1 and 900 seconds');
        }

        // Validate JSON payload
        let parsedPayload: Record<string, unknown>;
        try {
          parsedPayload = JSON.parse(payload);
        } catch (error) {
          throw new Error(
            `Invalid JSON payload: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        const timeoutMs = timeoutSeconds * 1000;
        await container.lambdaService.invokeFunction(
          this.functionName,
          parsedPayload,
          { timeout: timeoutMs }
        );
      }
    );

    When(
      'I invoke the Lambda function with payload {string} and timeout {int} minutes',
      async function (
        this: StepContext,
        payload: string,
        timeoutMinutes: number
      ) {
        if (!this.functionName) {
          throw new Error(
            'Function name is not set. Make sure to create a Lambda function first.'
          );
        }

        // Validate timeout
        if (timeoutMinutes <= 0 || timeoutMinutes > 15) {
          throw new Error('Timeout must be between 1 and 15 minutes');
        }

        // Validate JSON payload
        let parsedPayload: Record<string, unknown>;
        try {
          parsedPayload = JSON.parse(payload);
        } catch (error) {
          throw new Error(
            `Invalid JSON payload: ${error instanceof Error ? error.message : String(error)}`
          );
        }

        const timeoutMs = timeoutMinutes * 60 * 1000;
        await container.lambdaService.invokeFunction(
          this.functionName,
          parsedPayload,
          { timeout: timeoutMs }
        );
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

        await container.healthValidator.waitForCondition(async () => {
          if (!this.functionName) return false;
          const result = await container.lambdaService.invokeFunction(
            this.functionName,
            {}
          );
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

        await container.healthValidator.waitForCondition(async () => {
          if (!this.functionName) return false;
          const lambdaTriggered =
            await container.lambdaService.checkLambdaExecution(
              this.functionName
            );
          return lambdaTriggered;
        });
      }
    );

    Then(
      'the Lambda function should be invoked {int} times within {int} minutes',
      async function (
        this: StepContext,
        expectedCount: number,
        minutes: number
      ) {
        if (!this.functionName) {
          throw new Error(
            'Function name is not set. Make sure to create a Lambda function first.'
          );
        }

        // Validate parameters
        if (expectedCount <= 0) {
          throw new Error('Expected count must be greater than 0');
        }
        if (minutes <= 0 || minutes > 60) {
          throw new Error('Minutes must be between 1 and 60');
        }

        await container.healthValidator.waitForCondition(async () => {
          if (!this.functionName) return false;
          const actualCount =
            await container.lambdaService.countLambdaExecutionsInLastMinutes(
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

        // Upload files in parallel for better performance
        await Promise.all(
          files.map(async (file) => {
            await container.s3Service.uploadFile(
              this.bucketName as string,
              file.name,
              file.content
            );
            // Small delay between uploads to avoid overwhelming the system
            await new Promise((resolve) => setTimeout(resolve, 100));
          })
        );
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

        const logs = await container.lambdaService.getLambdaLogs(
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

        // Use proper logging instead of console.log
        if (container.getConfig().enableLogging) {
          console.log('Lambda logs checked and no errors found');
        }
      }
    );
  }
}
