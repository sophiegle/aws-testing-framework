import {
  type CloudWatchLogsClient,
  FilterLogEventsCommand,
} from '@aws-sdk/client-cloudwatch-logs';
import {
  type LambdaClient,
  ListFunctionsCommand,
} from '@aws-sdk/client-lambda';
import { ListBucketsCommand, type S3Client } from '@aws-sdk/client-s3';
import { ListStateMachinesCommand, type SFNClient } from '@aws-sdk/client-sfn';
import { ListQueuesCommand, type SQSClient } from '@aws-sdk/client-sqs';
import type {
  AWSSetupValidation,
  HealthStatus,
  StepContext,
  TestMetrics,
} from '../types';

export class HealthValidator {
  private s3Client: S3Client;
  private sqsClient: SQSClient;
  private lambdaClient: LambdaClient;
  private sfnClient: SFNClient;
  private cloudWatchLogsClient: CloudWatchLogsClient;

  constructor(
    s3Client: S3Client,
    sqsClient: SQSClient,
    lambdaClient: LambdaClient,
    sfnClient: SFNClient,
    cloudWatchLogsClient: CloudWatchLogsClient
  ) {
    this.s3Client = s3Client;
    this.sqsClient = sqsClient;
    this.lambdaClient = lambdaClient;
    this.sfnClient = sfnClient;
    this.cloudWatchLogsClient = cloudWatchLogsClient;
  }

  /**
   * Validate AWS credentials and permissions
   */
  async validateAWSSetup(): Promise<AWSSetupValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const services = {
      s3: false,
      sqs: false,
      lambda: false,
      stepFunctions: false,
      cloudWatch: false,
    };

    try {
      // Test S3 access
      try {
        await this.s3Client.send(new ListBucketsCommand({}));
        services.s3 = true;
      } catch (error) {
        errors.push(
          `S3 access failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Test SQS access
      try {
        await this.sqsClient.send(new ListQueuesCommand({}));
        services.sqs = true;
      } catch (error) {
        errors.push(
          `SQS access failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Test Lambda access
      try {
        await this.lambdaClient.send(new ListFunctionsCommand({}));
        services.lambda = true;
      } catch (error) {
        errors.push(
          `Lambda access failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Test Step Functions access
      try {
        await this.sfnClient.send(new ListStateMachinesCommand({}));
        services.stepFunctions = true;
      } catch (error) {
        errors.push(
          `Step Functions access failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      // Test CloudWatch access
      try {
        await this.cloudWatchLogsClient.send(
          new FilterLogEventsCommand({
            logGroupName: '/aws/lambda/test',
            startTime: Date.now() - 60000,
            endTime: Date.now(),
          })
        );
        services.cloudWatch = true;
      } catch (error) {
        warnings.push(
          `CloudWatch access failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    } catch (error) {
      errors.push(
        `AWS setup validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      services,
    };
  }

  /**
   * Get framework health status
   */
  async getHealthStatus(
    metrics: TestMetrics,
    context: StepContext,
    activeExecutions: number
  ): Promise<HealthStatus> {
    const awsSetup = await this.validateAWSSetup();

    return {
      isHealthy: awsSetup.isValid && metrics.errorRate < 50,
      awsSetup,
      performance: {
        totalOperations: metrics.totalTests,
        errorRate: metrics.errorRate,
        averageResponseTime: metrics.averageExecutionTime,
      },
      resources: {
        activeExecutions,
        contextEntries: Object.keys(context).length,
      },
    };
  }

  /**
   * Wait for a condition to be true with timeout
   */
  async waitForCondition(
    condition: () => Promise<boolean>,
    timeout = 30000,
    interval = 1000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const result = await condition();
        if (result) {
          return;
        }
      } catch (_error) {}

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(`Condition not met within ${timeout}ms timeout`);
  }
}
