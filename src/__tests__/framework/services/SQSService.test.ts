import {
  GetQueueAttributesCommand,
  ListQueuesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { SQSService } from '../../../framework/services/SQSService';

const sqsMock = mockClient(SQSClient);

describe('SQSService', () => {
  let service: SQSService;
  let sqsClient: SQSClient;

  beforeEach(() => {
    sqsMock.reset();
    sqsClient = new SQSClient({ region: 'us-east-1' });
    service = new SQSService(sqsClient);
  });

  describe('findQueue', () => {
    it('should find queue by name', async () => {
      const mockQueueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';

      sqsMock.on(ListQueuesCommand).resolves({
        QueueUrls: [mockQueueUrl],
      });

      const result = await service.findQueue('test-queue');

      expect(result).toBe(mockQueueUrl);
    });

    it('should return empty string when queue not found', async () => {
      sqsMock.on(ListQueuesCommand).resolves({
        QueueUrls: [],
      });

      const result = await service.findQueue('non-existent');

      expect(result).toBe('');
    });

    it('should find queue from multiple results', async () => {
      const targetUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/my-test-queue';

      sqsMock.on(ListQueuesCommand).resolves({
        QueueUrls: [
          'https://sqs.us-east-1.amazonaws.com/123456789012/other-queue',
          targetUrl,
        ],
      });

      const result = await service.findQueue('my-test-queue');

      expect(result).toBe(targetUrl);
    });

    it('should handle AWS SDK errors', async () => {
      sqsMock.on(ListQueuesCommand).rejects(new Error('AWS error'));

      await expect(service.findQueue('test-queue')).rejects.toThrow();
    });
  });

  describe('sendMessage', () => {
    it('should send message to queue', async () => {
      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';

      sqsMock.on(SendMessageCommand).resolves({
        MessageId: 'msg-123',
      });

      await expect(
        service.sendMessage(queueUrl, 'test message')
      ).resolves.not.toThrow();
    });

    it('should handle send errors', async () => {
      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';

      sqsMock.on(SendMessageCommand).rejects(new Error('Send failed'));

      await expect(service.sendMessage(queueUrl, 'test')).rejects.toThrow(
        'Send failed'
      );
    });

    it('should send complex message bodies', async () => {
      const queueUrl =
        'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';

      sqsMock.on(SendMessageCommand).resolves({
        MessageId: 'msg-456',
      });

      const complexMessage = JSON.stringify({
        type: 'event',
        data: { nested: 'value' },
      });

      await expect(
        service.sendMessage(queueUrl, complexMessage)
      ).resolves.not.toThrow();
    });
  });

  describe('receiveMessage', () => {
    const queueUrl =
      'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';

    it('should receive message from queue', async () => {
      sqsMock.on(ReceiveMessageCommand).resolves({
        Messages: [
          {
            Body: 'test message',
            MessageId: 'msg-123',
            ReceiptHandle: 'receipt-123',
          },
        ],
      });

      const result = await service.receiveMessage(queueUrl);

      expect(result).toBeDefined();
      expect(result?.Body).toBe('test message');
      expect(result?.MessageId).toBe('msg-123');
    });

    it('should return null when no messages available', async () => {
      sqsMock.on(ReceiveMessageCommand).resolves({
        Messages: [],
      });

      const result = await service.receiveMessage(queueUrl);

      expect(result).toBeNull();
    });

    it('should handle receive errors', async () => {
      sqsMock.on(ReceiveMessageCommand).rejects(new Error('Receive failed'));

      await expect(service.receiveMessage(queueUrl)).rejects.toThrow(
        'Receive failed'
      );
    });
  });

  describe('getUnreadMessageCount', () => {
    const queueUrl =
      'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue';

    it('should get unread message count', async () => {
      sqsMock.on(GetQueueAttributesCommand).resolves({
        Attributes: {
          ApproximateNumberOfMessages: '5',
        },
      });

      const result = await service.getUnreadMessageCount(queueUrl);

      expect(result).toBe(5);
    });

    it('should return 0 when no messages', async () => {
      sqsMock.on(GetQueueAttributesCommand).resolves({
        Attributes: {
          ApproximateNumberOfMessages: '0',
        },
      });

      const result = await service.getUnreadMessageCount(queueUrl);

      expect(result).toBe(0);
    });

    it('should return 0 when attributes missing', async () => {
      sqsMock.on(GetQueueAttributesCommand).resolves({
        Attributes: {},
      });

      const result = await service.getUnreadMessageCount(queueUrl);

      expect(result).toBe(0);
    });

    it('should handle AWS SDK errors', async () => {
      sqsMock.on(GetQueueAttributesCommand).rejects(new Error('AWS error'));

      await expect(service.getUnreadMessageCount(queueUrl)).rejects.toThrow();
    });
  });
});
