import { Then } from '@cucumber/cucumber';
import { BaseStepDefinition } from '../container/StepDefinitionFactory';
import type { StepContext } from '../types';

/**
 * Monitoring step definitions with proper dependency injection
 */
export class MonitoringSteps extends BaseStepDefinition {
  /**
   * Register all monitoring step definitions
   */
  registerSteps(): void {
    const container = this.container;

    // Basic monitoring steps that don't rely on workflow traces
    Then(
      'the Lambda function {string} should be accessible',
      async function (this: StepContext, functionName: string) {
        await container.lambdaService.findFunction(functionName);
      }
    );

    Then(
      'the Step Function {string} should be accessible',
      async function (this: StepContext, stateMachineName: string) {
        await container.stepFunctionService.findStateMachine(stateMachineName);
      }
    );

    Then(
      'the S3 bucket {string} should be accessible',
      async function (this: StepContext, bucketName: string) {
        await container.s3Service.findBucket(bucketName);
      }
    );

    Then(
      'the SQS queue {string} should be accessible',
      async function (this: StepContext, queueName: string) {
        const queueUrl = await container.sqsService.findQueue(queueName);
        if (!queueUrl) {
          throw new Error(`SQS queue ${queueName} not found`);
        }
      }
    );

    Then(
      'the framework should have good performance metrics',
      async function (this: StepContext) {
        // @ts-expect-error - TODO: Implement getMetrics in PerformanceMonitor
        const metrics = container.performanceMonitor.getMetrics();

        // Define acceptable performance thresholds
        const maxErrorRate = 0.1; // 10% error rate
        const maxAverageResponseTime = 5000; // 5 seconds

        if (metrics.errorRate > maxErrorRate) {
          throw new Error(
            `Framework error rate is ${(metrics.errorRate * 100).toFixed(2)}%, ` +
              `exceeding the acceptable threshold of ${(maxErrorRate * 100).toFixed(2)}%`
          );
        }

        if (metrics.averageResponseTime > maxAverageResponseTime) {
          throw new Error(
            `Framework average response time is ${metrics.averageResponseTime}ms, ` +
              `exceeding the acceptable threshold of ${maxAverageResponseTime}ms`
          );
        }
      }
    );
  }
}
