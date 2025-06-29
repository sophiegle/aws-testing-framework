import {
  GetQueueAttributesCommand,
  ListQueuesCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  type SQSClient,
} from '@aws-sdk/client-sqs';

export class SQSService {
  private sqsClient: SQSClient;

  constructor(sqsClient: SQSClient) {
    this.sqsClient = sqsClient;
  }

  async findQueue(queueName: string): Promise<string> {
    const command = new ListQueuesCommand({});
    const response = await this.sqsClient.send(command);
    const queue = response.QueueUrls?.find((queue) =>
      queue.includes(queueName)
    );
    return queue ?? '';
  }

  async sendMessage(queueUrl: string, message: string): Promise<void> {
    await this.sqsClient.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: message,
      })
    );
  }

  async receiveMessage(queueUrl: string): Promise<{
    Body?: string;
    MessageId?: string;
    ReceiptHandle?: string;
  } | null> {
    const response = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 1,
      })
    );
    return response.Messages?.[0] ?? null;
  }

  async getUnreadMessageCount(queueUrl: string): Promise<number> {
    const response = await this.sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages'],
      })
    );
    return Number.parseInt(
      response.Attributes?.ApproximateNumberOfMessages || '0',
      10
    );
  }
}
