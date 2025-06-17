import {
  CreateFunctionCommand,
  InvokeCommand,
  type InvokeCommandInput,
  LambdaClient,
} from '@aws-sdk/client-lambda';
import {
  CreateBucketCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  CreateStateMachineCommand,
  DescribeExecutionCommand,
  SFNClient,
  StartExecutionCommand,
} from '@aws-sdk/client-sfn';
import {
  CreateQueueCommand,
  ReceiveMessageCommand,
  SQSClient,
  SendMessageCommand,
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
    it('should create a bucket', async () => {
      const bucketName = 'test-bucket';
      s3Mock.on(CreateBucketCommand).resolves({});

      await framework.createBucket(bucketName);

      expect(s3Mock.calls()).toHaveLength(1);
      expect(s3Mock.calls()[0].args[0].input).toEqual({
        Bucket: bucketName,
      });
    });

    it('should upload a file to S3', async () => {
      const bucketName = 'test-bucket';
      const key = 'test.txt';
      const content = 'test content';
      s3Mock.on(PutObjectCommand).resolves({});

      await framework.uploadFile(bucketName, key, content);

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
      s3Mock.on(GetObjectCommand).resolves({});

      const exists = await framework.checkFileExists(bucketName, key);

      expect(exists).toBe(true);
      expect(s3Mock.calls()).toHaveLength(1);
      expect(s3Mock.calls()[0].args[0].input).toEqual({
        Bucket: bucketName,
        Key: key,
      });
    });
  });

  describe('SQS Operations', () => {
    it('should create a queue', async () => {
      const queueName = 'test-queue';
      sqsMock.on(CreateQueueCommand).resolves({
        QueueUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
      });

      const queueUrl = await framework.createQueue(queueName);

      expect(queueUrl).toBe('https://sqs.us-east-1.amazonaws.com/123456789012/test-queue');
      expect(sqsMock.calls()).toHaveLength(1);
      expect(sqsMock.calls()[0].args[0].input).toEqual({
        QueueName: queueName,
      });
    });

    it('should send a message to a queue', async () => {
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      const message = 'test message';
      sqsMock.on(SendMessageCommand).resolves({
        MessageId: 'test-message-id',
      });

      await framework.sendMessage(queueUrl, message);

      expect(sqsMock.calls()).toHaveLength(1);
      expect(sqsMock.calls()[0].args[0].input).toEqual({
        QueueUrl: queueUrl,
        MessageBody: message,
      });
    });

    it('should receive messages from a queue', async () => {
      const queueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
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
      expect(sqsMock.calls()).toHaveLength(1);
      expect(sqsMock.calls()[0].args[0].input).toEqual({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 1,
      });
    });
  });

  describe('Lambda Operations', () => {
    it('should create a function', async () => {
      const functionName = 'test-function';
      const handler = 'index.handler';
      lambdaMock.on(CreateFunctionCommand).resolves({
        FunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:test-function',
      });

      await framework.createFunction(functionName, handler);

      expect(lambdaMock.calls()).toHaveLength(1);
      expect(lambdaMock.calls()[0].args[0].input).toEqual({
        FunctionName: functionName,
        Handler: handler,
        Role: 'arn:aws:iam::123456789012:role/lambda-role',
        Runtime: 'nodejs22.x',
        Code: {
          ZipFile: expect.any(Uint8Array),
        },
      });
    });

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
      const actualInput = lambdaMock.calls()[0].args[0].input as InvokeCommandInput;
      expect(actualInput.FunctionName).toBe(functionName);

      // Compare the payload contents as strings
      const expectedPayload = Uint8ArrayBlobAdapter.from(JSON.stringify(payload));
      expect(Buffer.from(actualInput.Payload as unknown as Uint8Array).toString()).toBe(
        Buffer.from(expectedPayload as unknown as Uint8Array).toString()
      );
    });
  });

  describe('Step Functions Operations', () => {
    it('should create a state machine', async () => {
      const name = 'test-state-machine';
      sfnMock.on(CreateStateMachineCommand).resolves({
        stateMachineArn: 'arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine',
      });

      const stateMachineArn = await framework.createStateMachine(name);

      expect(stateMachineArn).toBe(
        'arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine'
      );
      expect(sfnMock.calls()).toHaveLength(1);
      expect(sfnMock.calls()[0].args[0].input).toEqual({
        name,
        roleArn: 'arn:aws:iam::123456789012:role/step-functions-role',
        definition: expect.any(String),
      });
    });

    it('should start an execution', async () => {
      const stateMachineArn =
        'arn:aws:states:us-east-1:123456789012:stateMachine:test-state-machine';
      const input = { test: 'data' };
      sfnMock.on(StartExecutionCommand).resolves({
        executionArn:
          'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution',
      });

      const executionArn = await framework.startExecution(stateMachineArn, input);

      expect(executionArn).toBe(
        'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution'
      );
      expect(sfnMock.calls()).toHaveLength(1);
      expect(sfnMock.calls()[0].args[0].input).toEqual({
        stateMachineArn,
        input: JSON.stringify(input),
      });
    });

    it('should get execution status', async () => {
      const executionArn =
        'arn:aws:states:us-east-1:123456789012:execution:test-state-machine:test-execution';
      sfnMock.on(DescribeExecutionCommand).resolves({
        status: 'SUCCEEDED',
      });

      const status = await framework.getExecutionStatus(executionArn);

      expect(status).toBe('SUCCEEDED');
      expect(sfnMock.calls()).toHaveLength(1);
      expect(sfnMock.calls()[0].args[0].input).toEqual({
        executionArn: executionArn,
      });
    });
  });
});
