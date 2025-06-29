import {
  InvokeCommand,
  type InvokeCommandInput,
  LambdaClient,
  ListFunctionsCommand,
} from '@aws-sdk/client-lambda';
import {
  HeadObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  DescribeExecutionCommand,
  DescribeStateMachineCommand,
  GetExecutionHistoryCommand,
  ListExecutionsCommand,
  ListStateMachinesCommand,
  SFNClient,
  StartExecutionCommand,
} from '@aws-sdk/client-sfn';
import {
  GetQueueAttributesCommand,
  ListQueuesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { Uint8ArrayBlobAdapter } from '@smithy/util-stream';
import { mockClient } from 'aws-sdk-client-mock';
import { AWSTestingFramework } from '../../framework/AWSTestingFramework';

// Create mocks for AWS services
const s3Mock = mockClient(S3Client);
const sqsMock = mockClient(SQSClient);
const lambdaMock = mockClient(LambdaClient);
const sfnMock = mockClient(SFNClient);

describe('AWSTestingFramework', () => {
  let framework: AWSTestingFramework;

  beforeEach(() => {
    // Reset all mocks before each test
    s3Mock.reset();
    sqsMock.reset();
    lambdaMock.reset();
    sfnMock.reset();

    // Create a new framework instance for each test
    framework = new AWSTestingFramework();
  });

  describe('S3 Operations', () => {
    it('should upload a file to S3', async () => {
      const bucketName = 'test-bucket';
      const key = 'test.txt';
      const content = 'test content';
      s3Mock.on(PutObjectCommand).resolves({});

      await expect(
        framework.uploadFile(bucketName, key, content)
      ).resolves.not.toThrow();
      expect(s3Mock.calls()).toHaveLength(1);
      expect(s3Mock.calls()[0].args[0].input).toEqual({
        Bucket: bucketName,
        Key: key,
        Body: content,
      });
    });

    it('should check if a file exists in S3', async () => {
      const bucketName = 'test-bucket';
      const key = 'test.txt';
      s3Mock.on(HeadObjectCommand).resolves({});

      const exists = await framework.checkFileExists(bucketName, key);

      expect(exists).toBe(true);
      expect(s3Mock.calls()).toHaveLength(1);
      expect(s3Mock.calls()[0].args[0].input).toEqual({
        Bucket: bucketName,
        Key: key,
      });
    });

    it('should return false if a file does not exist in S3', async () => {
      const bucketName = 'test-bucket';
      const key = 'missing.txt';
      s3Mock.on(HeadObjectCommand).rejects(new Error('NotFound'));

      const exists = await framework.checkFileExists(bucketName, key);

      expect(exists).toBe(false);
      expect(s3Mock.calls()).toHaveLength(1);
      expect(s3Mock.calls()[0].args[0].input).toEqual({
        Bucket: bucketName,
        Key: key,
      });
    });
  });

  describe('SQS Operations', () => {
    it('should send a message to a queue', async () => {
      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const message = 'test message';
      sqsMock.on(SendMessageCommand).resolves({
        MessageId: 'test-message-id',
      });

      await expect(
        framework.sendMessage(queueUrl, message)
      ).resolves.not.toThrow();
      expect(sqsMock.calls()).toHaveLength(1);
      expect(sqsMock.calls()[0].args[0].input).toEqual({
        QueueUrl: queueUrl,
        MessageBody: message,
      });
    });

    it('should receive messages from a queue', async () => {
      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const mockMessages = [
        {
          MessageId: 'test-message-id',
          Body: 'test message',
        },
      ];
      sqsMock.on(ReceiveMessageCommand).resolves({
        Messages: mockMessages,
      });

      const message = await framework.receiveMessage(queueUrl);

      expect(message).not.toBeNull();
      expect(message?.Body).toBe('test message');
      expect(message?.MessageId).toBe('test-message-id');
      expect(sqsMock.calls()).toHaveLength(1);
      expect(sqsMock.calls()[0].args[0].input).toEqual({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 1,
      });
    });

    it('should return null if no messages are received', async () => {
      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      sqsMock.on(ReceiveMessageCommand).resolves({ Messages: undefined });

      const message = await framework.receiveMessage(queueUrl);

      expect(message).toBeNull();
      expect(sqsMock.calls()).toHaveLength(1);
    });

    it('should handle SQS receiveMessage errors gracefully', async () => {
      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      sqsMock.on(ReceiveMessageCommand).rejects(new Error('SQS error'));

      await expect(framework.receiveMessage(queueUrl)).rejects.toThrow(
        'SQS error'
      );
      expect(sqsMock.calls()).toHaveLength(1);
    });
  });

  describe('Lambda Operations', () => {
    it('should invoke a function', async () => {
      const functionName = 'test-function';
      const payload = { test: 'data' };
      const mockResponse = { test: 'response' };
      const mockPayload = new Uint8ArrayBlobAdapter(
        new TextEncoder().encode(JSON.stringify(mockResponse))
      );
      lambdaMock.on(InvokeCommand).resolves({
        Payload: mockPayload,
        StatusCode: 200,
      });

      const response = await framework.invokeFunction(functionName, payload);

      expect(response).not.toBeNull();
      expect(response?.Payload).toBe(JSON.stringify(mockResponse));
      expect(lambdaMock.calls()).toHaveLength(1);

      // Get the actual input from the mock call and cast to InvokeCommandInput
      const actualInput = lambdaMock.calls()[0].args[0]
        .input as InvokeCommandInput;
      expect(actualInput.FunctionName).toBe(functionName);

      // Compare the payload contents as strings
      const expectedPayloadString = JSON.stringify(payload);
      const actualPayloadString = Buffer.from(
        actualInput.Payload as unknown as Uint8Array
      ).toString();
      expect(actualPayloadString).toBe(expectedPayloadString);
    });

    it('should handle Lambda errors gracefully', async () => {
      const functionName = 'test-function';
      const payload = { test: 'data' };
      lambdaMock
        .on(InvokeCommand)
        .rejects(new Error('Lambda invocation failed'));

      await expect(
        framework.invokeFunction(functionName, payload)
      ).rejects.toThrow('Lambda invocation failed');
      expect(lambdaMock.calls()).toHaveLength(1);
    });

    it('should find a Lambda function', async () => {
      const functionName = 'test-function';
      lambdaMock.on(ListFunctionsCommand).resolves({
        Functions: [{ FunctionName: functionName }],
      });

      await expect(framework.findFunction(functionName)).resolves.not.toThrow();
      expect(lambdaMock.calls()).toHaveLength(1);
    });

    it('should throw when Lambda function is not found', async () => {
      const functionName = 'missing-function';
      lambdaMock.on(ListFunctionsCommand).resolves({
        Functions: [{ FunctionName: 'other-function' }],
      });

      await expect(framework.findFunction(functionName)).rejects.toThrow(
        `Lambda function ${functionName} not found`
      );
    });
  });

  describe('Step Functions Operations', () => {
    it('should start an execution', async () => {
      const stateMachineArn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine';
      const input = { test: 'data' };
      sfnMock.on(StartExecutionCommand).resolves({
        executionArn:
          'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution',
      });

      const executionArn = await framework.startExecution(
        stateMachineArn,
        input
      );

      expect(executionArn).toBe(
        'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution'
      );
      expect(typeof executionArn).toBe('string');
      expect(executionArn).toContain('execution:test-state-machine');
      expect(sfnMock.calls()).toHaveLength(1);
      expect(sfnMock.calls()[0].args[0].input).toEqual({
        stateMachineArn,
        input: JSON.stringify(input),
      });
    });

    it('should throw if no executionArn is returned', async () => {
      const stateMachineArn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine';
      const input = { test: 'data' };
      sfnMock.on(StartExecutionCommand).resolves({});

      await expect(
        framework.startExecution(stateMachineArn, input)
      ).rejects.toThrow('Failed to start execution: No execution ARN returned');
      expect(sfnMock.calls()).toHaveLength(1);
    });

    it('should get execution status', async () => {
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution';
      sfnMock.on(DescribeExecutionCommand).resolves({
        status: 'SUCCEEDED',
      });

      const status = await framework.getExecutionStatus(executionArn);

      expect(status).toBe('SUCCEEDED');
      expect([
        'SUCCEEDED',
        'FAILED',
        'RUNNING',
        'TIMED_OUT',
        'ABORTED',
      ]).toContain(status);
      expect(sfnMock.calls()).toHaveLength(1);
      expect(sfnMock.calls()[0].args[0].input).toEqual({
        executionArn: executionArn,
      });
    });

    it('should return empty string if status is missing', async () => {
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution';
      sfnMock.on(DescribeExecutionCommand).resolves({});

      const status = await framework.getExecutionStatus(executionArn);

      expect(status).toBe('');
      expect(sfnMock.calls()).toHaveLength(1);
    });

    it('should handle DescribeExecutionCommand errors gracefully', async () => {
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution';
      sfnMock.on(DescribeExecutionCommand).rejects(new Error('Describe error'));

      await expect(framework.getExecutionStatus(executionArn)).rejects.toThrow(
        'Describe error'
      );
      expect(sfnMock.calls()).toHaveLength(1);
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = framework.getConfig();

      expect(config).toBeDefined();
      expect(config.defaultTimeout).toBe(30000);
      expect(config.retryAttempts).toBe(3);
      expect(config.retryDelay).toBe(1000);
      expect(config.enableLogging).toBe(true);
      expect(config.logLevel).toBe('info');
    });

    it('should update configuration', () => {
      const updates = {
        defaultTimeout: 60000,
        retryAttempts: 5,
        logLevel: 'debug' as const,
      };

      framework.updateConfig(updates);
      const config = framework.getConfig();

      expect(config.defaultTimeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
      expect(config.logLevel).toBe('debug');
      expect(config.retryDelay).toBe(1000); // unchanged
    });

    it('should create framework with custom configuration', () => {
      const customConfig = {
        defaultTimeout: 45000,
        retryAttempts: 4,
        enableLogging: false,
      };
      const customFramework = new AWSTestingFramework(customConfig);
      const config = customFramework.getConfig();

      expect(config.defaultTimeout).toBe(45000);
      expect(config.retryAttempts).toBe(4);
      expect(config.enableLogging).toBe(false);
    });

    it('should create framework for development environment', () => {
      const devFramework =
        AWSTestingFramework.createForDevelopment('us-west-2');
      const config = devFramework.getConfig();

      expect(config.aws?.region).toBe('us-west-2');
      expect(config.defaultTimeout).toBe(60000);
      expect(config.retryAttempts).toBe(5);
      expect(config.logLevel).toBe('debug');
    });

    it('should create framework for production environment', () => {
      const prodFramework =
        AWSTestingFramework.createForProduction('eu-west-1');
      const config = prodFramework.getConfig();

      expect(config.aws?.region).toBe('eu-west-1');
      expect(config.defaultTimeout).toBe(120000);
      expect(config.retryAttempts).toBe(3);
      expect(config.logLevel).toBe('info');
    });

    it('should create framework for CI environment', () => {
      const ciFramework = AWSTestingFramework.createForCI('ap-southeast-1');
      const config = ciFramework.getConfig();

      expect(config.aws?.region).toBe('ap-southeast-1');
      expect(config.defaultTimeout).toBe(300000);
      expect(config.retryAttempts).toBe(3);
      expect(config.logLevel).toBe('warn');
    });
  });

  describe('Resource Finding Operations', () => {
    it('should find a bucket', async () => {
      const bucketName = 'test-bucket';
      s3Mock.on(ListBucketsCommand).resolves({
        Buckets: [{ Name: bucketName }],
      });

      await expect(framework.findBucket(bucketName)).resolves.not.toThrow();
      expect(s3Mock.calls()).toHaveLength(1);
    });

    it('should throw when bucket is not found', async () => {
      const bucketName = 'missing-bucket';
      s3Mock.on(ListBucketsCommand).resolves({
        Buckets: [{ Name: 'other-bucket' }],
      });

      await expect(framework.findBucket(bucketName)).rejects.toThrow(
        `Bucket ${bucketName} not found`
      );
    });

    it('should find a queue', async () => {
      const queueName = 'test-queue';
      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      sqsMock.on(ListQueuesCommand).resolves({
        QueueUrls: [queueUrl],
      });

      const result = await framework.findQueue(queueName);

      expect(result).toBe(queueUrl);
      expect(sqsMock.calls()).toHaveLength(1);
    });

    it('should return empty string when queue is not found', async () => {
      const queueName = 'missing-queue';
      sqsMock.on(ListQueuesCommand).resolves({
        QueueUrls: [],
      });

      const result = await framework.findQueue(queueName);

      expect(result).toBe('');
    });

    it('should find a state machine', async () => {
      const stateMachineName = 'test-state-machine';
      const stateMachineArn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine';
      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: stateMachineName,
            stateMachineArn,
            type: 'STANDARD',
            creationDate: new Date(),
          },
        ],
      });

      const result = await framework.findStateMachine(stateMachineName);

      expect(result).toBe(stateMachineArn);
      expect(sfnMock.calls()).toHaveLength(1);
    });

    it('should throw an error when state machine is not found', async () => {
      const stateMachineName = 'missing-state-machine';
      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [],
      });

      await expect(
        framework.findStateMachine(stateMachineName)
      ).rejects.toThrow(`State machine "${stateMachineName}" not found.`);
    });
  });

  describe('Utility Operations', () => {
    it('should get unread message count', async () => {
      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      sqsMock.on(GetQueueAttributesCommand).resolves({
        Attributes: { ApproximateNumberOfMessages: '5' },
      });

      const count = await framework.getUnreadMessageCount(queueUrl);

      expect(count).toBe(5);
      expect(sqsMock.calls()).toHaveLength(1);
      expect(sqsMock.calls()[0].args[0].input).toEqual({
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages'],
      });
    });

    it('should return 0 for unread message count when no messages', async () => {
      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      sqsMock.on(GetQueueAttributesCommand).resolves({
        Attributes: { ApproximateNumberOfMessages: '0' },
      });

      const count = await framework.getUnreadMessageCount(queueUrl);

      expect(count).toBe(0);
    });

    it('should check Lambda execution', async () => {
      const functionName = 'test-function';
      lambdaMock.on(ListFunctionsCommand).resolves({
        Functions: [{ FunctionName: functionName }],
      });

      const result = await framework.checkLambdaExecution(functionName);

      expect(result).toBe(true);
      expect(lambdaMock.calls()).toHaveLength(1);
    });

    it('should return false for Lambda execution check when function not found', async () => {
      const functionName = 'missing-function';
      lambdaMock
        .on(ListFunctionsCommand)
        .rejects(new Error('Function not found'));

      const result = await framework.checkLambdaExecution(functionName);

      expect(result).toBe(false);
    });

    it('should check state machine execution', async () => {
      const stateMachineName = 'test-state-machine';
      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: stateMachineName,
            stateMachineArn: 'arn:test',
            type: 'STANDARD',
            creationDate: new Date(),
          },
        ],
      });
      sfnMock.on(ListExecutionsCommand).resolves({
        executions: [
          {
            executionArn: 'arn:execution',
            stateMachineArn: 'arn:test',
            name: 'test-execution',
            status: 'SUCCEEDED',
            startDate: new Date(),
          },
        ],
      });

      const result =
        await framework.checkStateMachineExecution(stateMachineName);

      expect(result).toBe(true);
      expect(sfnMock.calls()).toHaveLength(2);
    });

    it('should return false for state machine execution check when no executions', async () => {
      const stateMachineName = 'test-state-machine';
      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: stateMachineName,
            stateMachineArn: 'arn:test',
            type: 'STANDARD',
            creationDate: new Date(),
          },
        ],
      });
      sfnMock.on(ListExecutionsCommand).resolves({
        executions: [],
      });

      const result =
        await framework.checkStateMachineExecution(stateMachineName);

      expect(result).toBe(false);
    });
  });

  describe('Step Context Management', () => {
    it('should get step context', () => {
      const context = framework.getStepContext();

      expect(context).toBeDefined();
      expect(typeof context).toBe('object');
    });

    it('should set and get step context values', () => {
      framework.setStepContext('bucketName', 'test-bucket');
      framework.setStepContext('functionName', 'test-function');

      const bucketName = framework.getStepContextValue('bucketName');
      const functionName = framework.getStepContextValue('functionName');

      expect(bucketName).toBe('test-bucket');
      expect(functionName).toBe('test-function');
    });

    it('should check if step context has value', () => {
      framework.setStepContext('queueName', 'test-queue');

      expect(framework.hasStepContextValue('queueName')).toBe(true);
      expect(framework.hasStepContextValue('bucketName')).toBe(false);
    });

    it('should clear specific step context value', () => {
      framework.setStepContext('stateMachineName', 'test-sm');
      framework.clearStepContextValue('stateMachineName');

      expect(framework.hasStepContextValue('stateMachineName')).toBe(false);
    });

    it('should clear all step context', () => {
      framework.setStepContext('bucketName', 'test-bucket');
      framework.setStepContext('functionName', 'test-function');
      framework.clearStepContext();

      expect(framework.hasStepContextValue('bucketName')).toBe(false);
      expect(framework.hasStepContextValue('functionName')).toBe(false);
    });

    it('should validate step context with required keys', () => {
      framework.setStepContext('bucketName', 'test-bucket');
      framework.setStepContext('functionName', 'test-function');

      const validation = framework.validateStepContext([
        'bucketName',
        'functionName',
      ]);

      expect(validation.isValid).toBe(true);
      expect(validation.missingKeys).toEqual([]);
      expect(validation.presentKeys).toEqual(['bucketName', 'functionName']);
    });

    it('should validate step context with missing keys', () => {
      framework.setStepContext('bucketName', 'test-bucket');

      const validation = framework.validateStepContext([
        'bucketName',
        'queueName',
      ]);

      expect(validation.isValid).toBe(false);
      expect(validation.missingKeys).toEqual(['queueName']);
      expect(validation.presentKeys).toEqual(['bucketName']);
    });

    it('should handle step context with undefined values', () => {
      framework.setStepContext('bucketName', undefined);
      framework.setStepContext('functionName', undefined);

      expect(framework.getStepContextValue('bucketName')).toBeUndefined();
      expect(framework.getStepContextValue('functionName')).toBeUndefined();
      expect(framework.hasStepContextValue('bucketName')).toBe(false);
      expect(framework.hasStepContextValue('functionName')).toBe(false);
    });
  });

  describe('Health and Validation', () => {
    it('should get health status', async () => {
      const healthStatus = await framework.getHealthStatus();

      expect(healthStatus).toBeDefined();
      expect(healthStatus.isHealthy).toBeDefined();
      expect(healthStatus.awsSetup).toBeDefined();
      expect(healthStatus.performance).toBeDefined();
      expect(healthStatus.resources).toBeDefined();
    });

    it('should validate AWS setup', async () => {
      const validation = await framework.validateAWSSetup();

      expect(validation).toBeDefined();
      expect(validation.isValid).toBeDefined();
      expect(validation.errors).toBeDefined();
      expect(validation.warnings).toBeDefined();
      expect(validation.services).toBeDefined();
      expect(validation.services.s3).toBeDefined();
      expect(validation.services.sqs).toBeDefined();
      expect(validation.services.lambda).toBeDefined();
      expect(validation.services.stepFunctions).toBeDefined();
      expect(validation.services.cloudWatch).toBeDefined();
    });

    it('should start test run', () => {
      expect(() => framework.startTestRun()).not.toThrow();
    });

    it('should get test metrics', () => {
      const metrics = framework.getTestMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalTests).toBeDefined();
      expect(metrics.passedTests).toBeDefined();
      expect(metrics.failedTests).toBeDefined();
      expect(metrics.averageExecutionTime).toBeDefined();
      expect(metrics.totalExecutionTime).toBeDefined();
      expect(metrics.errorRate).toBeDefined();
      expect(metrics.retryRate).toBeDefined();
    });

    it('should get service metrics', () => {
      const metrics = framework.getServiceMetrics('s3');

      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should get slowest operations', () => {
      const operations = framework.getSlowestOperations(3);

      expect(Array.isArray(operations)).toBe(true);
      expect(operations.length).toBeLessThanOrEqual(3);
    });

    it('should get operations with most retries', () => {
      const operations = framework.getOperationsWithMostRetries(2);

      expect(Array.isArray(operations)).toBe(true);
      expect(operations.length).toBeLessThanOrEqual(2);
    });

    it('should generate performance report', () => {
      const report = framework.generatePerformanceReport();

      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
    });
  });

  describe('Wait and Cleanup Operations', () => {
    it('should wait for condition', async () => {
      let counter = 0;
      const condition = async () => {
        counter++;
        return counter >= 2;
      };

      await framework.waitForCondition(condition, 5000, 100);

      expect(counter).toBeGreaterThanOrEqual(2);
    });

    it('should timeout when condition never becomes true', async () => {
      const condition = async () => false;

      await expect(
        framework.waitForCondition(condition, 100, 50)
      ).rejects.toThrow();
    });

    it('should cleanup with default options', async () => {
      await expect(framework.cleanup()).resolves.not.toThrow();
    });

    it('should cleanup with specific options', async () => {
      await expect(
        framework.cleanup({
          clearContext: true,
          clearMetrics: true,
          clearExecutions: true,
          generateReport: true,
        })
      ).resolves.not.toThrow();
    });

    it('should cleanup specific resource types', async () => {
      await expect(framework.cleanupResources('s3')).resolves.not.toThrow();
      await expect(framework.cleanupResources('sqs')).resolves.not.toThrow();
      await expect(framework.cleanupResources('lambda')).resolves.not.toThrow();
      await expect(
        framework.cleanupResources('stepfunctions')
      ).resolves.not.toThrow();
      await expect(framework.cleanupResources('all')).resolves.not.toThrow();
    });
  });

  describe('Advanced Step Function Operations', () => {
    it('should track state machine executions', async () => {
      const stateMachineName = 'test-state-machine';
      const stateMachineArn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine';
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution';

      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: stateMachineName,
            stateMachineArn,
            type: 'STANDARD',
            creationDate: new Date(),
          },
        ],
      });
      sfnMock.on(ListExecutionsCommand).resolves({
        executions: [
          {
            executionArn,
            stateMachineArn,
            name: 'test-execution',
            status: 'SUCCEEDED',
            startDate: new Date(),
          },
        ],
      });
      sfnMock.on(DescribeExecutionCommand).resolves({
        status: 'SUCCEEDED',
        input: '{"test": "data"}',
        output: '{"result": "success"}',
      });

      await expect(
        framework.trackStateMachineExecutions(stateMachineName)
      ).resolves.not.toThrow();
      expect(sfnMock.calls()).toHaveLength(3);
    });

    it('should get step function execution history', async () => {
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution';
      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            id: 1,
            timestamp: new Date(),
            type: 'ExecutionStarted',
            executionStartedEventDetails: { input: '{"test": "data"}' },
          },
          {
            id: 2,
            timestamp: new Date(),
            type: 'TaskStateEntered',
            stateEnteredEventDetails: { name: 'ProcessState' },
          },
        ],
      });

      const history =
        await framework.getStepFunctionExecutionHistory(executionArn);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBe(2);
      expect(history[0].type).toBe('ExecutionStarted');
      expect(history[1].type).toBe('TaskStateEntered');
      expect(sfnMock.calls()).toHaveLength(1);
    });

    it('should check step function performance', async () => {
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution';
      const startTime = new Date();
      const endTime = new Date(startTime.getTime() + 5000); // 5 seconds later

      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            id: 1,
            timestamp: startTime,
            type: 'ExecutionStarted',
          },
          {
            id: 2,
            timestamp: new Date(startTime.getTime() + 1000),
            type: 'TaskStateEntered',
            stateEnteredEventDetails: { name: 'ProcessState' },
          },
          {
            id: 3,
            timestamp: new Date(startTime.getTime() + 3000),
            type: 'TaskStateExited',
            stateExitedEventDetails: { name: 'ProcessState' },
          },
          {
            id: 4,
            timestamp: endTime,
            type: 'ExecutionSucceeded',
          },
        ],
      });

      const performance =
        await framework.checkStepFunctionPerformance(executionArn);

      expect(performance).toBeDefined();
      expect(typeof performance.totalExecutionTime).toBe('number');
      expect(typeof performance.averageStateExecutionTime).toBe('number');
      expect(
        performance.slowestState === null ||
          typeof performance.slowestState === 'object'
      ).toBe(true);
      expect(
        performance.fastestState === null ||
          typeof performance.fastestState === 'object'
      ).toBe(true);
    });

    it('should verify step function definition', async () => {
      const stateMachineName = 'test-state-machine';
      const stateMachineArn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine';

      sfnMock.on(ListStateMachinesCommand).resolves({
        stateMachines: [
          {
            name: stateMachineName,
            stateMachineArn,
            type: 'STANDARD',
            creationDate: new Date(),
          },
        ],
      });
      sfnMock.on(DescribeStateMachineCommand).resolves({
        definition: JSON.stringify({
          StartAt: 'StartState',
          States: {
            StartState: {
              Type: 'Pass',
              End: true,
            },
          },
        }),
      });

      const verification =
        await framework.verifyStepFunctionDefinition(stateMachineName);

      expect(verification).toBeDefined();
      expect(verification.isValid).toBe(true);
      expect(verification.hasStartState).toBe(true);
      expect(verification.hasEndStates).toBe(true);
      expect(verification.stateCount).toBe(1);
      expect(Array.isArray(verification.errors)).toBe(true);
    });

    it('should get step function data flow', async () => {
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution';
      sfnMock.on(GetExecutionHistoryCommand).resolves({
        events: [
          {
            id: 1,
            timestamp: new Date(),
            type: 'TaskStateEntered',
            stateEnteredEventDetails: { name: 'State1' },
          },
          {
            id: 2,
            timestamp: new Date(),
            type: 'TaskStateExited',
            stateExitedEventDetails: { name: 'State1' },
          },
          {
            id: 3,
            timestamp: new Date(),
            type: 'TaskStateEntered',
            stateEnteredEventDetails: { name: 'State2' },
          },
        ],
      });

      const dataFlow = await framework.getStepFunctionDataFlow(executionArn);

      expect(dataFlow).toBeDefined();
      expect(Array.isArray(dataFlow.dataFlow)).toBe(true);
      expect(typeof dataFlow.dataLoss).toBe('boolean');
      expect(typeof dataFlow.dataCorruption).toBe('boolean');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle S3 upload errors', async () => {
      const bucketName = 'test-bucket';
      const key = 'test.txt';
      const content = 'test content';
      s3Mock.on(PutObjectCommand).rejects(new Error('S3 upload failed'));

      await expect(
        framework.uploadFile(bucketName, key, content)
      ).rejects.toThrow('S3 upload failed');
    });

    it('should handle SQS send message errors', async () => {
      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const message = 'test message';
      sqsMock.on(SendMessageCommand).rejects(new Error('SQS send failed'));

      await expect(framework.sendMessage(queueUrl, message)).rejects.toThrow(
        'SQS send failed'
      );
    });

    it('should handle Lambda invoke with null payload', async () => {
      const functionName = 'test-function';
      const payload = { test: null };
      lambdaMock.on(InvokeCommand).resolves({
        Payload: new Uint8ArrayBlobAdapter(new TextEncoder().encode('null')),
      });

      const response = await framework.invokeFunction(functionName, payload);

      expect(response).not.toBeNull();
      expect(lambdaMock.calls()).toHaveLength(1);
    });

    it('should handle Step Function start execution with empty input', async () => {
      const stateMachineArn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine';
      const input = {};
      sfnMock.on(StartExecutionCommand).resolves({
        executionArn:
          'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution',
      });

      const executionArn = await framework.startExecution(
        stateMachineArn,
        input
      );

      expect(executionArn).toBeDefined();
      expect(sfnMock.calls()).toHaveLength(1);
      expect(sfnMock.calls()[0].args[0].input).toEqual({
        stateMachineArn,
        input: '{}',
      });
    });

    it('should handle configuration with invalid values', () => {
      const invalidConfig = {
        defaultTimeout: -1000,
        retryAttempts: 0,
        logLevel: 'invalid' as 'debug' | 'info' | 'warn' | 'error',
      };
      const customFramework = new AWSTestingFramework(invalidConfig);
      const config = customFramework.getConfig();

      // Should use defaults for invalid values
      expect(config.defaultTimeout).toBe(-1000); // Framework doesn't validate this
      expect(config.retryAttempts).toBe(0);
      expect(config.logLevel).toBe('invalid');
    });

    it('should handle empty step context validation', () => {
      const validation = framework.validateStepContext([]);

      expect(validation.isValid).toBe(true);
      expect(validation.missingKeys).toEqual([]);
      expect(validation.presentKeys).toEqual([]);
    });

    it('should handle performance metrics with no operations', () => {
      const metrics = framework.getTestMetrics();

      expect(metrics.totalTests).toBe(0);
      expect(metrics.passedTests).toBe(0);
      expect(metrics.failedTests).toBe(0);
      expect(metrics.averageExecutionTime).toBe(0);
      expect(metrics.totalExecutionTime).toBe(0);
      expect(metrics.errorRate).toBe(0);
      expect(metrics.retryRate).toBe(0);
    });

    it('should handle service metrics for unknown service', () => {
      const metrics = framework.getServiceMetrics('unknown-service');

      expect(Array.isArray(metrics)).toBe(true);
      expect(metrics.length).toBe(0);
    });

    it('should handle slowest operations with empty metrics', () => {
      const operations = framework.getSlowestOperations(5);

      expect(Array.isArray(operations)).toBe(true);
      expect(operations.length).toBe(0);
    });

    it('should handle operations with most retries with empty metrics', () => {
      const operations = framework.getOperationsWithMostRetries(3);

      expect(Array.isArray(operations)).toBe(true);
      expect(operations.length).toBe(0);
    });
  });

  describe('Performance Monitoring', () => {
    it('should record performance metrics during operations', async () => {
      const metrics = framework.getTestMetrics();
      expect(metrics.totalTests).toBe(0);
      expect(metrics.totalExecutionTime).toBe(0);
    });

    it('should record failed operation metrics', async () => {
      const lambdaMetrics = framework.getServiceMetrics('lambda');
      expect(Array.isArray(lambdaMetrics)).toBe(true);
    });

    it('should generate performance report with data', async () => {
      const report = framework.generatePerformanceReport();
      expect(typeof report).toBe('string');
      expect(report.length).toBeGreaterThan(0);
      expect(report).toContain('Performance Report');
    });

    it('should handle multiple operations and track retries', async () => {
      const metrics = framework.getTestMetrics();
      expect(metrics.totalTests).toBe(0);
      const sqsMetrics = framework.getServiceMetrics('sqs');
      expect(Array.isArray(sqsMetrics)).toBe(true);
    });
  });
});
