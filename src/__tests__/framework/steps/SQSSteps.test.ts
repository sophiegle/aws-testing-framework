import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IServiceContainer } from '../../../framework/container/ServiceContainer';
import type { SQSService } from '../../../framework/services/SQSService';
import type { FrameworkConfig, StepContext } from '../../../framework/types';

// Mock Cucumber before importing SQSSteps
const mockGiven = jest.fn();
const mockWhen = jest.fn();
const mockThen = jest.fn();

jest.mock('@cucumber/cucumber', () => ({
  Given: mockGiven,
  When: mockWhen,
  Then: mockThen,
}));

import { SQSSteps } from '../../../framework/steps/SQSSteps';

type StepCallback = (
  this: StepContext,
  ...args: (string | number)[]
) => Promise<void> | void;

describe('SQSSteps', () => {
  let sqsSteps: SQSSteps;
  let mockContainer: IServiceContainer;
  let mockContext: StepContext;
  let registeredSteps: Map<string, StepCallback>;

  // Properly typed mock services
  const mockSQSService = {
    findQueue: jest.fn(),
    sendMessage: jest.fn(),
    receiveMessage: jest.fn(),
  } as unknown as jest.Mocked<SQSService>;

  // Helper to safely get registered steps
  const getStep = (pattern: string): StepCallback => {
    const step = registeredSteps.get(pattern);
    if (!step) {
      throw new Error(`Step not found: ${pattern}`);
    }
    return step;
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    registeredSteps = new Map();
    mockGiven.mockClear();
    mockWhen.mockClear();
    mockThen.mockClear();

    // Capture registered steps
    const captureStep = (
      pattern: string | RegExp,
      callback: StepCallback
    ): void => {
      const key = typeof pattern === 'string' ? pattern : pattern.toString();
      registeredSteps.set(key, callback);
    };

    mockGiven.mockImplementation(captureStep as never);
    mockWhen.mockImplementation(captureStep as never);
    mockThen.mockImplementation(captureStep as never);

    // Create mock container with proper typing
    const mockGetConfig = jest.fn<() => FrameworkConfig>();
    mockGetConfig.mockReturnValue({ enableLogging: false } as FrameworkConfig);

    const mockIsDisposed = jest.fn<() => boolean>();
    mockIsDisposed.mockReturnValue(false);

    const mockDispose = jest.fn<() => Promise<void>>();

    mockContainer = {
      sqsService: mockSQSService,
      getConfig: mockGetConfig,
      isDisposed: mockIsDisposed,
      dispose: mockDispose,
    } as unknown as IServiceContainer;

    // Create fresh context for each test
    mockContext = {};

    // Create and register steps
    sqsSteps = new SQSSteps(mockContainer);
    sqsSteps.registerSteps();
  });

  describe('Step Registration', () => {
    it('should register all SQS step definitions', () => {
      expect(mockGiven).toHaveBeenCalled();
      expect(mockWhen).toHaveBeenCalled();
      expect(mockThen).toHaveBeenCalled();
      expect(registeredSteps.size).toBeGreaterThan(0);
    });

    it('should register Given step for SQS queue', () => {
      expect(mockGiven).toHaveBeenCalledWith(
        'I have an SQS queue named {string}',
        expect.any(Function)
      );
    });

    it('should register When step for sending message', () => {
      expect(mockWhen).toHaveBeenCalledWith(
        'I send a message {string} to the SQS queue',
        expect.any(Function)
      );
    });

    it('should register Then step for receiving notification', () => {
      expect(mockThen).toHaveBeenCalledWith(
        'the SQS queue should receive a notification',
        expect.any(Function)
      );
    });
  });

  describe('Given: I have an SQS queue named {string}', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('I have an SQS queue named {string}');
    });

    it('should set queue name and URL in context', async () => {
      mockSQSService.findQueue.mockResolvedValue(
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue'
      );

      await step.call(mockContext, 'test-queue');

      expect(mockContext.queueName).toBe('test-queue');
      expect(mockContext.queueUrl).toBe(
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue'
      );
      expect(mockSQSService.findQueue).toHaveBeenCalledWith('test-queue');
    });

    it('should call sqsService.findQueue', async () => {
      mockSQSService.findQueue.mockResolvedValue(
        'https://sqs.us-east-1.amazonaws.com/123456789012/my-queue'
      );

      await step.call(mockContext, 'my-queue');

      expect(mockSQSService.findQueue).toHaveBeenCalledWith('my-queue');
      expect(mockSQSService.findQueue).toHaveBeenCalledTimes(1);
    });

    it('should throw error if queue not found', async () => {
      mockSQSService.findQueue.mockResolvedValue('');

      await expect(step.call(mockContext, 'missing-queue')).rejects.toThrow(
        'SQS queue missing-queue not found'
      );
    });

    it('should propagate errors from sqsService.findQueue', async () => {
      mockSQSService.findQueue.mockRejectedValue(
        new Error('AWS Service Error')
      );

      await expect(step.call(mockContext, 'error-queue')).rejects.toThrow(
        'AWS Service Error'
      );
    });
  });

  describe('When: I send a message {string} to the SQS queue', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('I send a message {string} to the SQS queue');
      mockContext.queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
    });

    it('should send message to SQS queue', async () => {
      mockSQSService.sendMessage.mockResolvedValue(undefined);

      await step.call(mockContext, 'Test message');

      expect(mockSQSService.sendMessage).toHaveBeenCalledWith(
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        'Test message'
      );
    });

    it('should send JSON message', async () => {
      mockSQSService.sendMessage.mockResolvedValue(undefined);
      const jsonMessage = '{"type":"test","data":"value"}';

      await step.call(mockContext, jsonMessage);

      expect(mockSQSService.sendMessage).toHaveBeenCalledWith(
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        jsonMessage
      );
    });

    it('should throw error if queue URL is not set', async () => {
      delete mockContext.queueUrl;

      await expect(step.call(mockContext, 'message')).rejects.toThrow(
        'Queue URL is not set. Make sure to create an SQS queue first.'
      );
      expect(mockSQSService.sendMessage).not.toHaveBeenCalled();
    });

    it('should propagate send errors', async () => {
      mockSQSService.sendMessage.mockRejectedValue(new Error('Send failed'));

      await expect(step.call(mockContext, 'message')).rejects.toThrow(
        'Send failed'
      );
    });
  });

  describe('Then: the SQS queue should receive a notification', () => {
    let step: StepCallback;

    beforeEach(() => {
      step = getStep('the SQS queue should receive a notification');
      mockContext.queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      mockContext.queueName = 'test-queue';
    });

    it('should verify message received on first try', async () => {
      mockSQSService.receiveMessage.mockResolvedValue({
        Body: 'Test message',
        MessageId: 'msg-123',
        ReceiptHandle: 'receipt-123',
      });

      await step.call(mockContext);

      expect(mockSQSService.receiveMessage).toHaveBeenCalledWith(
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue'
      );
      expect(mockSQSService.receiveMessage).toHaveBeenCalledTimes(1);
    });

    it('should retry up to 5 times if message not initially received', async () => {
      // Return null 4 times, then message on 5th
      mockSQSService.receiveMessage
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue({
          Body: 'Test message',
          MessageId: 'msg-123',
        });

      await step.call(mockContext);

      expect(mockSQSService.receiveMessage).toHaveBeenCalledTimes(5);
    });

    it('should throw error after max retries if no message received', async () => {
      mockSQSService.receiveMessage.mockResolvedValue(null);

      await expect(step.call(mockContext)).rejects.toThrow(
        'No message received in SQS queue test-queue'
      );
      expect(mockSQSService.receiveMessage).toHaveBeenCalledTimes(5);
    });

    it('should throw error if queue URL is not set', async () => {
      delete mockContext.queueUrl;

      await expect(step.call(mockContext)).rejects.toThrow(
        'Queue URL is not set. Make sure to create an SQS queue first.'
      );
      expect(mockSQSService.receiveMessage).not.toHaveBeenCalled();
    });

    it('should eventually receive message after one retry', async () => {
      mockSQSService.receiveMessage
        .mockResolvedValueOnce(null)
        .mockResolvedValue({
          Body: 'Test message',
          MessageId: 'msg-456',
        });

      await step.call(mockContext);

      expect(mockSQSService.receiveMessage).toHaveBeenCalledTimes(2);
    });

    it('should handle message with empty body', async () => {
      mockSQSService.receiveMessage.mockResolvedValue({
        Body: '',
        MessageId: 'msg-789',
      });

      await step.call(mockContext);

      expect(mockSQSService.receiveMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty queue name gracefully', async () => {
      const step = getStep('I have an SQS queue named {string}');
      mockSQSService.findQueue.mockResolvedValue(
        'https://sqs.us-east-1.amazonaws.com/123456789012/'
      );

      await step.call(mockContext, '');

      expect(mockContext.queueName).toBe('');
      expect(mockSQSService.findQueue).toHaveBeenCalledWith('');
    });

    it('should handle empty message string', async () => {
      const step = getStep('I send a message {string} to the SQS queue');
      mockContext.queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      mockSQSService.sendMessage.mockResolvedValue(undefined);

      await step.call(mockContext, '');

      expect(mockSQSService.sendMessage).toHaveBeenCalledWith(
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
        ''
      );
    });

    it('should handle long queue URLs', async () => {
      const step = getStep('I have an SQS queue named {string}');
      const longUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/very-long-queue-name-with-many-characters';
      mockSQSService.findQueue.mockResolvedValue(longUrl);

      await step.call(mockContext, 'very-long-queue-name-with-many-characters');

      expect(mockContext.queueUrl).toBe(longUrl);
    });

    it('should use container services correctly', async () => {
      const step = getStep('I send a message {string} to the SQS queue');
      mockContext.queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';
      mockSQSService.sendMessage.mockResolvedValue(undefined);

      await step.call(mockContext, 'test');

      expect(mockSQSService.sendMessage).toHaveBeenCalled();
    });
  });

  describe('Integration with Services', () => {
    it('should properly chain queue creation and message sending', async () => {
      const createQueueStep = getStep('I have an SQS queue named {string}');
      const sendMessageStep = getStep(
        'I send a message {string} to the SQS queue'
      );

      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/integration-queue';
      mockSQSService.findQueue.mockResolvedValue(queueUrl);
      mockSQSService.sendMessage.mockResolvedValue(undefined);

      // Create queue
      await createQueueStep.call(mockContext, 'integration-queue');
      expect(mockContext.queueName).toBe('integration-queue');
      expect(mockContext.queueUrl).toBe(queueUrl);

      // Send message
      await sendMessageStep.call(mockContext, 'integration-test-message');
      expect(mockSQSService.sendMessage).toHaveBeenCalledWith(
        queueUrl,
        'integration-test-message'
      );
    });

    it('should properly chain queue creation, message sending, and verification', async () => {
      const createQueueStep = getStep('I have an SQS queue named {string}');
      const sendMessageStep = getStep(
        'I send a message {string} to the SQS queue'
      );
      const receiveStep = getStep(
        'the SQS queue should receive a notification'
      );

      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/full-test-queue';
      mockSQSService.findQueue.mockResolvedValue(queueUrl);
      mockSQSService.sendMessage.mockResolvedValue(undefined);
      mockSQSService.receiveMessage.mockResolvedValue({
        Body: 'test-message',
        MessageId: 'msg-integration',
      });

      // Create queue
      await createQueueStep.call(mockContext, 'full-test-queue');

      // Send message
      await sendMessageStep.call(mockContext, 'test-message');

      // Verify message received
      await receiveStep.call(mockContext);

      expect(mockSQSService.findQueue).toHaveBeenCalledWith('full-test-queue');
      expect(mockSQSService.sendMessage).toHaveBeenCalledWith(
        queueUrl,
        'test-message'
      );
      expect(mockSQSService.receiveMessage).toHaveBeenCalledWith(queueUrl);
    });

    it('should propagate service errors correctly', async () => {
      const step = getStep('I have an SQS queue named {string}');
      mockSQSService.findQueue.mockRejectedValue(
        new Error('AWS Service Error')
      );

      await expect(step.call(mockContext, 'error-queue')).rejects.toThrow(
        'AWS Service Error'
      );
    });
  });
});
