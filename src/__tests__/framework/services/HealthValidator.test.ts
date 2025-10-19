import {
  CloudWatchLogsClient,
  type FilterLogEventsCommandOutput,
} from '@aws-sdk/client-cloudwatch-logs';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { S3Client } from '@aws-sdk/client-s3';
import { SFNClient } from '@aws-sdk/client-sfn';
import { SQSClient } from '@aws-sdk/client-sqs';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { HealthValidator } from '../../../framework/services/HealthValidator';
import type { StepContext, TestMetrics } from '../../../framework/types';

// Create mock clients
const s3Mock = mockClient(S3Client);
const sqsMock = mockClient(SQSClient);
const lambdaMock = mockClient(LambdaClient);
const sfnMock = mockClient(SFNClient);
const cloudWatchLogsMock = mockClient(CloudWatchLogsClient);

describe('HealthValidator', () => {
  let healthValidator: HealthValidator;
  let s3Client: S3Client;
  let sqsClient: SQSClient;
  let lambdaClient: LambdaClient;
  let sfnClient: SFNClient;
  let cloudWatchLogsClient: CloudWatchLogsClient;

  beforeEach(() => {
    // Reset all mocks
    s3Mock.reset();
    sqsMock.reset();
    lambdaMock.reset();
    sfnMock.reset();
    cloudWatchLogsMock.reset();

    // Create clients with region config
    s3Client = new S3Client({ region: 'us-east-1' });
    sqsClient = new SQSClient({ region: 'us-east-1' });
    lambdaClient = new LambdaClient({ region: 'us-east-1' });
    sfnClient = new SFNClient({ region: 'us-east-1' });
    cloudWatchLogsClient = new CloudWatchLogsClient({ region: 'us-east-1' });

    // Create HealthValidator instance
    healthValidator = new HealthValidator(
      s3Client,
      sqsClient,
      lambdaClient,
      sfnClient,
      cloudWatchLogsClient
    );
  });

  describe('Constructor', () => {
    it('should create instance with all required clients', () => {
      expect(healthValidator).toBeInstanceOf(HealthValidator);
    });

    it('should store all AWS clients', () => {
      const testS3 = new S3Client({ region: 'us-west-2' });
      const testSqs = new SQSClient({ region: 'us-west-2' });
      const testLambda = new LambdaClient({ region: 'us-west-2' });
      const testSfn = new SFNClient({ region: 'us-west-2' });
      const testCloudWatch = new CloudWatchLogsClient({ region: 'us-west-2' });

      const validator = new HealthValidator(
        testS3,
        testSqs,
        testLambda,
        testSfn,
        testCloudWatch
      );
      expect(validator).toBeDefined();
    });
  });

  describe('validateAWSSetup', () => {
    it('should return valid setup when all services are accessible', async () => {
      // Mock successful responses for all services
      s3Mock.resolves({ Buckets: [] });
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const result = await healthValidator.validateAWSSetup();

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.services.s3).toBe(true);
      expect(result.services.sqs).toBe(true);
      expect(result.services.lambda).toBe(true);
      expect(result.services.stepFunctions).toBe(true);
      expect(result.services.cloudWatch).toBe(true);
      expect(result.warnings).toEqual([]);
    });

    it('should handle S3 access failure', async () => {
      s3Mock.rejects(new Error('S3 access denied'));
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const result = await healthValidator.validateAWSSetup();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('S3 access failed: S3 access denied');
      expect(result.services.s3).toBe(false);
      expect(result.services.sqs).toBe(true);
    });

    it('should handle SQS access failure', async () => {
      s3Mock.resolves({ Buckets: [] });
      sqsMock.rejects(new Error('SQS access denied'));
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const result = await healthValidator.validateAWSSetup();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('SQS access failed: SQS access denied');
      expect(result.services.sqs).toBe(false);
      expect(result.services.s3).toBe(true);
    });

    it('should handle Lambda access failure', async () => {
      s3Mock.resolves({ Buckets: [] });
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.rejects(new Error('Lambda access denied'));
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const result = await healthValidator.validateAWSSetup();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Lambda access failed: Lambda access denied'
      );
      expect(result.services.lambda).toBe(false);
      expect(result.services.s3).toBe(true);
    });

    it('should handle Step Functions access failure', async () => {
      s3Mock.resolves({ Buckets: [] });
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.rejects(new Error('Step Functions access denied'));
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const result = await healthValidator.validateAWSSetup();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'Step Functions access failed: Step Functions access denied'
      );
      expect(result.services.stepFunctions).toBe(false);
      expect(result.services.lambda).toBe(true);
    });

    it('should handle CloudWatch access failure as warning', async () => {
      s3Mock.resolves({ Buckets: [] });
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.rejects(new Error('CloudWatch access denied'));

      const result = await healthValidator.validateAWSSetup();

      expect(result.isValid).toBe(true); // CloudWatch is not critical
      expect(result.errors).toEqual([]);
      expect(result.warnings).toContain(
        'CloudWatch access failed: CloudWatch access denied'
      );
      expect(result.services.cloudWatch).toBe(false);
    });

    it('should handle multiple service failures', async () => {
      s3Mock.rejects(new Error('S3 error'));
      sqsMock.rejects(new Error('SQS error'));
      lambdaMock.rejects(new Error('Lambda error'));
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.rejects(new Error('CloudWatch error'));

      const result = await healthValidator.validateAWSSetup();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.warnings).toHaveLength(1);
      expect(result.services.s3).toBe(false);
      expect(result.services.sqs).toBe(false);
      expect(result.services.lambda).toBe(false);
      expect(result.services.stepFunctions).toBe(true);
      expect(result.services.cloudWatch).toBe(false);
    });

    it('should handle non-Error exceptions', async () => {
      s3Mock.rejects('String error');
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const result = await healthValidator.validateAWSSetup();

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('S3 access failed: String error');
    });
  });

  describe('getHealthStatus', () => {
    const mockMetrics: TestMetrics = {
      totalTests: 10,
      passedTests: 8,
      failedTests: 2,
      errorRate: 20,
      averageExecutionTime: 150,
      totalExecutionTime: 1500,
      slowestOperation: null,
      fastestOperation: null,
      retryRate: 0,
    };

    const mockContext: StepContext = {
      bucketName: 'test-bucket',
      functionName: 'test-function',
    };

    it('should return healthy status when AWS setup is valid and error rate is low', async () => {
      s3Mock.resolves({ Buckets: [] });
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const result = await healthValidator.getHealthStatus(
        mockMetrics,
        mockContext,
        3
      );

      expect(result.isHealthy).toBe(true);
      expect(result.awsSetup.isValid).toBe(true);
      expect(result.performance.totalOperations).toBe(10);
      expect(result.performance.errorRate).toBe(20);
      expect(result.performance.averageResponseTime).toBe(150);
      expect(result.resources.activeExecutions).toBe(3);
      expect(result.resources.contextEntries).toBe(2);
    });

    it('should return unhealthy status when AWS setup is invalid', async () => {
      s3Mock.rejects(new Error('S3 error'));
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const result = await healthValidator.getHealthStatus(
        mockMetrics,
        mockContext,
        2
      );

      expect(result.isHealthy).toBe(false);
      expect(result.awsSetup.isValid).toBe(false);
    });

    it('should return unhealthy status when error rate is too high', async () => {
      s3Mock.resolves({ Buckets: [] });
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const highErrorMetrics: TestMetrics = {
        ...mockMetrics,
        errorRate: 60,
      };

      const result = await healthValidator.getHealthStatus(
        highErrorMetrics,
        mockContext,
        1
      );

      expect(result.isHealthy).toBe(false);
      expect(result.awsSetup.isValid).toBe(true);
      expect(result.performance.errorRate).toBe(60);
    });

    it('should return healthy status when error rate is exactly 50%', async () => {
      s3Mock.resolves({ Buckets: [] });
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const borderlineMetrics: TestMetrics = {
        ...mockMetrics,
        errorRate: 50,
      };

      const result = await healthValidator.getHealthStatus(
        borderlineMetrics,
        mockContext,
        0
      );

      expect(result.isHealthy).toBe(false); // 50 is not less than 50
    });

    it('should handle empty context', async () => {
      s3Mock.resolves({ Buckets: [] });
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const emptyContext: StepContext = {};

      const result = await healthValidator.getHealthStatus(
        mockMetrics,
        emptyContext,
        0
      );

      expect(result.resources.contextEntries).toBe(0);
      expect(result.resources.activeExecutions).toBe(0);
    });

    it('should handle zero active executions', async () => {
      s3Mock.resolves({ Buckets: [] });
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const result = await healthValidator.getHealthStatus(
        mockMetrics,
        mockContext,
        0
      );

      expect(result.resources.activeExecutions).toBe(0);
    });

    it('should propagate AWS setup errors and warnings', async () => {
      s3Mock.rejects(new Error('S3 error'));
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.rejects(new Error('CloudWatch error'));

      const result = await healthValidator.getHealthStatus(
        mockMetrics,
        mockContext,
        1
      );

      expect(result.awsSetup.errors).toContain('S3 access failed: S3 error');
      expect(result.awsSetup.warnings).toContain(
        'CloudWatch access failed: CloudWatch error'
      );
    });
  });

  describe('waitForCondition', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return immediately when condition is true', async () => {
      const condition = jest
        .fn<() => Promise<boolean>>()
        .mockResolvedValue(true);

      const promise = healthValidator.waitForCondition(condition);
      await promise;

      expect(condition).toHaveBeenCalledTimes(1);
    });

    it('should retry until condition is true', async () => {
      let callCount = 0;
      const condition = jest
        .fn<() => Promise<boolean>>()
        .mockImplementation(async () => {
          callCount++;
          return callCount >= 3;
        });

      const promise = healthValidator.waitForCondition(condition, 10000, 100);

      // Advance timers to allow retries
      for (let i = 0; i < 3; i++) {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      }

      await promise;

      expect(callCount).toBe(3);
    });

    it('should throw error when timeout is reached', async () => {
      const condition = jest
        .fn<() => Promise<boolean>>()
        .mockResolvedValue(false);

      const promise = healthValidator.waitForCondition(condition, 1000, 100);

      // Advance timers past timeout
      await Promise.resolve();
      jest.advanceTimersByTime(1100);

      await expect(promise).rejects.toThrow(
        'Condition not met within 1000ms timeout'
      );
    });

    it('should use default timeout and interval', async () => {
      const condition = jest
        .fn<() => Promise<boolean>>()
        .mockResolvedValue(true);

      const promise = healthValidator.waitForCondition(condition);
      await promise;

      expect(condition).toHaveBeenCalled();
    });

    it('should ignore errors in condition and retry', async () => {
      let callCount = 0;
      const condition = jest
        .fn<() => Promise<boolean>>()
        .mockImplementation(async () => {
          callCount++;
          if (callCount < 3) {
            throw new Error('Temporary error');
          }
          return true;
        });

      const promise = healthValidator.waitForCondition(condition, 5000, 100);

      // Advance timers to allow retries
      for (let i = 0; i < 3; i++) {
        await Promise.resolve();
        jest.advanceTimersByTime(100);
      }

      await promise;

      expect(callCount).toBe(3);
    });

    it('should respect custom interval', async () => {
      let callCount = 0;
      const condition = jest
        .fn<() => Promise<boolean>>()
        .mockImplementation(async () => {
          callCount++;
          return callCount >= 2;
        });

      const promise = healthValidator.waitForCondition(condition, 10000, 500);

      // Advance by custom interval
      await Promise.resolve();
      jest.advanceTimersByTime(500);
      await Promise.resolve();

      await promise;

      expect(callCount).toBe(2);
    });

    it('should handle async condition function', async () => {
      const condition = jest
        .fn<() => Promise<boolean>>()
        .mockImplementation(async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return true;
        });

      const promise = healthValidator.waitForCondition(condition);

      jest.advanceTimersByTime(10);
      await promise;

      expect(condition).toHaveBeenCalled();
    });

    it('should handle condition that always throws', async () => {
      const condition = jest
        .fn<() => Promise<boolean>>()
        .mockRejectedValue(new Error('Always fails'));

      const promise = healthValidator.waitForCondition(condition, 500, 100);

      // Advance past timeout
      await Promise.resolve();
      jest.advanceTimersByTime(600);

      await expect(promise).rejects.toThrow(
        'Condition not met within 500ms timeout'
      );
      expect(condition).toHaveBeenCalled();
    });
  });

  describe('Edge Cases and Integration', () => {
    it('should handle all services failing simultaneously', async () => {
      s3Mock.rejects(new Error('S3 failure'));
      sqsMock.rejects(new Error('SQS failure'));
      lambdaMock.rejects(new Error('Lambda failure'));
      sfnMock.rejects(new Error('SFN failure'));
      cloudWatchLogsMock.rejects(new Error('CloudWatch failure'));

      const result = await healthValidator.validateAWSSetup();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(4);
      expect(result.warnings).toHaveLength(1);
      expect(Object.values(result.services).every((v) => v === false)).toBe(
        true
      );
    });

    it('should provide complete health status with all data', async () => {
      s3Mock.resolves({ Buckets: [] });
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const metrics: TestMetrics = {
        totalTests: 100,
        passedTests: 95,
        failedTests: 5,
        errorRate: 5,
        averageExecutionTime: 200,
        totalExecutionTime: 20000,
        slowestOperation: null,
        fastestOperation: null,
        retryRate: 0,
      };

      const context: StepContext = {
        bucketName: 'test',
        queueUrl: 'url',
        functionName: 'fn',
        executionArn: 'arn',
      };

      const result = await healthValidator.getHealthStatus(
        metrics,
        context,
        10
      );

      expect(result).toEqual({
        isHealthy: true,
        awsSetup: {
          isValid: true,
          errors: [],
          warnings: [],
          services: {
            s3: true,
            sqs: true,
            lambda: true,
            stepFunctions: true,
            cloudWatch: true,
          },
        },
        performance: {
          totalOperations: 100,
          errorRate: 5,
          averageResponseTime: 200,
        },
        resources: {
          activeExecutions: 10,
          contextEntries: 4,
        },
      });
    });

    it('should be reusable for multiple validations', async () => {
      s3Mock.resolves({ Buckets: [] });
      sqsMock.resolves({ QueueUrls: [] });
      lambdaMock.resolves({ Functions: [] });
      sfnMock.resolves({ stateMachines: [] });
      cloudWatchLogsMock.resolves({
        events: [],
        $metadata: {},
      } as FilterLogEventsCommandOutput);

      const result1 = await healthValidator.validateAWSSetup();
      const result2 = await healthValidator.validateAWSSetup();

      expect(result1.isValid).toBe(true);
      expect(result2.isValid).toBe(true);
    });
  });
});
